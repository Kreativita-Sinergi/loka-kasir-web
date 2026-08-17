import { useState, useRef, useCallback } from 'react'
import { X, Upload, FileText, CheckCircle, XCircle, AlertCircle, Download, RotateCcw } from 'lucide-react'
import { IconProduct } from '@/components/icons/LokaIcons'
import { importProductsCSV, downloadProductTemplate, type ImportResult } from '@/api/products'
import { getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface Props {
  onClose: () => void
  onSuccess: () => void
  outletId?: string
}

type Stage = 'idle' | 'ready' | 'loading' | 'done'

// Keterangan kolom disimpan sebagai KUNCI, bukan teks: daftar ini dievaluasi
// sekali saat modul dimuat, jadi teks jadi akan terkunci pada bahasa yang
// kebetulan aktif saat itu. Kuncinya baru diterjemahkan saat dirender.
const TEMPLATE_COLUMNS = [
  { key: 'product_name',  required: true,  descKey: 'csvColProductName' },
  { key: 'sku',           required: false, descKey: 'csvColSku' },
  { key: 'category',      required: false, descKey: 'csvColCategory' },
  { key: 'base_price',    required: true,  descKey: 'csvColBasePrice' },
  { key: 'sell_price',    required: false, descKey: 'csvColSellPrice' },
  { key: 'initial_stock', required: false, descKey: 'csvColInitialStock' },
  { key: 'min_stock',     required: false, descKey: 'csvColMinStock' },
  { key: 'track_stock',   required: false, descKey: 'csvColTrackStock' },
  { key: 'is_taxable',    required: false, descKey: 'csvColTaxable' },
] as const

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
    if (!f.name.toLowerCase().endsWith('.csv')) { setFileError(t('csvOnlyCsv')); return }
    if (f.size > 5 * 1024 * 1024) { setFileError(t('csvMaxSize')); return }
    setFile(f); setStage('ready'); setResult(null)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]; if (f) acceptFile(f)
  }, [acceptFile])

  const handleImport = async () => {
    if (!file) return
    setStage('loading'); setProgress(t('csvUploading'))
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
      // Contoh netral: template sungguhan datang dari server dan sudah mengikuti
      // jenis usaha. Cadangan ini hanya dipakai saat server tidak terjangkau,
      // jadi ia tidak boleh menebak dagangan siapa pun.
      const fallback = ['product_name,sku,category,base_price,sell_price,initial_stock,min_stock,track_stock,is_taxable','Produk Contoh A,SKU-001,Kategori Contoh,10000,15000,100,10,true,true','Produk Contoh B,SKU-002,Kategori Contoh,5000,8000,50,5,true,false','Produk Contoh C,,Kategori Contoh,20000,30000,25,,true,true'].join('\n')
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
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
              <IconProduct size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{t('csvImportTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('csvImportSubtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isLoading} className="text-muted-foreground hover:text-muted-foreground transition-colors disabled:opacity-40">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-500/10 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-blue-500 dark:text-blue-400 shrink-0" />
              <span className="text-sm text-blue-700 dark:text-blue-400 font-medium">{t('csvDownloadFirst')}</span>
            </div>
            <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-800 dark:text-blue-300 transition-colors whitespace-nowrap">
              <Download size={13} /> {t('csvDownload')}
            </button>
          </div>

          <div className="bg-muted rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t('csvColumns')}</p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_COLUMNS.map((col) => (
                <span key={col.key} title={t(col.descKey)} className={`rounded-lg px-2.5 py-1 text-xs font-mono border cursor-default ${col.required ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400' : 'bg-card border-border text-muted-foreground'}`}>
                  {col.key}{col.required && <span className="text-red-400 ml-0.5">*</span>}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t('csvRequiredHintPrefix')} <span className="text-red-400 font-semibold">*</span> {t('csvRequiredHintSuffix')}</p>
          </div>

          {stage !== 'done' && (
            <div
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => !isLoading && fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isLoading ? 'cursor-not-allowed opacity-60 border-border bg-muted' : isDragging ? 'border-blue-400 bg-blue-50/40 cursor-copy' : file ? 'border-green-300 dark:border-green-500/20 bg-green-50/30 cursor-pointer' : 'border-border hover:border-blue-400 hover:bg-blue-50/20 cursor-pointer'}`}
            >
              {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="w-7 h-7 border-2 border-blue-200 dark:border-blue-500/20 border-t-blue-600 rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">{progress || t('csvProcessing')}</p>
                  <p className="text-xs text-muted-foreground">{t('csvDoNotClose')}</p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center gap-1">
                  <CheckCircle size={26} className="text-green-500 dark:text-green-400 mx-auto" />
                  <p className="text-sm font-medium text-foreground mt-1">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB · {t('csvClickToReplace')}</p>
                </div>
              ) : (
                <>
                  <Upload size={28} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">{t('csvDropHere')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('csvMaxHint')}</p>
                </>
              )}
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f) }} />
            </div>
          )}

          {fileError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{fileError}</p>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted rounded-xl px-4 py-3 text-center">
                  <p className="text-xl font-bold text-foreground">{result.total}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('csvTotalRows')}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-500/10 rounded-xl px-4 py-3 text-center">
                  <p className="text-xl font-bold text-green-700 dark:text-green-400">{result.success}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">{t('statSucceeded')}</p>
                </div>
                <div className={`rounded-xl px-4 py-3 text-center ${result.failed > 0 ? 'bg-red-50 dark:bg-red-500/10' : 'bg-muted'}`}>
                  <p className={`text-xl font-bold ${result.failed > 0 ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'}`}>{result.failed}</p>
                  <p className={`text-xs mt-0.5 ${result.failed > 0 ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground'}`}>{t('statFailedShort')}</p>
                </div>
              </div>
              {result.failed === 0 && (
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-500/10 rounded-xl px-4 py-3">
                  <CheckCircle size={16} className="text-green-500 dark:text-green-400 shrink-0" />
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium">Semua {result.total} produk berhasil diimport!</p>
                </div>
              )}
              {result.errors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Detail Error ({result.errors.length} baris gagal)</p>
                  <div className="border border-red-100 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-2.5 border-b border-border last:border-0 hover:bg-red-50/30 transition-colors">
                        <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{t('importRowNo', { row: err.row })}</span>
                            {err.product && <span className="text-xs font-medium text-foreground truncate max-w-[200px]">{err.product}</span>}
                          </div>
                          <p className="text-xs text-red-500 dark:text-red-400 mt-0.5 leading-relaxed">{err.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
          <div>
            {stage === 'done' && (
              <button onClick={handleReset} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <RotateCcw size={13} /> {t('csvImportAnother')}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} disabled={isLoading} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors disabled:opacity-40">
              {stage === 'done' ? t('actionClose') : t('actionCancel')}
            </button>
            {stage !== 'done' && (
              <button onClick={handleImport} disabled={stage !== 'ready' || isLoading} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                {isLoading ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('csvImporting')}</>
                ) : (
                  <><Upload size={14} />{file ? t('csvImportNow') : t('csvPickFileFirst')}</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
