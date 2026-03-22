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

export function exportToCSV(data: CsvRow[], filename: string): void {
  if (!data.length) return

  const headers = Object.keys(data[0])
  const rows = [
    headers.join(','),
    ...data.map(row => headers.map(h => escapeCell(row[h])).join(',')),
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
