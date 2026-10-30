import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownLeft, ArrowUpRight, Boxes, Download, Flag, Info, Package, Search, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import Pagination from '@/components/ui/Pagination'
import { DataTable } from '@/components/ui/Table'
import ReportDateRange from '@/components/reports/ReportDateRange'
import { getStockCard, STOCK_CARD_EXPORT_LIMIT, type StockCardEntry, type StockCardReport } from '@/api/inventoryReports'
import { getProducts } from '@/api/products'
import { getRawMaterials } from '@/api/rawMaterials'
import { useOutletStore } from '@/store/outletStore'
import { formatDateTime, todayISODate } from '@/lib/utils'
import { formatQuantity, formatStockQuantity, weightUnitScale } from '@/lib/money'
import { exportToCSV, csvFilename } from '@/lib/exportUtils'
import { monthStartISO } from '@/lib/reportRange'
import { t } from '@/lib/i18n'
import type { MessageKey } from '@/lib/messages'

const LIMIT = 100

const exportButtonClass =
  'flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted disabled:opacity-40 transition shrink-0'

/** Barang yang kartunya dibuka. */
interface Target {
  productId?: string
  variantId?: string
  rawMaterialId?: string
  name: string
  variantName?: string
}

const targetLabel = (tg: Target) => (tg.variantName ? `${tg.name} — ${tg.variantName}` : tg.name)

const TYPE_LABELS: Record<string, MessageKey> = {
  PURCHASE: 'ivrTypePurchase',
  IN: 'ivrTypeIn',
  OUT: 'ivrTypeOut',
  USE: 'ivrTypeOut',
  SALE: 'ivrTypeSale',
  REFUND: 'ivrTypeRefund',
  RETURN: 'ivrTypeRefund',
  ADJUSTMENT: 'ivrTypeAdjustment',
  ADJUST: 'ivrTypeAdjustment',
  OPNAME: 'ivrTypeOpname',
  TRANSFER_IN: 'ivrTypeTransferIn',
  TRANSFER_OUT: 'ivrTypeTransferOut',
  TRANSFER: 'ivrTypeTransferOut',
  WASTE: 'ivrTypeWaste',
  PRODUCTION: 'ivrTypeProduction',
  PRODUCTION_IN: 'ivrTypeProduction',
  PRODUCTION_OUT: 'ivrTypeProduction',
  PRODUCTION_VOID: 'ivrTypeProductionVoid',
  RETURN_TO_CONSIGNOR: 'ivrTypeConsignmentReturn',
}

/** Jenis yang belum dikenal (mis. jenis baru dari server) tampil dengan kodenya. */
function stockCardTypeLabel(type: string): string {
  const key = TYPE_LABELS[type]
  return key ? t(key) : type
}

function qtyText(card: StockCardReport, value: number): string {
  if (card.kind === 'raw_material') return `${formatQuantity(value)} ${card.unit}`.trim()
  return formatStockQuantity(value, card.is_weight_based, card.unit || null, card.weight_unit)
}

/** Angka CSV dalam satuan jual (gram → kg/ons), bukan gram mentah. */
function qtyNumber(card: StockCardReport, value: number): number {
  return card.kind !== 'raw_material' && card.is_weight_based ? value / weightUnitScale(card.weight_unit) : value
}

function ItemPicker({ onPick }: { onPick: (target: Target) => void }) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(id)
  }, [query])

  const { data: products = [], isFetching: loadingProducts } = useQuery({
    queryKey: ['stock-card-products', debounced],
    queryFn: () => getProducts({ page: 1, limit: 20, search: debounced }),
    select: (res) => (res.data.data ?? []).filter((p) => p.track_stock || (p.variants ?? []).some((v) => v.track_stock)),
    enabled: debounced.length > 0,
  })
  const { data: materials = [], isFetching: loadingMaterials } = useQuery({
    queryKey: ['stock-card-materials', debounced],
    queryFn: () => getRawMaterials({ page: 1, limit: 10, search: debounced }),
    select: (res) => res.data.data ?? [],
    enabled: debounced.length > 0,
    // Bahan baku hanya untuk paket Pro; galatnya cukup membuat daftar kosong.
    retry: false,
  })

  const pick = (target: Target) => { setQuery(''); setDebounced(''); onPick(target) }
  const loading = loadingProducts || loadingMaterials
  const nothing = debounced.length > 0 && !loading && products.length === 0 && materials.length === 0

  return (
    <div className="relative w-full sm:w-96">
      <Search size={14} className="absolute left-3 top-3 text-muted-foreground" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('ivrCardSearch')}
        aria-label={t('ivrCardSearch')}
        className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-card text-foreground"
      />
      {debounced.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-80 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
          {loading && <p className="px-3 py-2 text-xs text-muted-foreground">{t('loading')}</p>}
          {nothing && <p className="px-3 py-2 text-xs text-muted-foreground">{t('ivrNoMatch')}</p>}
          {products.map((p) => {
            const variants = (p.variants ?? []).filter((v) => v.track_stock)
            return (
              <div key={p.id} className="border-b border-border last:border-0">
                {(p.track_stock || variants.length === 0) && (
                  <button type="button" onClick={() => pick({ productId: p.id, name: p.name })} className="w-full text-left px-3 py-2 hover:bg-muted">
                    <span className="flex items-center gap-2 text-sm text-foreground"><Package size={13} className="text-muted-foreground" />{p.name}</span>
                    {variants.length > 0 && <span className="block pl-5 text-xs text-muted-foreground">{t('ivrCardParentStock')}</span>}
                  </button>
                )}
                {variants.map((v) => (
                  <button key={v.id} type="button" onClick={() => pick({ productId: p.id, variantId: v.id, name: p.name, variantName: v.name })} className="w-full text-left px-3 py-2 pl-8 hover:bg-muted text-sm text-foreground">
                    {p.name} — {v.name}
                  </button>
                ))}
              </div>
            )
          })}
          {materials.map((m) => (
            <button key={m.id} type="button" onClick={() => pick({ rawMaterialId: m.id, name: m.name })} className="w-full text-left px-3 py-2 hover:bg-muted border-b border-border last:border-0">
              <span className="flex items-center gap-2 text-sm text-foreground"><Boxes size={13} className="text-muted-foreground" />{m.name}</span>
              <span className="block pl-5 text-xs text-muted-foreground">{t('ivrRawMaterials')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function StockCardPage() {
  const [searchParams] = useSearchParams()
  const { selected: selectedOutlet } = useOutletStore()
  // Tautan dari halaman lain boleh membawa barangnya: ?product_id=&variant_id=&raw_material_id=&name=
  const [target, setTarget] = useState<Target | null>(() => {
    const name = searchParams.get('name') ?? ''
    const raw = searchParams.get('raw_material_id')
    if (raw) return { rawMaterialId: raw, name }
    const product = searchParams.get('product_id')
    if (!product) return null
    return { productId: product, variantId: searchParams.get('variant_id') ?? undefined, name, variantName: searchParams.get('variant_name') ?? undefined }
  })
  const [range, setRange] = useState(() => ({ from: monthStartISO(), to: todayISODate() }))
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const params = target
    ? {
        product_id: target.productId,
        variant_id: target.variantId,
        raw_material_id: target.rawMaterialId,
        // Bahan baku dicatat per usaha; outlet tidak berlaku.
        outlet_id: target.rawMaterialId ? undefined : selectedOutlet?.id,
        start_date: range.from,
        end_date: range.to,
      }
    : null

  const { data: card, isLoading, error, refetch } = useQuery({
    queryKey: ['stock-card', params, page],
    queryFn: () => getStockCard({ ...params!, page, limit: LIMIT }),
    select: (res) => res.data.data,
    enabled: !!params && !!range.from && !!range.to,
  })

  const changeRange = (next: { from: string; to: string }) => { setRange(next); setPage(1) }
  const changeTarget = (next: Target | null) => { setTarget(next); setPage(1) }

  // Ekspor meminta SEMUA baris rentang ini, bukan hanya halaman yang tampil.
  const handleExport = async () => {
    if (!params || !card) return
    setExporting(true)
    try {
      let res = (await getStockCard({ ...params, page: 1, limit: STOCK_CARD_EXPORT_LIMIT })).data.data
      const entries = [...res.entries]
      while (entries.length < res.total && res.entries.length > 0) {
        res = (await getStockCard({ ...params, page: res.page + 1, limit: STOCK_CARD_EXPORT_LIMIT })).data.data
        entries.push(...res.entries)
      }
      const blank = { [t('ivrColDate')]: '', [t('ivrColType')]: '', [t('ivrColReference')]: '', [t('labelOutlet')]: '', [t('ivrColActor')]: '', [t('ivrColIn')]: '', [t('ivrColOut')]: '', [t('ivrColBalance')]: '' } as Record<string, string | number>
      exportToCSV([
        { ...blank, [t('ivrColType')]: t('ivrCardOpening'), [t('ivrColBalance')]: qtyNumber(res, res.opening_qty) },
        ...entries.map((e) => ({
          [t('ivrColDate')]: formatDateTime(e.occurred_at),
          [t('ivrColType')]: stockCardTypeLabel(e.type),
          [t('ivrColReference')]: [e.reference, e.notes].filter(Boolean).join(' · '),
          [t('labelOutlet')]: e.outlet_name,
          [t('ivrColActor')]: e.actor_name,
          [t('ivrColIn')]: e.in > 0 ? qtyNumber(res, e.in) : '',
          [t('ivrColOut')]: e.out > 0 ? qtyNumber(res, e.out) : '',
          [t('ivrColBalance')]: qtyNumber(res, e.balance),
        })),
        { ...blank, [t('ivrColType')]: t('ivrCardClosing'), [t('ivrColIn')]: qtyNumber(res, res.total_in), [t('ivrColOut')]: qtyNumber(res, res.total_out), [t('ivrColBalance')]: qtyNumber(res, res.closing_qty) },
      ], csvFilename('kartu-stok'), { withTotal: false })
    } finally {
      setExporting(false)
    }
  }

  const columns = card ? [
    { key: 'occurred_at', label: t('ivrColDate'), render: (e: StockCardEntry) => <span className="text-xs text-foreground">{formatDateTime(e.occurred_at)}</span> },
    {
      key: 'type',
      label: t('ivrColType'),
      render: (e: StockCardEntry) => (
        <div>
          <p className="text-sm font-medium text-foreground">{stockCardTypeLabel(e.type)}</p>
          {e.actor_name && <p className="text-xs text-muted-foreground">{e.actor_name}</p>}
        </div>
      ),
    },
    {
      key: 'reference',
      label: t('ivrColReference'),
      render: (e: StockCardEntry) => (
        <div>
          <p className="text-sm text-foreground">{e.reference || '—'}</p>
          {(e.notes || (!selectedOutlet && e.outlet_name)) && (
            <p className="text-xs text-muted-foreground">{[e.notes, !selectedOutlet ? e.outlet_name : ''].filter(Boolean).join(' · ')}</p>
          )}
        </div>
      ),
    },
    { key: 'in', label: t('ivrColIn'), className: 'text-right', render: (e: StockCardEntry) => <span className="text-sm text-green-700 dark:text-green-400">{e.in > 0 ? `+${qtyText(card, e.in)}` : ''}</span> },
    { key: 'out', label: t('ivrColOut'), className: 'text-right', render: (e: StockCardEntry) => <span className="text-sm text-red-600 dark:text-red-400">{e.out > 0 ? `-${qtyText(card, e.out)}` : ''}</span> },
    { key: 'balance', label: t('ivrColBalance'), className: 'text-right', render: (e: StockCardEntry) => <span className={`text-sm font-semibold ${e.balance < 0 ? 'text-destructive' : 'text-foreground'}`}>{qtyText(card, e.balance)}</span> },
  ] : []

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header
        title={t('navStockCard')}
        subtitle={target ? targetLabel(target) : t('ivrCardSubtitle')}
      />

      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <ItemPicker onPick={changeTarget} />
          {target && (
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm text-primary">
              {target.rawMaterialId ? <Boxes size={14} /> : <Package size={14} />}
              {targetLabel(target)}
              <button type="button" onClick={() => changeTarget(null)} aria-label={t('ivrCardClear')} className="hover:opacity-70"><X size={14} /></button>
            </span>
          )}
          <ReportDateRange from={range.from} to={range.to} onChange={changeRange} />
        </div>

        {!target ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <Package size={28} className="mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm font-semibold text-foreground">{t('ivrCardEmptyPickTitle')}</p>
            <p className="mt-1 text-xs text-muted-foreground text-balance">{t('ivrCardEmptyPickBody')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard title={t('ivrCardOpening')} value={card ? qtyText(card, card.opening_qty) : '—'} icon={<Flag size={18} />} color="blue" loading={isLoading} />
              <StatCard title={t('ivrColIn')} value={card ? qtyText(card, card.total_in) : '—'} icon={<ArrowDownLeft size={18} />} color="green" loading={isLoading} />
              <StatCard title={t('ivrColOut')} value={card ? qtyText(card, card.total_out) : '—'} icon={<ArrowUpRight size={18} />} color="red" loading={isLoading} />
              <StatCard title={t('ivrCardClosing')} value={card ? qtyText(card, card.closing_qty) : '—'} icon={<Package size={18} />} color="purple" loading={isLoading} />
            </div>

            {/* Stok tanpa riwayat (stok awal saat produk dibuat, data lama) —
                diberitahukan supaya saldo awal tidak tampak muncul begitu saja. */}
            {card && Math.abs(card.untracked_difference) > 0.0001 && (
              <div className="flex gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
                <Info size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
                <p className="text-xs leading-relaxed text-muted-foreground">{t('ivrCardUntracked', { qty: qtyText(card, card.untracked_difference) })}</p>
              </div>
            )}

            <div className="bg-card rounded-2xl border border-border">
              <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
                <div className="w-full min-w-0 sm:w-auto sm:flex-1">
                  <p className="text-sm font-semibold text-foreground">{t('ivrCardListTitle', { count: card?.total ?? 0 })}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {target.rawMaterialId ? t('ivrCardRawMaterialNote') : t('ivrCardListDesc')}
                  </p>
                </div>
                <button type="button" onClick={handleExport} disabled={!card || exporting} className={exportButtonClass}>
                  <Download size={14} />
                  {t('exportCsv')}
                </button>
              </div>
              <DataTable
                columns={columns as never[]}
                data={(card?.entries ?? []) as never[]}
                loading={isLoading} error={error} onRetry={refetch}
                emptyMessage={t('ivrCardEmpty')}
              />
              <Pagination page={page} total={card?.total ?? 0} limit={card?.limit || LIMIT} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
