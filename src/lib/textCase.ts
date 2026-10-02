/**
 * Names only: product, outlet, customer, supplier and the like are stored in
 * lowercase and shown with each word capitalised, so "BERAS MERAH" and
 * "beras merah" do not become two different products.
 *
 * Free text is deliberately NOT in this list and keeps the casing exactly as
 * typed: notes, receipt header/footer, descriptions, addresses, reasons,
 * service-fee labels and active ingredients. Title-casing prose turns
 * "Terima kasih atas kunjungan anda" into "Terima Kasih Atas Kunjungan Anda",
 * and lowercasing it on save breaks acronyms ("PPN" → "Ppn", "PB1" → "pb1",
 * "RT/RW" → "Rt/Rw", "BPOM" → "bpom").
 */
const textFields = new Set([
  'name', 'location',
  'businessName', 'outletName',
])
const lowerOnlyFields = new Set(['email', 'username', 'instagram_handle'])
const protectedText = /(https?:\/\/[^\s]+|\b[^\s@]+@[^\s@]+\.[^\s@]+)/giu

function humanTextField(key: string) {
  return textFields.has(key) || key.endsWith('_name')
}

function mapText(value: string, convert: (text: string) => string) {
  return value.split(protectedText).map((part, index) => index % 2 ? part : convert(part)).join('')
}

export function storedText(value: string) {
  return mapText(value, text => text.toLowerCase())
}

export function displayedText(value: string) {
  return mapText(value, text => text.toLowerCase().replace(/(^|[\s\p{P}])\p{L}/gu, word => word.toUpperCase()))
}

/** Return a new object, preserving non-JSON payloads and technical fields. */
export function normalizeTextData<T>(data: T, mode: 'storage' | 'display'): T {
  const visit = (value: unknown, key = ''): unknown => {
    if (typeof value === 'string') {
      if (mode === 'storage' && lowerOnlyFields.has(key)) return value.toLowerCase()
      return humanTextField(key) ? (mode === 'storage' ? storedText(value) : displayedText(value)) : value
    }
    if (Array.isArray(value)) return value.map(item => visit(item, key))
    if (value && Object.getPrototypeOf(value) === Object.prototype) {
      return Object.fromEntries(Object.entries(value).map(([field, item]) => [field, visit(item, field)]))
    }
    return value
  }
  return visit(data) as T
}

/** Normalize only text columns; CSV quotes, identifiers and amounts stay valid. */
export function normalizeCsvText(source: string): string {
  const bom = source.startsWith('\uFEFF') ? '\uFEFF' : ''
  const text = source.slice(bom.length)
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted
    } else if (!quoted && char === ',') { row.push(cell); cell = '' }
    else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += char
  }
  if (quoted) return source // Let the importer report malformed CSV.
  if (cell || row.length) { row.push(cell); rows.push(row) }
  if (!rows.length) return source
  const headers = rows[0].map(header => header.trim().toLowerCase())
  const escape = (value: string) => /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
  const newline = text.includes('\r\n') ? '\r\n' : '\n'
  const result = rows.map((cells, index) => cells.map((value, column) => {
    const key = headers[column] ?? ''
    return escape(index && humanTextField(key) ? storedText(value)
      : index && lowerOnlyFields.has(key) ? value.toLowerCase() : value)
  }).join(',')).join(newline)
  return bom + result + (/[\r\n]$/.test(text) ? newline : '')
}

export async function normalizeImportFile(file: File) {
  return new File([normalizeCsvText(await file.text())], file.name, { type: file.type, lastModified: file.lastModified })
}
