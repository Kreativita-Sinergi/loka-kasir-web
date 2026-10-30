import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Boxes, Download, HandHeart, HelpCircle, Info, Package, Search, Warehouse } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import Badge from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/Table'
import {
  getInventoryValuation,
  type InventoryValuationItem,
  type InventoryValuationRawMaterial,
} from '@/api/inventoryReports'
import { useOutletStore } from '@/store/outletStore'
import { formatCurrency } from '@/lib/utils'
import { formatQuantity, formatStockQuantity, pricePerWeightUnit, weightUnitLabel, weightUnitScale } from '@/lib/money'
import { exportToCSV, csvFilename } from '@/lib/exportUtils'
import { t } from '@/lib/i18n'

const exportButtonClass =
  'flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted disabled:opacity-40 transition shrink-0'

/** Daftar bisa ribuan baris; digambar bertahap supaya halaman tetap ringan. */
const PAGE = 100

const itemName = (it: InventoryValuationItem) => (it.variant_name ? `${it.name} — ${it.variant_name}` : it.name)
const isMissingCost = (it: InventoryValuationItem) => it.cost_source === 'none' && !it.negative_stock

/** HPP per satuan jual: server menyimpan modal barang terukur per kilogram. */
const unitCostLabel = (it: InventoryValuationItem) =>
  it.is_weight_based
    ? `${formatCurrency(pricePerWeightUnit(it.unit_cost, it.weight_unit))}/${weightUnitLabel(it.weight_unit)}`
    : formatCurrency(it.unit_cost)

function Note({ tone, icon, children }: { tone: 'warning' | 'muted'; icon: React.ReactNode; children: React.ReactNode }) {
  const cls = tone === 'warning'
    ? 'border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300'
    : 'border-border bg-muted/40 text-muted-foreground'
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${cls}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p className="text-xs leading-relaxed">{children}</p>
    </div>
  )
}

export default function InventoryValuationPage() {
  const { selected: selectedOutlet } = useOutletStore()
  const [search, setSearch] = useState('')
  // '' = semua kategori; '__none__' = tanpa kategori.
  const [categoryId, setCategoryId] = useState('')
  const [shown, setShown] = useState(PAGE)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory-valuation', selectedOutlet?.id ?? null],
    queryFn: () => getInventoryValuation({ outlet_id: selectedOutlet?.id }),
    select: (res) => res.data.data,
  })

  const summary = data?.summary
  const q = search.trim().toLowerCase()
  // Penyaringan di peramban: server mengirim seluruh persediaan sekali, jadi
  // mengetik di kotak cari tidak memanggil ulang dan ringkasan tetap utuh.
  const items = useMemo(() => (data?.items ?? []).filter((it) =>
    (categoryId === '' || (categoryId === '__none__' ? it.category_id === null : it.category_id === categoryId)) &&
    (!q || `${it.name} ${it.variant_name} ${it.sku}`.toLowerCase().includes(q)),
  ), [data, categoryId, q])
  const materials = useMemo(() => categoryId
    ? []
    : (data?.raw_materials ?? []).filter((m) => !q || `${m.name} ${m.sku}`.toLowerCase().includes(q)), [data, categoryId, q])

  const handleExport = () => {
    if (!summary) return
    const rows = [
      ...items.map((it) => ({
        [t('ivrColCategory')]: it.category_name || t('ivrUncategorized'),
        [t('ivrColName')]: it.name,
        [t('ivrColVariant')]: it.variant_name,
        [t('ivrColSku')]: it.sku,
        // Satuan jual: gram ditulis sebagai kg/ons sesuai produknya.
        [t('ivrColQty')]: it.is_weight_based ? it.quantity / weightUnitScale(it.weight_unit) : it.quantity,
        [t('ivrColUnit')]: it.is_weight_based ? weightUnitLabel(it.weight_unit) : 'pcs',
        [t('ivrColUnitCost')]: it.is_weight_based ? pricePerWeightUnit(it.unit_cost, it.weight_unit) : it.unit_cost,
        [t('ivrColValue')]: it.value,
        [t('ivrColNote')]: it.is_consignment
          ? t('ivrCsvConsignment', { name: it.consignor_name })
          : it.negative_stock ? t('ivrBadgeNegative')
          : isMissingCost(it) ? t('ivrMissingCost')
          : it.cost_source === 'recipe' ? t('ivrCostSourceRecipe') : '',
      })),
      ...materials.map((m) => ({
        [t('ivrColCategory')]: t('ivrRawMaterials'),
        [t('ivrColName')]: m.name,
        [t('ivrColVariant')]: '',
        [t('ivrColSku')]: m.sku,
        [t('ivrColQty')]: m.quantity,
        [t('ivrColUnit')]: m.unit,
        [t('ivrColUnitCost')]: m.unit_cost,
        [t('ivrColValue')]: m.value,
        [t('ivrColNote')]: m.negative_stock ? t('ivrBadgeNegative') : m.missing_cost ? t('ivrMissingCost') : '',
      })),
    ]
    if (!rows.length) return
    // Baris TOTAL ditulis dari ringkasan server, bukan dijumlah otomatis:
    // barang titipan dan kolom Jumlah yang satuannya campur tidak boleh ikut.
    const total = Object.fromEntries(Object.keys(rows[0]).map((k) => [k, '' as string | number]))
    total[t('ivrColCategory')] = t('exportTotalRow')
    total[t('ivrColValue')] = summary.total_value
    exportToCSV([...rows, total], csvFilename('nilai-persediaan'), { withTotal: false })
  }

  const columns = [
    {
      key: 'name',
      label: t('ivrColName'),
      render: (it: InventoryValuationItem) => (
        <div>
          <p className="text-sm font-medium text-foreground">{itemName(it)}</p>
          <p className="text-xs text-muted-foreground">{[it.sku, it.category_name || t('ivrUncategorized')].filter(Boolean).join(' · ')}</p>
        </div>
      ),
    },
    {
      key: 'quantity',
      label: t('ivrColQty'),
      className: 'text-right',
      render: (it: InventoryValuationItem) => (
        <span className={`text-sm ${it.negative_stock ? 'text-destructive font-semibold' : 'text-foreground'}`}>
          {formatStockQuantity(it.quantity, it.is_weight_based, null, it.weight_unit)}
        </span>
      ),
    },
    {
      key: 'unit_cost',
      label: t('ivrColUnitCost'),
      className: 'text-right',
      render: (it: InventoryValuationItem) => (
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm text-muted-foreground">{it.unit_cost > 0 ? unitCostLabel(it) : '—'}</span>
          {it.is_consignment && <Badge variant="blue">{t('ivrBadgeConsignment')}</Badge>}
          {it.negative_stock && <Badge variant="red">{t('ivrBadgeNegative')}</Badge>}
          {isMissingCost(it) && <Badge variant="warning">{t('ivrMissingCost')}</Badge>}
          {it.cost_source === 'recipe' && <Badge variant="gray">{t('ivrCostSourceRecipe')}</Badge>}
        </div>
      ),
    },
    {
      key: 'value',
      label: t('ivrColValue'),
      className: 'text-right',
      render: (it: InventoryValuationItem) => (
        // Titipan tidak ikut total — warnanya diredam.
        <span className={`text-sm font-semibold ${it.is_consignment ? 'text-muted-foreground' : 'text-foreground'}`}>{formatCurrency(it.value)}</span>
      ),
    },
  ]

  const materialColumns = [
    {
      key: 'name',
      label: t('ivrColName'),
      render: (m: InventoryValuationRawMaterial) => (
        <div>
          <p className="text-sm font-medium text-foreground">{m.name}</p>
          {m.sku && <p className="text-xs text-muted-foreground">{m.sku}</p>}
        </div>
      ),
    },
    {
      key: 'quantity',
      label: t('ivrColQty'),
      className: 'text-right',
      render: (m: InventoryValuationRawMaterial) => (
        <span className={`text-sm ${m.negative_stock ? 'text-destructive font-semibold' : 'text-foreground'}`}>
          {`${formatQuantity(m.quantity)} ${m.unit}`.trim()}
        </span>
      ),
    },
    {
      key: 'unit_cost',
      label: t('ivrColUnitCost'),
      className: 'text-right',
      render: (m: InventoryValuationRawMaterial) => (
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm text-muted-foreground">{m.unit_cost > 0 ? formatCurrency(m.unit_cost) : '—'}</span>
          {m.missing_cost && <Badge variant="warning">{t('ivrMissingCost')}</Badge>}
        </div>
      ),
    },
    { key: 'value', label: t('ivrColValue'), className: 'text-right', render: (m: InventoryValuationRawMaterial) => <span className="text-sm font-semibold text-foreground">{formatCurrency(m.value)}</span> },
  ]

  const categories = data?.categories ?? []
  const productValue = summary?.product_value ?? 0
  const empty = !isLoading && !data?.items.length && !data?.raw_materials.length

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header
        title={t('navInventoryValuation')}
        subtitle={selectedOutlet ? t('ivrSubtitleOutlet', { outlet: selectedOutlet.name }) : t('ivrSubtitle')}
      />

      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title={t('ivrTotalValue')} value={formatCurrency(summary?.total_value ?? 0)} icon={<Warehouse size={18} />} color="blue" loading={isLoading} />
          <StatCard title={t('ivrProductValue')} value={formatCurrency(productValue)} icon={<Package size={18} />} color="green" loading={isLoading} />
          <StatCard title={t('ivrRawMaterials')} value={formatCurrency(summary?.raw_material_value ?? 0)} icon={<Boxes size={18} />} color="purple" loading={isLoading} />
          <StatCard
            title={t('ivrMissingCost')}
            value={summary?.missing_cost_count ?? 0}
            icon={<HelpCircle size={18} />}
            color="orange"
            loading={isLoading}
          />
        </div>

        {/* Peringatan di ATAS tabel: tanpanya total terbaca sebagai angka pasti,
            padahal sebagian barang dinilai nol. */}
        {(summary?.missing_cost_count ?? 0) > 0 && (
          <Note tone="warning" icon={<AlertTriangle size={16} />}>{t('ivrMissingCostWarn', { count: summary?.missing_cost_count ?? 0 })}</Note>
        )}
        {(summary?.negative_stock_count ?? 0) > 0 && (
          <Note tone="warning" icon={<AlertTriangle size={16} />}>{t('ivrNegativeWarn', { count: summary?.negative_stock_count ?? 0 })}</Note>
        )}
        {(summary?.consignment_count ?? 0) > 0 && (
          <Note tone="muted" icon={<HandHeart size={16} />}>
            {t('ivrConsignmentNote', { count: summary?.consignment_count ?? 0, value: formatCurrency(summary?.consignment_value ?? 0) })}
          </Note>
        )}

        {categories.length > 1 && (
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-sm font-semibold text-foreground mb-3">{t('ivrByCategory')}</p>
            <div className="space-y-2">
              {categories.map((c) => {
                const key = c.category_id ?? '__none__'
                const share = productValue > 0 ? (c.value / productValue) * 100 : 0
                const active = categoryId === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setCategoryId(active ? '' : key); setShown(PAGE) }}
                    className={`w-full text-left rounded-xl px-3 py-2 transition ${active ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground truncate">{c.category_name || t('ivrUncategorized')}</span>
                      <span className="text-sm font-semibold text-foreground">{formatCurrency(c.value)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${Math.min(100, share)}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {t('ivrItemCount', { count: c.item_count })} · {share.toFixed(1)}%
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
            <div className="w-full min-w-0 sm:w-auto sm:flex-1">
              <p className="text-sm font-semibold text-foreground">{t('ivrItemsTitle', { count: items.length })}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('ivrItemsDesc')}</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShown(PAGE) }}
                placeholder={t('ivrSearchHint')}
                aria-label={t('ivrSearchHint')}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-card text-foreground"
              />
            </div>
            <button type="button" onClick={handleExport} disabled={empty || isLoading} className={exportButtonClass}>
              <Download size={14} />
              {t('exportCsv')}
            </button>
          </div>
          <DataTable
            columns={columns as never[]}
            data={items.slice(0, shown) as never[]}
            loading={isLoading} error={error} onRetry={refetch}
            emptyMessage={empty ? t('ivrEmpty') : t('ivrNoMatch')}
          />
          {items.length > shown && (
            <div className="px-5 py-3 border-t border-border text-center">
              <button type="button" onClick={() => setShown((n) => n + PAGE)} className="text-sm font-medium text-primary hover:underline">
                {t('ivrShowMore', { count: items.length - shown })}
              </button>
            </div>
          )}
        </div>

        {materials.length > 0 && (
          <div className="bg-card rounded-2xl border border-border">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-sm font-semibold text-foreground">{t('ivrRawMaterials')}</p>
              {selectedOutlet && <p className="text-xs text-muted-foreground mt-0.5">{t('ivrRawMaterialOutletNote')}</p>}
            </div>
            <DataTable columns={materialColumns as never[]} data={materials as never[]} />
          </div>
        )}

        <Note tone="muted" icon={<Info size={16} />}>{t('ivrNote')}</Note>
      </div>
    </div>
  )
}
