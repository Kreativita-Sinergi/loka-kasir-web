import { useState, useRef, useCallback } from 'react'
import { X, Upload, FileText, CheckCircle, XCircle, AlertCircle, Download, RotateCcw } from 'lucide-react'
import { IconProduct } from '@/components/icons/LokaIcons'
import { importProductsCSV, downloadProductTemplate, type ImportResult } from '@/api/products'
import { getErrorMessage } from '@/lib/utils'

interface Props {
  onClose: () => void
  onSuccess: () => void
  outletId?: string
}

type Stage = 'idle' | 'ready' | 'loading' | 'done'

const TEMPLATE_COLUMNS = [
  { key: 'product_name',  required: true,  desc: 'Nama produk' },
  { key: 'sku',           required: false, desc: 'Dikosongkan = auto-generate' },
  { key: 'category',      required: false, desc: 'Dibuat otomatis jika belum ada' },
  { key: 'base_price',    required: true,  desc: 'Harga modal' },
  { key: 'sell_price',    required: false, desc: 'Default = base_price' },
  { key: 'min_stock',     required: false, desc: 'Stok minimum alert' },
  { key: 'initial_stock', required: false, desc: 'Stok awal di outlet' },
  { key: 'track_stock',   required: false, desc: 'true/false, default true' },
  { key: 'is_taxable',    required: false, desc: 'true/false, default true' },
]

export default function BulkImportModal({ onClose, onSuccess, outletId }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [fileError, setFileError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState('')

  const acceptFile = useCallback((f: File) => {
    setFileError('')
    if (!f.name.toLowerCase().endsWith('.csv')) { setFileError('Hanya file .csv yang didukung.'); return }
    if (f.size > 5 * 1024 * 1024) { setFileError('Ukuran file maksimal 5 MB.'); return }
    setFile(f); setStage('ready'); setResult(null)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]; if (f) acceptFile(f)
  }, [acceptFile])

  const handleImport = async () => {
    if (!file) return
    setStage('loading'); setProgress('Mengunggah dan memproses file...')
    try {
      const res = await importProductsCSV(file, outletId)
      const data = res.data.data
      setResult(data); setStage('done')
      if (data.success > 0) onSuccess()
    } catch (err) {
      setFileError(getErrorMessage(err)); setStage('ready')
    } finally { setProgress('') }
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await downloadProductTemplate()
      const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'text/csv' }))
      const a = document.createElement('a'); a.href = url; a.download = 'template_produk.csv'; a.click()
      URL.revokeObjectURL(url)
    } catch {
      const fallback = ['product_name,sku,category,base_price,sell_price,min_stock,initial_stock,track_stock,is_taxable','Nasi Goreng,SKU-001,Makanan,20000,25000,10,100,true,true','Es Teh,SKU-002,Minuman,3000,5000,5,200,true,false'].join('\n')
      const blob = new Blob([fallback], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'template_produk.csv'; a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleReset = () => {
    setFile(null); setResult(null); setFileError(''); setStage('idle')
    if (fileRef.current) fileRef.current.value = ''
  }

  const isLoading = stage === 'loading'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <IconProduct size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Import Produk via CSV</p>
              <p className="text-xs text-gray-400">Migrasi ribuan produk dari sistem POS lain</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isLoading} className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-blue-500 shrink-0" />
              <span className="text-sm text-blue-700 font-medium">Download template CSV terlebih dahulu</span>
            </div>
            <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:text-blue-800 transition-colors whitespace-nowrap">
              <Download size={13} /> Download
            </button>
          </div>

          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kolom CSV</p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_COLUMNS.map((col) => (
                <span key={col.key} title={col.desc} className={`rounded-lg px-2.5 py-1 text-xs font-mono border cursor-default ${col.required ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                  {col.key}{col.required && <span className="text-red-400 ml-0.5">*</span>}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Kolom bertanda <span className="text-red-400 font-semibold">*</span> wajib diisi. Hover nama kolom untuk keterangan.</p>
          </div>

          {stage !== 'done' && (
            <div
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => !isLoading && fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isLoading ? 'cursor-not-allowed opacity-60 border-gray-200 bg-gray-50' : isDragging ? 'border-blue-400 bg-blue-50/40 cursor-copy' : file ? 'border-green-300 bg-green-50/30 cursor-pointer' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/20 cursor-pointer'}`}
            >
              {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-gray-500">{progress || 'Memproses...'}</p>
                  <p className="text-xs text-gray-400">Mohon tunggu, jangan tutup halaman ini</p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center gap-1">
                  <CheckCircle size={26} className="text-green-500 mx-auto" />
                  <p className="text-sm font-medium text-gray-800 mt-1">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB · Klik untuk ganti file</p>
                </div>
              ) : (
                <>
                  <Upload size={28} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">Drag & drop file CSV atau klik untuk pilih</p>
                  <p className="text-xs text-gray-400 mt-1">Maks. 5 MB · Format .csv</p>
                </>
              )}
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f) }} />
            </div>
          )}

          {fileError && (
            <div className="flex items-start gap-2 bg-red-50 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{fileError}</p>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
                  <p className="text-xl font-bold text-gray-800">{result.total}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Total Baris</p>
                </div>
                <div className="bg-green-50 rounded-xl px-4 py-3 text-center">
                  <p className="text-xl font-bold text-green-700">{result.success}</p>
                  <p className="text-xs text-green-600 mt-0.5">Berhasil</p>
                </div>
                <div className={`rounded-xl px-4 py-3 text-center ${result.failed > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <p className={`text-xl font-bold ${result.failed > 0 ? 'text-red-700' : 'text-gray-400'}`}>{result.failed}</p>
                  <p className={`text-xs mt-0.5 ${result.failed > 0 ? 'text-red-500' : 'text-gray-400'}`}>Gagal</p>
                </div>
              </div>
              {result.failed === 0 && (
                <div className="flex items-center gap-2 bg-green-50 rounded-xl px-4 py-3">
                  <CheckCircle size={16} className="text-green-500 shrink-0" />
                  <p className="text-sm text-green-700 font-medium">Semua {result.total} produk berhasil diimport!</p>
                </div>
              )}
              {result.errors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Detail Error ({result.errors.length} baris gagal)</p>
                  <div className="border border-red-100 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-red-50/30 transition-colors">
                        <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Baris {err.row}</span>
                            {err.product && <span className="text-xs font-medium text-gray-700 truncate max-w-[200px]">{err.product}</span>}
                          </div>
                          <p className="text-xs text-red-500 mt-0.5 leading-relaxed">{err.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          <div>
            {stage === 'done' && (
              <button onClick={handleReset} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                <RotateCcw size={13} /> Import lagi
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} disabled={isLoading} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-40">
              {stage === 'done' ? 'Tutup' : 'Batal'}
            </button>
            {stage !== 'done' && (
              <button onClick={handleImport} disabled={stage !== 'ready' || isLoading} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                {isLoading ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Mengimpor...</>
                ) : (
                  <><Upload size={14} />{file ? 'Import Sekarang' : 'Pilih File Dulu'}</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
