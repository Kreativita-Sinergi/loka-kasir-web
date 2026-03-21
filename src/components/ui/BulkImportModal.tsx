import { useState, useRef } from 'react'
import { X, Upload, FileText, CheckCircle, XCircle, AlertCircle, Download } from 'lucide-react'
import { IconProduct } from '@/components/icons/LokaIcons'
import { bulkCreateProducts, type CreateProductPayload } from '@/api/products'
import { getErrorMessage } from '@/lib/utils'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

interface ParsedRow {
  name: string
  sku: string
  description: string
  sell_price: string
  base_price: string
  track_stock: string
  stock: string
}

interface ImportResult {
  name: string
  status: 'success' | 'error'
  message?: string
}

const CSV_HEADERS = ['name', 'sku', 'description', 'sell_price', 'base_price', 'track_stock', 'stock']
const CSV_TEMPLATE = `name,sku,description,sell_price,base_price,track_stock,stock
Nasi Goreng,SKU-001,Nasi goreng spesial,25000,20000,true,100
Mie Ayam,SKU-002,,18000,15000,false,
Es Teh,SKU-003,Es teh manis,5000,3000,true,200`

function parseCsv(text: string): ParsedRow[] {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    // Handle quoted values
    const values: string[] = []
    let current = ''
    let inQuote = false
    for (const ch of lines[i]) {
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { values.push(current.trim()); current = '' }
      else { current += ch }
    }
    values.push(current.trim())

    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] ?? '' })

    rows.push({
      name: row['name'] ?? '',
      sku: row['sku'] ?? '',
      description: row['description'] ?? '',
      sell_price: row['sell_price'] ?? '',
      base_price: row['base_price'] ?? '',
      track_stock: row['track_stock'] ?? '',
      stock: row['stock'] ?? '',
    })
  }

  return rows.filter((r) => r.name.trim() !== '')
}

function rowToPayload(row: ParsedRow): CreateProductPayload {
  return {
    name: row.name.trim(),
    sku: row.sku.trim() || undefined,
    description: row.description.trim() || undefined,
    sell_price: row.sell_price ? Number(row.sell_price) : undefined,
    base_price: row.base_price ? Number(row.base_price) : undefined,
    track_stock: row.track_stock.toLowerCase() === 'true',
    stock: row.stock ? Number(row.stock) : undefined,
  }
}

export default function BulkImportModal({ onClose, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<ImportResult[] | null>(null)
  const [error, setError] = useState('')

  const handleFile = (file: File) => {
    setError('')
    setResults(null)
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCsv(text)
      if (rows.length === 0) {
        setError('File tidak valid atau tidak ada data produk. Pastikan format CSV sesuai template.')
        setParsed([])
        return
      }
      setParsed(rows)
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) handleFile(file)
    else setError('Hanya file CSV yang didukung.')
  }

  const handleImport = async () => {
    if (parsed.length === 0) return
    setImporting(true)
    const payloads = parsed.map(rowToPayload)
    const settled = await bulkCreateProducts(payloads)
    const res: ImportResult[] = settled.map((r, i) => ({
      name: parsed[i].name,
      status: r.status === 'fulfilled' ? 'success' : 'error',
      message: r.status === 'rejected' ? getErrorMessage(r.reason) : undefined,
    }))
    setResults(res)
    setImporting(false)
    const anySuccess = res.some((r) => r.status === 'success')
    if (anySuccess) onSuccess()
  }

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_produk.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const successCount = results?.filter((r) => r.status === 'success').length ?? 0
  const failCount = results?.filter((r) => r.status === 'error').length ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <IconProduct size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Import Produk (CSV)</p>
              <p className="text-xs text-gray-400">Tambah banyak produk sekaligus dari file CSV</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Template download */}
          <div className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-blue-500" />
              <span className="text-sm text-blue-700 font-medium">Download template CSV terlebih dahulu</span>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:text-blue-800 transition-colors"
            >
              <Download size={13} />
              Template
            </button>
          </div>

          {/* Kolom CSV yang didukung */}
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Kolom CSV</p>
            <div className="flex flex-wrap gap-2">
              {CSV_HEADERS.map((h) => (
                <span key={h} className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-600 font-mono">
                  {h}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">* Hanya kolom <span className="font-semibold text-gray-600">name</span> yang wajib diisi.</p>
          </div>

          {/* Upload area */}
          {!results && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
            >
              <Upload size={28} className="mx-auto text-gray-300 mb-2" />
              {fileName ? (
                <p className="text-sm font-medium text-gray-700">{fileName}</p>
              ) : (
                <>
                  <p className="text-sm text-gray-500">Drag & drop file CSV atau klik untuk pilih</p>
                  <p className="text-xs text-gray-400 mt-1">Hanya format .csv yang didukung</p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Preview table */}
          {parsed.length > 0 && !results && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Preview — {parsed.length} produk ditemukan
              </p>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-52">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {['Nama', 'SKU', 'Harga Jual', 'Harga Dasar', 'Lacak Stok', 'Stok'].map((h) => (
                          <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.map((row, i) => (
                        <tr key={i} className="border-t border-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-800">{row.name}</td>
                          <td className="px-3 py-2 text-gray-500">{row.sku || '-'}</td>
                          <td className="px-3 py-2 text-gray-700">{row.sell_price || '-'}</td>
                          <td className="px-3 py-2 text-gray-700">{row.base_price || '-'}</td>
                          <td className="px-3 py-2 text-gray-500">{row.track_stock || '-'}</td>
                          <td className="px-3 py-2 text-gray-500">{row.stock || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {results && (
            <div>
              {/* Summary */}
              <div className="flex gap-3 mb-3">
                <div className="flex-1 bg-green-50 rounded-xl px-4 py-3 flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-sm font-semibold text-green-700">{successCount} berhasil</span>
                </div>
                {failCount > 0 && (
                  <div className="flex-1 bg-red-50 rounded-xl px-4 py-3 flex items-center gap-2">
                    <XCircle size={16} className="text-red-500" />
                    <span className="text-sm font-semibold text-red-700">{failCount} gagal</span>
                  </div>
                )}
              </div>
              {/* Detail list */}
              <div className="border border-gray-100 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0">
                    {r.status === 'success'
                      ? <CheckCircle size={14} className="text-green-500 shrink-0" />
                      : <XCircle size={14} className="text-red-500 shrink-0" />}
                    <span className="text-sm text-gray-800 flex-1 truncate">{r.name}</span>
                    {r.message && <span className="text-xs text-red-500 truncate max-w-[160px]">{r.message}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            {results ? 'Tutup' : 'Batal'}
          </button>
          {!results && (
            <button
              onClick={handleImport}
              disabled={parsed.length === 0 || importing}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {importing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mengimpor...
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Import {parsed.length > 0 ? `${parsed.length} Produk` : ''}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
