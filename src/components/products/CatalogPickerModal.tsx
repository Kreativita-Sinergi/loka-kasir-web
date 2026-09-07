import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X, Search, Plus, CheckCircle, XCircle, RotateCcw, Info } from 'lucide-react'
import { IconProduct } from '@/components/icons/LokaIcons'
import {
  adoptFromCatalog,
  searchCatalog,
  type AdoptCatalogItem,
  type CatalogProduct,
  type ImportResult,
} from '@/api/products'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface Props {
  onClose: () => void
  onSuccess: (added: number) => void
}

/** Isian per barang yang dipilih. Disimpan sebagai TEKS, bukan angka: kolom
 *  harga yang dikosongkan pengguna harus bisa dibedakan dari harga nol, dan
 *  `Number('')` adalah 0 — bukan "belum diisi". */
interface Draft {
  sellPrice: string
  basePrice: string
  stock: string
}

const emptyDraft = (item: CatalogProduct): Draft => ({
  sellPrice: item.suggested_sell_price !== null ? String(item.suggested_sell_price) : '',
  basePrice: '',
  stock: '',
})

const numberOrNull = (value: string): number | null => {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export default function CatalogPickerModal({ onClose, onSuccess }: Props) {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  // Barang yang sudah dipilih disimpan TERPISAH dari hasil pencarian: pemilik
  // toko mengetik "indomie", memilih tiga, lalu mengetik "sabun" — dan tiga
  // yang pertama harus tetap terpilih. Kalau pilihan hanya hidup di dalam
  // daftar hasil, mengganti kata kunci akan membuangnya tanpa peringatan.
  const [picked, setPicked] = useState<CatalogProduct[]>([])
  const pickedIds = useMemo(() => new Set(picked.map((p) => p.id)), [picked])

  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  // Pencarian ditunda 300 ms. Tanpa jeda, memindai barcode dengan pemindai
  // laser — yang mengetik 13 angka dalam sekejap — mengirim 13 permintaan yang
  // 12 di antaranya sudah tidak relevan sebelum jawabannya tiba.
  useEffect(() => {
    const keyword = query.trim()
    // Kotak yang dikosongkan sudah dibereskan onQueryChange; effect ini hanya
    // menjalankan pencarian. Membersihkan state dari badan effect memicu render
    // bertingkat dan ditolak aturan lint react-hooks.
    if (keyword === '') return
    let active = true
    const timer = window.setTimeout(() => {
      searchCatalog(keyword)
        .then((res) => {
          if (active) setItems(res.data.data ?? [])
        })
        .catch((err) => {
          if (active) setError(getErrorMessage(err) || t('catalogLoadFailed'))
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 300)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query])

  const onQueryChange = (value: string) => {
    setError('')
    const searching = value.trim() !== ''
    setLoading(searching)
    if (!searching) setItems([])
    setQuery(value)
  }

  const toggle = useCallback((item: CatalogProduct) => {
    setPicked((current) => {
      if (current.some((p) => p.id === item.id)) {
        return current.filter((p) => p.id !== item.id)
      }
      return [...current, item]
    })
    setDrafts((current) =>
      current[item.id] ? current : { ...current, [item.id]: emptyDraft(item) }
    )
  }, [])

  const patchDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }))

  const submit = async () => {
    if (picked.length === 0) return
    setSubmitting(true)
    setError('')
    try {
      const payload: AdoptCatalogItem[] = picked.map((item) => {
        const draft = drafts[item.id] ?? emptyDraft(item)
        return {
          master_product_id: item.id,
          sell_price: numberOrNull(draft.sellPrice),
          base_price: numberOrNull(draft.basePrice),
          initial_stock: numberOrNull(draft.stock) ?? 0,
        }
      })
      const res = await adoptFromCatalog(payload)
      const data = res.data.data
      setResult(data)
      if (data.success > 0) onSuccess(data.success)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setResult(null)
    setPicked([])
    setDrafts({})
    setQuery('')
    setItems([])
    searchRef.current?.focus()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
              <IconProduct size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{t('catalogTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('catalogSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        {result ? (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted rounded-xl px-4 py-3 text-center">
                <p className="text-xl font-bold text-foreground">{result.total}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('csvTotalRows')}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-500/10 rounded-xl px-4 py-3 text-center">
                <p className="text-xl font-bold text-green-700 dark:text-green-400">{result.success}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">{t('statSucceeded')}</p>
              </div>
              <div
                className={`rounded-xl px-4 py-3 text-center ${result.failed > 0 ? 'bg-red-50 dark:bg-red-500/10' : 'bg-muted'}`}
              >
                <p
                  className={`text-xl font-bold ${result.failed > 0 ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'}`}
                >
                  {result.failed}
                </p>
                <p
                  className={`text-xs mt-0.5 ${result.failed > 0 ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground'}`}
                >
                  {t('statFailedShort')}
                </p>
              </div>
            </div>

            {result.failed === 0 && (
              <div className="flex items-center gap-2 bg-green-50 dark:bg-green-500/10 rounded-xl px-4 py-3">
                <CheckCircle size={16} className="text-green-500 dark:text-green-400 shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                  {t('catalogAdded', { count: result.success })}
                </p>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="border border-red-100 dark:border-red-500/20 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-4 py-2.5 border-b border-border last:border-0"
                  >
                    <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      {err.product && (
                        <p className="text-xs font-medium text-foreground truncate">{err.product}</p>
                      )}
                      <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{err.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder={t('catalogSearchPlaceholder')}
                className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-3">
                <XCircle size={15} className="text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Hasil pencarian */}
            <div className="border border-border rounded-xl overflow-hidden">
              {loading ? (
                <div className="py-10 text-center">
                  <span className="w-6 h-6 border-2 border-blue-200 dark:border-blue-500/20 border-t-blue-600 rounded-full animate-spin inline-block" />
                </div>
              ) : query.trim() === '' ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {t('catalogSearchPrompt')}
                </p>
              ) : items.length === 0 ? (
                <div className="py-8 px-6 text-center">
                  <p className="text-sm text-muted-foreground">{t('catalogEmpty')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('catalogEmptyHint')}</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-border">
                  {items.map((item) => {
                    const isPicked = pickedIds.has(item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggle(item)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isPicked ? 'bg-blue-50/60 dark:bg-blue-500/10' : 'hover:bg-muted'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isPicked}
                          readOnly
                          className="shrink-0 pointer-events-none"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground capitalize truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[
                              item.barcode ?? t('catalogNoBarcode'),
                              item.category_name,
                              item.is_weight_based ? t('catalogWeightBased') : null,
                              t('catalogSourceCount', { count: item.source_business_count }),
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                          {item.suggested_sell_price !== null
                            ? formatCurrency(item.suggested_sell_price)
                            : '—'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Yang sudah dipilih — bertahan meski kata kuncinya berganti */}
            {picked.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t('catalogSelectedCount', { count: picked.length })}
                  </p>
                </div>

                <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl px-4 py-2.5">
                  <Info size={14} className="text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-400">{t('catalogPriceNote')}</p>
                </div>

                <div className="border border-border rounded-xl overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">
                          {t('productName')}
                        </th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs w-32">
                          {t('catalogColSellPrice')}
                        </th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs w-28">
                          {t('catalogColBasePrice')}
                        </th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs w-24">
                          {t('catalogColStock')}
                        </th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {picked.map((item) => {
                        const draft = drafts[item.id] ?? emptyDraft(item)
                        return (
                          <tr key={item.id}>
                            <td className="px-3 py-2">
                              <p className="text-sm text-foreground capitalize truncate max-w-[220px]">
                                {item.name}
                              </p>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={draft.sellPrice}
                                onChange={(e) => patchDraft(item.id, { sellPrice: e.target.value })}
                                className={cellInput}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={draft.basePrice}
                                onChange={(e) => patchDraft(item.id, { basePrice: e.target.value })}
                                className={cellInput}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={draft.stock}
                                onChange={(e) => patchDraft(item.id, { stock: e.target.value })}
                                className={cellInput}
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => toggle(item)}
                                className="text-muted-foreground hover:text-red-500 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
          <div>
            {result && (
              <button
                onClick={reset}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw size={13} /> {t('catalogSearchAgain')}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors disabled:opacity-40"
            >
              {result ? t('actionClose') : t('actionCancel')}
            </button>
            {!result && (
              <button
                onClick={submit}
                disabled={picked.length === 0 || submitting}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('catalogAdding')}
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    {picked.length === 0
                      ? t('catalogPickFirst')
                      : t('catalogAddAction', { count: picked.length })}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const cellInput =
  'w-full text-right border border-border rounded-lg px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500'
