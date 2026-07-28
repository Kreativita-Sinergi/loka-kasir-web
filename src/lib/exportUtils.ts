type CsvRow = Record<string, string | number | boolean | null | undefined>

function escapeCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Wrap in quotes if contains comma, newline, or double-quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Baris TOTAL untuk setiap kolom angka.
 *
 * Kolom dianggap angka bila SELURUH nilainya bertipe number (kolom kosong/null
 * diabaikan) — jadi kolom teks seperti "Kasir" atau tanggal tidak ikut dijumlah,
 * dan kolom seperti "Kode_Akun" yang berisi string tidak salah dijumlahkan.
 * Kolom pertama diisi label "TOTAL" agar barisnya jelas saat dibuka di Excel.
 */
function buildTotalRow(data: CsvRow[], headers: string[]): CsvRow | null {
  const totals: CsvRow = {}
  let hasNumeric = false

  headers.forEach((h) => {
    const values = data.map((row) => row[h]).filter((v) => v !== null && v !== undefined && v !== '')
    if (values.length && values.every((v) => typeof v === 'number')) {
      totals[h] = (values as number[]).reduce((a, b) => a + b, 0)
      hasNumeric = true
    } else {
      totals[h] = ''
    }
  })

  if (!hasNumeric) return null
  // Pakai kolom non-angka pertama sebagai tempat label; jika semua kolom angka,
  // labelnya tetap ditaruh di kolom pertama (nilainya tertimpa, tapi jelas).
  const labelCol = headers.find((h) => totals[h] === '') ?? headers[0]
  totals[labelCol] = 'TOTAL'
  return totals
}

interface ExportOptions {
  /** Tambahkan baris TOTAL di akhir untuk semua kolom angka. Default: true. */
  withTotal?: boolean
}

export function exportToCSV(data: CsvRow[], filename: string, options: ExportOptions = {}): void {
  if (!data.length) return

  const { withTotal = true } = options
  const headers = Object.keys(data[0])
  const totalRow = withTotal ? buildTotalRow(data, headers) : null
  const body = totalRow ? [...data, totalRow] : data

  const rows = [
    headers.join(','),
    ...body.map(row => headers.map(h => escapeCell(row[h])).join(',')),
  ]

  const bom = '\uFEFF' // UTF-8 BOM — agar Excel bisa baca karakter Indonesia
  const blob = new Blob([bom + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()

  URL.revokeObjectURL(url)
}

export function csvFilename(prefix: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return `${prefix}-${date}.csv`
}
