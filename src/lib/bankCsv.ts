import type { BankImportRow } from '@/api/reconciliation'

export type NumberStyle = 'dot' | 'comma'
export type DateStyle = 'iso' | 'dmy'

// CSV with quoted fields, doubled quotes, BOM, CRLF, embedded newlines.
export function readBankCsv(text: string, separator: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let closed = false
  const endField = () => {
    row.push(field)
    field = ''
    closed = false
  }
  const endRow = () => {
    endField()
    if (row.some((value) => value.trim())) rows.push(row)
    row = []
    if (rows.length > 5001) throw new Error('CSV maksimal berisi 5.000 baris data.')
  }

  const input = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        quoted = false
        closed = true
      } else field += char
    } else if (char === separator) endField()
    else if (char === '\n' || char === '\r') {
      endRow()
      if (char === '\r' && input[i + 1] === '\n') i++
    } else if (char === '"' && !field && !closed) quoted = true
    else if (char === '"' || closed) throw new Error(`Kutipan CSV tidak valid di baris data ${rows.length + 1}.`)
    else field += char
  }
  if (quoted) throw new Error('Ada kutipan CSV yang belum ditutup.')
  if (field || row.length || closed) endRow()
  if (!rows.length || rows[0].length < 2) throw new Error('File memerlukan kepala kolom dan pemisah yang sesuai.')
  return rows
}

function canonicalDate(value: string, style: DateStyle): string | null {
  const trimmed = value.trim()
  const pieces = trimmed.match(
    style === 'iso' ? /^(\d{4})-(\d{2})-(\d{2})$/ : /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
  )
  if (!pieces) return null
  const y = style === 'iso' ? pieces[1] : pieces[3]
  const d = style === 'iso' ? pieces[3] : pieces[1].padStart(2, '0')
  const m = pieces[2].padStart(2, '0')
  const iso = `${y}-${m}-${d}`
  const date = new Date(`${iso}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(iso) ? iso : null
}

export function bankAmount(
  value: string,
  style: NumberStyle,
  digits: number,
): { major: string; minor: number } | null {
  const pattern =
    style === 'comma' ? /^(\d+|\d{1,3}(?:\.\d{3})+)(?:,(\d+))?$/ : /^(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d+))?$/
  const match = value.trim().match(pattern)
  if (!match) return null
  const whole = match[1].replace(/[.,]/g, '').replace(/^0+(?=\d)/, '')
  const fraction = (match[2] ?? '').replace(/0+$/, '')
  if (whole.length > 14 || fraction.length > digits) return null
  const minor = Number(whole + fraction.padEnd(digits, '0'))
  return Number.isSafeInteger(minor) && minor <= 9e15
    ? { major: fraction ? `${whole}.${fraction}` : whole, minor }
    : null
}

export interface BankColumnMap {
  date: number
  amount: number
  reference: number
  description: number
}
export function previewBankRows(
  rows: string[][],
  map: BankColumnMap,
  dateStyle: DateStyle,
  numberStyle: NumberStyle,
  digits: number,
) {
  const items: BankImportRow[] = []
  const errors: string[] = []
  const header = rows[0] ?? []
  if (map.date < 0 || map.amount < 0 || map.date === map.amount) {
    return { items, errors: ['Pilih kolom tanggal dan nominal dana masuk yang berbeda.'] }
  }
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const date = canonicalDate(row[map.date] ?? '', dateStyle)
    const amount = bankAmount(row[map.amount] ?? '', numberStyle, digits)
    const reference = (row[map.reference] ?? '').trim()
    const description = (row[map.description] ?? '').trim()
    if (
      row.length !== header.length ||
      !date ||
      !amount ||
      amount.minor <= 0 ||
      reference.length > 200 ||
      description.length > 500
    ) {
      errors.push(`Baris ${i + 1}: periksa kolom, tanggal, dan nominal dana masuk positif.`)
      continue
    }
    items.push({ date, amount: amount.major, reference, description })
  }
  if (!items.length && !errors.length) errors.push('CSV belum berisi dana masuk.')
  return { items, errors }
}
