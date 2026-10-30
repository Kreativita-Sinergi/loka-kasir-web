import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import NumericInput from '@/components/ui/NumericInput'
import SearchableSelect from '@/components/ui/SearchableSelect'
import {
  componentKey, createProduction, getProductionProducts, previewProduction,
  type ProductionComponentInput, type ProductionOrderInput, type ProductionPreview,
} from '@/api/production'
import { getRawMaterials } from '@/api/rawMaterials'
import { getOutletsByBusiness } from '@/api/outlets'
import { useAuthStore } from '@/store/authStore'
import { useOutletStore } from '@/store/outletStore'
import { newIdempotencyKey } from '@/lib/cashBook'
import { cn, formatCurrency, getErrorMessage } from '@/lib/utils'
import { formatQuantity } from '@/lib/money'
import { t } from '@/lib/i18n'
import type { Outlet, RawMaterial } from '@/types'

interface Row extends ProductionComponentInput {
  name: string
  unit: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  /** Dibuka dari produk: barang jadinya langsung terpilih. */
  initialProductId?: string
}

/**
 * Catat produksi: pilih barang jadi, jumlah hasil, dan outlet; komponen diisi
 * dari resep dikali jumlahnya (POST /production/preview) — boleh disunting
 * dan ditambah sebelum disimpan. Kebutuhan vs stok dan biaya dihitung server
 * dengan aturan yang sama persis dengan penyimpanan.
 */
export default function ProductionFormModal({ open, onClose, initialProductId }: Props) {
  const qc = useQueryClient()
  const businessId = useAuthStore(s => s.user?.business?.id ?? '')
  const activeOutlet = useOutletStore(s => s.selected)
  const [productId, setProductId] = useState(initialProductId ?? '')
  const [variantId, setVariantId] = useState('')
  const [outletId, setOutletId] = useState(activeOutlet?.id ?? '')
  const [qty, setQty] = useState('1')
  const [notes, setNotes] = useState('')
  const [updateCost, setUpdateCost] = useState(true)
  /** Null = belum ada daftar: minta resep dari server. */
  const [rows, setRows] = useState<Row[] | null>(null)
  const [perUnit, setPerUnit] = useState<Record<string, number>>({})
  const [adding, setAdding] = useState<'' | 'raw' | 'product'>('')
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey)

  // Buka ulang = formulir baru (kunci idempotensi baru juga).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return
    setProductId(initialProductId ?? ''); setVariantId(''); setOutletId(activeOutlet?.id ?? '')
    setQty('1'); setNotes(''); setUpdateCost(true); setRows(null); setPerUnit({}); setAdding('')
    setIdempotencyKey(newIdempotencyKey())
  }, [open, initialProductId, activeOutlet?.id])
  /* eslint-enable react-hooks/set-state-in-effect */

  const productsQuery = useQuery({
    queryKey: ['production-products'],
    queryFn: () => getProductionProducts(),
    select: res => res.data.data,
    enabled: open,
  })
  const componentProductsQuery = useQuery({
    queryKey: ['production-products', 'components'],
    queryFn: () => getProductionProducts({ components: true }),
    select: res => res.data.data,
    enabled: open && adding === 'product',
  })
  const rawQuery = useQuery({
    queryKey: ['raw-materials-selector'],
    queryFn: () => getRawMaterials({ page: 1, limit: 200 }),
    select: res => (res.data.data ?? []) as RawMaterial[],
    enabled: open && adding === 'raw',
  })
  const outletsQuery = useQuery({
    queryKey: ['outlets-selector', businessId],
    queryFn: () => getOutletsByBusiness(businessId, { limit: 50, page: 1 }),
    select: res => (res.data.data ?? []) as Outlet[],
    enabled: open && !!businessId,
    staleTime: 60_000,
  })
  const outlets = outletsQuery.data ?? []
  // Tanpa outlet aktif, usaha satu outlet tidak perlu memilih.
  const effectiveOutletId = outletId || (outlets.length === 1 ? outlets[0].id : '')
  const products = productsQuery.data ?? []
  const product = products.find(p => p.id === productId)
  const qtyOutput = Number(qty)
  const ready = !!product && !!effectiveOutletId && (!product.has_variant || !!variantId) && Number.isInteger(qtyOutput) && qtyOutput > 0

  const input: ProductionOrderInput | null = ready ? {
    outlet_id: effectiveOutletId,
    product_id: productId,
    variant_id: variantId || undefined,
    qty_output: qtyOutput,
    notes: notes.trim() || undefined,
    update_cost: updateCost,
    items: rows?.map(({ raw_material_id, product_id, variant_id, qty }) => ({ raw_material_id, product_id, variant_id, qty })),
  } : null

  // Pratinjau ditunda sebentar: satu permintaan per ketikan terlalu banyak.
  const [debounced, setDebounced] = useState<ProductionOrderInput | null>(null)
  const inputKey = JSON.stringify(input)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(input), 350)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- inputKey mewakili isi input
  }, [inputKey])

  const previewQuery = useQuery({
    queryKey: ['production-preview', JSON.stringify(debounced)],
    queryFn: () => previewProduction(debounced!),
    select: res => res.data.data,
    enabled: open && !!debounced,
    retry: false,
  })
  const preview: ProductionPreview | undefined = debounced && JSON.stringify(debounced) === inputKey ? previewQuery.data : undefined

  // Daftar pertama dari resep menjadi baris yang bisa disunting.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const p = previewQuery.data
    if (!p) return
    setPerUnit(prev => {
      const next = { ...prev }
      for (const c of p.components) if (c.qty_per_unit != null) next[componentKey(c)] = c.qty_per_unit
      return next
    })
    setRows(prev => prev ?? p.components.map(c => ({
      raw_material_id: c.raw_material_id ?? undefined,
      product_id: c.product_id ?? undefined,
      variant_id: c.variant_id ?? undefined,
      qty: c.qty,
      name: c.name,
      unit: c.unit_name,
    })))
  }, [previewQuery.data])
  /* eslint-enable react-hooks/set-state-in-effect */

  const infoByKey = useMemo(() => new Map((preview?.components ?? []).map(c => [componentKey(c), c])), [preview])

  const changeQty = (value: string) => {
    setQty(value)
    const n = Number(value)
    if (!rows || !Number.isFinite(n) || n <= 0) return
    // Komponen resep ikut jumlah hasil; komponen tambahan dibiarkan.
    setRows(rows.map(r => {
      const per = perUnit[componentKey(r)]
      return per == null ? r : { ...r, qty: Math.round(per * n * 10000) / 10000 }
    }))
  }

  const resetComponents = () => { setRows(null); setPerUnit({}) }

  const addRow = (row: Row) => {
    const current = rows ?? []
    if (current.some(r => componentKey(r) === componentKey(row))) {
      toast.error(t('pdnComponentExists'))
      return
    }
    setRows([...current, row])
    setAdding('')
  }

  const saveMut = useMutation({
    mutationFn: () => createProduction(input!, idempotencyKey),
    onSuccess: (res) => {
      toast.success(t('pdnSaved', { number: res.data.data.number }))
      qc.invalidateQueries({ queryKey: ['production-orders'] })
      qc.invalidateQueries({ queryKey: ['production-report'] })
      qc.invalidateQueries({ queryKey: ['outlet-stocks'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      onClose()
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const canSave = !!input && !!preview?.can_save && !saveMut.isPending
  const inputClass = 'w-full px-3 py-2 text-sm rounded-xl border border-border bg-card text-foreground'

  return (
    <Modal open={open} onClose={onClose} title={t('pdnCreate')} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('pdnFieldProduct')}</label>
            <SearchableSelect
              value={productId}
              onChange={(v) => { setProductId(v); setVariantId(''); resetComponents() }}
              options={products.map(p => ({
                value: p.id,
                label: p.name,
                hint: [p.component_count > 0 ? t('pdnComponentCount', { count: p.component_count }) : t('pdnNoRecipe'),
                  p.stock_mode !== 'produced' ? t('pdnNotProducedShort') : ''].filter(Boolean).join(' · '),
              }))}
              placeholder={productsQuery.isLoading ? t('loading') : t('pdnPickProduct')}
              searchable
            />
            {!productsQuery.isLoading && products.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">{t('pdnNoRecipeProducts')}</p>
            )}
          </div>
          {product?.has_variant && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('pdnVariant')}</label>
              <SearchableSelect
                value={variantId}
                onChange={(v) => { setVariantId(v); resetComponents() }}
                options={product.variants.map(v => ({ value: v.id, label: v.name }))}
                placeholder={t('pdnPickVariant')}
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {t('pdnFieldQty')}{product?.unit_name ? ` (${product.unit_name})` : ''}
            </label>
            <NumericInput value={qty} min={1} step={1} onChange={(e) => changeQty(e.target.value)} className={inputClass} />
          </div>
          {outlets.length > 1 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('pdnFieldOutlet')}</label>
              <SearchableSelect
                value={outletId}
                onChange={setOutletId}
                options={outlets.map(o => ({ value: o.id, label: o.name }))}
                placeholder={t('pdnFieldOutlet')}
                clearable={false}
              />
            </div>
          )}
        </div>

        {preview && (
          <p className="text-xs text-muted-foreground">
            {t('pdnCurrentStock', { stock: formatQuantity(preview.current_stock), cost: preview.current_cost != null ? formatCurrency(preview.current_cost) : '-' })}
          </p>
        )}
        {preview?.problem && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {preview.problem}
          </div>
        )}
        {previewQuery.error && !!debounced && (
          <p className="text-sm text-red-600 dark:text-red-400">{getErrorMessage(previewQuery.error)}</p>
        )}

        <div>
          <p className="text-sm font-semibold text-foreground">{t('pdnComponents')}</p>
          <p className="text-xs text-muted-foreground">{t('pdnComponentsHint')}</p>
          <div className="mt-2 divide-y divide-border rounded-xl border border-border">
            {(rows ?? []).length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">{product ? (previewQuery.isFetching ? t('loading') : t('pdnNoRecipe')) : t('pdnPickProduct')}</p>
            )}
            {(rows ?? []).map(r => {
              const info = infoByKey.get(componentKey(r))
              const short = info ? !info.sufficient : false
              return (
                <div key={componentKey(r)} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                    {info && (
                      <p className={cn('text-xs', short ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
                        {info.tracked ? t('pdnAvailable', { qty: `${formatQuantity(info.available)}${r.unit ? ` ${r.unit}` : ''}` }) : t('pdnUntracked')}
                        {' · '}{formatCurrency(info.total_cost)}
                      </p>
                    )}
                  </div>
                  <div className="w-32 flex items-center gap-1">
                    <NumericInput
                      value={r.qty}
                      min={0}
                      step="any"
                      aria-label={r.name}
                      onChange={(e) => {
                        const n = Number(e.target.value)
                        if (!Number.isFinite(n) || n <= 0) return
                        setRows((rows ?? []).map(x => componentKey(x) === componentKey(r) ? { ...x, qty: n } : x))
                      }}
                      className={cn(inputClass, short && 'border-red-400')}
                    />
                    {r.unit && <span className="text-xs text-muted-foreground">{r.unit}</span>}
                  </div>
                  <button
                    type="button"
                    aria-label={t('actionDelete')}
                    onClick={() => setRows((rows ?? []).filter(x => componentKey(x) !== componentKey(r)))}
                    className="p-1.5 text-muted-foreground hover:text-red-600 rounded-lg"
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>
          {product && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {adding === '' ? (
                <>
                  <button type="button" onClick={() => setAdding('raw')} className="flex items-center gap-1 text-sm text-primary hover:underline">
                    <Plus size={14} /> {t('pdnAddRawMaterial')}
                  </button>
                  <button type="button" onClick={() => setAdding('product')} className="flex items-center gap-1 text-sm text-primary hover:underline">
                    <Plus size={14} /> {t('pdnAddProduct')}
                  </button>
                </>
              ) : (
                <div className="w-full flex items-center gap-2">
                  <div className="flex-1">
                    {adding === 'raw' ? (
                      <SearchableSelect
                        value=""
                        searchable
                        placeholder={t('pdnSearchRawMaterial')}
                        options={(rawQuery.data ?? []).map(m => ({ value: m.id, label: m.name, hint: formatCurrency(m.avg_cost) }))}
                        onChange={(id) => {
                          const m = rawQuery.data?.find(x => x.id === id)
                          if (m) addRow({ raw_material_id: m.id, qty: 1, name: m.name, unit: m.unit?.alias || m.unit?.name || null })
                        }}
                      />
                    ) : (
                      <SearchableSelect
                        value=""
                        searchable
                        placeholder={t('pdnSearchProduct')}
                        options={(componentProductsQuery.data ?? []).flatMap(p => p.has_variant
                          ? p.variants.map(v => ({ value: `${p.id}:${v.id}`, label: `${p.name} — ${v.name}` }))
                          : [{ value: `${p.id}:`, label: p.name, hint: p.sku ?? undefined }])}
                        onChange={(value) => {
                          const [pid, vid] = value.split(':')
                          const p = componentProductsQuery.data?.find(x => x.id === pid)
                          if (!p) return
                          const v = p.variants.find(x => x.id === vid)
                          addRow({ product_id: pid, variant_id: vid || undefined, qty: 1, name: v ? `${p.name} — ${v.name}` : p.name, unit: p.unit_name })
                        }}
                      />
                    )}
                  </div>
                  <button type="button" onClick={() => setAdding('')} className="text-sm text-muted-foreground hover:text-foreground">{t('actionCancel')}</button>
                </div>
              )}
            </div>
          )}
        </div>

        {preview && (
          <div className="rounded-xl bg-muted p-3 text-sm space-y-1">
            <div className="flex justify-between font-semibold"><span>{t('pdnTotalCost')}</span><span>{formatCurrency(preview.total_cost)}</span></div>
            <div className="flex justify-between"><span>{t('pdnUnitCost')}</span><span>{formatCurrency(preview.unit_cost)}</span></div>
            {preview.shortages > 0 && (
              <div className="flex justify-between text-red-600 dark:text-red-400"><span>{t('pdnShortages')}</span><span>{preview.shortages}</span></div>
            )}
          </div>
        )}

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={updateCost} onChange={(e) => setUpdateCost(e.target.checked)} className="mt-1" />
          <span>
            <span className="block text-sm text-foreground">{t('pdnUpdateCost')}</span>
            <span className="block text-xs text-muted-foreground">{t('pdnUpdateCostHint')}</span>
          </span>
        </label>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('pdnFieldNotes')}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} className={inputClass} />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border text-sm font-medium rounded-xl hover:bg-muted transition">
            {t('actionCancel')}
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => saveMut.mutate()}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
          >
            {saveMut.isPending ? t('loading') : t('pdnSave')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
