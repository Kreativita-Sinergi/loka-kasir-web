import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ShoppingCart, Sparkles } from 'lucide-react'
import { ActionButton, DeleteButton } from '@/components/ui/RowActions'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import QueryErrorState from '@/components/ui/QueryErrorState'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  createDirectPurchase,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  deletePurchaseOrder,
  getRestockSuggestions,
  searchPOProducts,
} from '@/api/purchaseOrders'
import type { CreatePOPayload, DirectPurchasePayload, POProductOption, POProductVariant, ReceiveItemPayload, RestockSuggestion } from '@/api/purchaseOrders'
import type { POPaymentMethod } from '@/api/purchasePayables'
import { getCashAccounts } from '@/api/cashAccounts'
import { accountOptionLabel } from '@/components/finance/cashLabels'
import { usePermissions, PERMS } from '@/hooks/usePermissions'
import { newIdempotencyKey } from '@/lib/cashBook'
import { directPurchasePayment, purchaseOrdersEnabled } from '@/lib/purchaseMode'
import { useAuthStore } from '@/store/authStore'
import { getSuppliers } from '@/api/suppliers'
import { getRawMaterials } from '@/api/rawMaterials'
import { formatCurrency, formatDate, getErrorMessage, localStamp, todayISODate } from '@/lib/utils'
import type { PurchaseOrder, POItem, Supplier, RawMaterial } from '@/types'
import { formatQuantity } from '@/lib/money'
import { t } from '@/lib/i18n'
import NumericInput from '@/components/ui/NumericInput'
import PoCostPreview from '@/components/stock/PoCostPreview'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { useOutletStore } from '@/store/outletStore'
import POPaymentSection from '@/components/purchasing/POPaymentSection'
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_VARIANT, canPay, paymentStatusLabel } from '@/lib/purchasePayables'
import { parseNumericInput, validNumericInput, convertMaterialQuantity } from '@/lib/materialUnits'
import {
  defaultReceiveUnit,
  formatPOQuantity,
  isProductItem,
  measureUnitOptions,
  poItemName,
  poItemUnitOptions,
  productUnitOptions,
  type POUnitOption,
} from '@/lib/purchaseOrderLines'

// ─── Status helpers ──────────────────────────────────────────────────────────

type POStatus = PurchaseOrder['status']

// Fungsi, bukan konstanta: isinya memanggil t(), dan konstanta modul
// dievaluasi sekali saat berkas dimuat — bahasanya akan terkunci pada yang
// kebetulan aktif saat itu.
const statusLabel = (): Record<POStatus, string> => ({
  draft: t('poStatusDraft'),
  ordered: t('poStatusOrdered'),
  partial_received: t('poPartiallyReceived'),
  received: t('poStatusReceived'),
  cancelled: t('statusCancelled'),
})

const STATUS_BADGE: Record<POStatus, 'gray' | 'blue' | 'yellow' | 'green' | 'red'> = {
  draft: 'gray',
  ordered: 'blue',
  partial_received: 'yellow',
  received: 'green',
  cancelled: 'red',
}

function StatusBadge({ status }: { status: POStatus }) {
  return <Badge variant={STATUS_BADGE[status]}>{statusLabel()[status]}</Badge>
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

// Fungsi, bukan konstanta: label harus ikut bahasa yang aktif saat render.
const tabs = (): { key: string; label: string }[] => [
  // Tanpa "Draf": PO baru langsung dipesan. PO draf lama tetap ada di "Semua".
  { key: '', label: t('labelAll') },
  { key: 'ordered', label: t('poStatusOrderedTab') },
  { key: 'received', label: t('poStatusReceived') },
  { key: 'cancelled', label: t('statusCancelled') },
]

// ─── Create PO Modal ─────────────────────────────────────────────────────────

type POLineKind = 'product' | 'raw_material'

interface CreatePORow {
  _key: number
  kind: POLineKind
  raw_material_id?: string
  product_id?: string
  variant_id?: string
  name: string
  base_unit: string
  units: POUnitOption[]
  unitKey: string
  quantity_ordered: string
  unit_cost: string
}

/** Satu entri di daftar pencarian produk — varian ditampilkan satu per satu. */
interface ProductPick {
  key: string
  option: POProductOption
  variant?: POProductVariant
  label: string
}

function flattenProducts(options: POProductOption[]): ProductPick[] {
  return options.flatMap(option => option.has_variant
    ? option.variants.map(variant => ({ key: `${option.product_id}:${variant.id}`, option, variant, label: `${option.name} — ${variant.name}` }))
    : [{ key: option.product_id, option, label: option.name }])
}

const rowFactor = (row: CreatePORow) => row.units.find(unit => unit.key === row.unitKey)?.factor ?? 1

function suggestionRow(item: RestockSuggestion, key: number): CreatePORow {
  const isProduct = item.item_type === 'product'
  const name = isProduct && item.variant_name ? `${item.name} — ${item.variant_name}` : (item.name || item.raw_material_name)
  const units = isProduct && !item.is_weight_based
    ? productUnitOptions(item.unit_alias, [])
    : measureUnitOptions(item.unit_alias)
  return {
    _key: key,
    kind: isProduct ? 'product' : 'raw_material',
    raw_material_id: item.raw_material_id ?? undefined,
    product_id: item.product_id ?? undefined,
    variant_id: item.variant_id ?? undefined,
    name,
    base_unit: item.unit_alias,
    units,
    unitKey: units.find(unit => unit.factor === 1)?.key ?? units[0].key,
    quantity_ordered: String(item.recommended_quantity),
    unit_cost: String(item.estimated_unit_cost),
  }
}

/**
 * Formulir PO baru — atau, dengan [direct], Pembelian langsung (saklar "Pakai
 * Purchase Order" mati): formulir yang sama tanpa nomor & perkiraan tiba,
 * ditambah "Bayar sekarang", disimpan lewat POST /purchase-order/direct
 * sehingga barangnya langsung masuk stok dalam satu transaksi server.
 */
function CreatePOModal({
  open,
  onClose,
  onSuccess,
  suggestions = [],
  initialSupplierId = '',
  direct = false,
}: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  suggestions?: RestockSuggestion[]
  initialSupplierId?: string
  direct?: boolean
}) {
  const { selected: activeOutlet } = useOutletStore()
  const { can } = usePermissions()
  // Memilih akun menulis buku Kas & Rekening: hanya untuk pemegang izinnya.
  const canCashBook = direct && can(PERMS.FINANCE_CASH_BOOK)
  // Satu kunci per formulir: Simpan yang ditekan lagi setelah jawaban hilang
  // di jalan tidak menambah stok dua kali.
  const [idempotencyKey] = useState(newIdempotencyKey)
  // Bayar sekarang: bawaan nyala dan sebesar total (toko kecil umumnya
  // membayar saat barang diambil); kosong = ikut total.
  const [payNow, setPayNow] = useState(true)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<POPaymentMethod>('cash')
  const [payAccountId, setPayAccountId] = useState('')
  const [poNumber, setPoNumber] = useState(() => `PO-${localStamp()}`)
  const [supplierId, setSupplierId] = useState(initialSupplierId)
  const [orderDate, setOrderDate] = useState(() => todayISODate())
  const [expectedDate, setExpectedDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<CreatePORow[]>(() => suggestions.map((item, index) => suggestionRow(item, index + 1)))
  const [itemKind, setItemKind] = useState<POLineKind>(() =>
    suggestions.length > 0 && suggestions.every(item => item.item_type !== 'product') ? 'raw_material' : 'product')
  const [itemSearch, setItemSearch] = useState('')
  const rowKeyRef = useRef(suggestions.length)

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () => getSuppliers({ page: 1, limit: 200 }),
    enabled: open,
  })

  const { data: rmData } = useQuery({
    queryKey: ['raw-materials-search', itemSearch],
    queryFn: () => getRawMaterials({ page: 1, limit: 20, search: itemSearch || undefined }),
    enabled: open && itemKind === 'raw_material' && !!itemSearch,
  })

  const { data: productData } = useQuery({
    queryKey: ['po-products-search', itemSearch, activeOutlet?.id],
    queryFn: () => searchPOProducts({ search: itemSearch, outlet_id: activeOutlet?.id, limit: 20 }),
    enabled: open && itemKind === 'product' && !!itemSearch && !!activeOutlet?.id,
  })

  const { data: cashAccounts = [] } = useQuery({
    queryKey: ['cash-accounts', 'active'],
    queryFn: () => getCashAccounts(),
    select: res => (res.data.data ?? []).filter(a => a.is_active),
    enabled: open && canCashBook,
  })

  const suppliers: Supplier[] = suppliersData?.data?.data ?? []
  const rawMaterials: RawMaterial[] = rmData?.data?.data ?? []
  const productPicks = useMemo(() => flattenProducts(productData?.data?.data ?? []), [productData])
  const hasProductRows = rows.some(row => row.kind === 'product')

  const totalAmount = useMemo(
    () => rows.reduce((sum, r) => sum + (parseNumericInput(r.quantity_ordered) || 0) * (parseNumericInput(r.unit_cost) || 0), 0),
    [rows]
  )

  function appendRow(row: Omit<CreatePORow, '_key'>) {
    setRows(prev => [...prev, { ...row, _key: ++rowKeyRef.current }])
    setItemSearch('')
  }

  function addMaterialRow(rm: RawMaterial) {
    const base = rm.unit?.alias || rm.unit?.name || ''
    appendRow({
      kind: 'raw_material',
      raw_material_id: rm.id,
      name: rm.name,
      base_unit: base,
      units: measureUnitOptions(base),
      unitKey: `m:1`,
      quantity_ordered: '1',
      unit_cost: String(rm.avg_cost ?? 0),
    })
  }

  function addProductRow(pick: ProductPick) {
    const { option, variant } = pick
    const units = option.is_weight_based
      ? measureUnitOptions(option.base_unit)
      : productUnitOptions(option.base_unit, option.has_variant ? [] : option.sale_units)
    const cost = (variant ? variant.last_unit_cost ?? variant.current_cost : option.last_unit_cost ?? option.current_cost) ?? 0
    appendRow({
      kind: 'product',
      product_id: option.product_id,
      variant_id: variant?.id,
      name: pick.label,
      base_unit: option.base_unit,
      units,
      unitKey: units.find(unit => unit.factor === 1)?.key ?? units[0].key,
      quantity_ordered: '1',
      unit_cost: String(cost),
    })
  }

  function updateRow(key: number, field: 'quantity_ordered' | 'unit_cost', val: string) {
    setRows((prev) =>
      prev.map((r) => (r._key === key ? { ...r, [field]: val } : r))
    )
  }

  // Mengganti satuan tanpa mengubah nilai fisiknya: 1 Dus @Rp120.000 menjadi
  // 40 pcs @Rp3.000.
  function changeUnit(key: number, unitKey: string) {
    setRows(prev => prev.map(row => {
      if (row._key !== key) return row
      const from = rowFactor(row)
      const to = row.units.find(unit => unit.key === unitKey)?.factor ?? 1
      return {
        ...row, unitKey,
        quantity_ordered: validNumericInput(row.quantity_ordered) ? String(convertMaterialQuantity(parseNumericInput(row.quantity_ordered), from / to)) : row.quantity_ordered,
        unit_cost: validNumericInput(row.unit_cost) ? String(convertMaterialQuantity(parseNumericInput(row.unit_cost), to / from)) : row.unit_cost,
      }
    }))
  }

  const rowsValid = rows.length > 0 && rows.every(row => validNumericInput(row.quantity_ordered, 0, true) && validNumericInput(row.unit_cost))

  function removeRow(key: number) {
    setRows((prev) => prev.filter((r) => r._key !== key))
  }

  const directMut = useMutation({
    mutationFn: (payload: DirectPurchasePayload) => createDirectPurchase(payload, idempotencyKey),
    onSuccess: () => {
      toast.success(t('dpurCreated'))
      onSuccess()
      onClose()
      resetForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const createMut = useMutation({
    mutationFn: (payload: CreatePOPayload) => createPurchaseOrder(payload),
    onSuccess: () => {
      toast.success(t('poCreated'))
      onSuccess()
      onClose()
      resetForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  function resetForm() {
    setPoNumber('')
    setSupplierId('')
    setOrderDate(todayISODate())
    setExpectedDate('')
    setDueDate('')
    setNotes('')
    setRows([])
    setItemSearch('')
  }

  function handleClose() {
    onClose()
    resetForm()
  }

  function handleSave() {
    if (!direct && !poNumber.trim()) { toast.error(t('poNumberRequired')); return }
    if (rows.length === 0) { toast.error(t('poItemRequired')); return }
    if (!rowsValid) { toast.error(t('inputInvalidNumbers')); return }
    if (!orderDate || (expectedDate && expectedDate < orderDate)) { toast.error(t('inputInvalidDates')); return }
    if (hasProductRows && !activeOutlet) { toast.error(t('poProductNeedsOutlet')); return }
    const items: CreatePOPayload['items'] = []
    for (const row of rows) {
      const factor = rowFactor(row)
      const unit = row.units.find(option => option.key === row.unitKey)
      const quantity = convertMaterialQuantity(parseNumericInput(row.quantity_ordered), factor)
      // Stok produk disimpan bulat (pcs, atau gram untuk produk timbangan).
      if (row.kind === 'product' && !Number.isInteger(quantity)) {
        toast.error(t('poWholeQty', { name: row.name, unit: row.base_unit }))
        return
      }
      items.push({
        ...(row.kind === 'product'
          ? { product_id: row.product_id, variant_id: row.variant_id, unit_id: unit?.unitId, use_purchase_unit: unit?.purchaseUnit }
          : { raw_material_id: row.raw_material_id }),
        quantity_ordered: quantity,
        unit_cost: parseNumericInput(row.unit_cost) / factor,
      })
    }
    if (direct) {
      const pay = directPurchasePayment({
        payNow,
        amount: payAmount.trim() ? parseNumericInput(payAmount) : totalAmount,
        total: totalAmount,
        method: payMethod,
        accountId: payAccountId,
      })
      if ('error' in pay) { toast.error(t(pay.error)); return }
      directMut.mutate({
        supplier_id: supplierId || null,
        outlet_id: hasProductRows ? activeOutlet?.id ?? null : null,
        purchase_date: orderDate,
        due_date: dueDate || null,
        notes: notes || null,
        items,
        payment: pay.payment,
      })
      return
    }
    createMut.mutate({
      po_number: poNumber.trim(),
      supplier_id: supplierId || null,
      outlet_id: hasProductRows ? activeOutlet?.id ?? null : null,
      order_date: orderDate,
      expected_date: expectedDate || null,
      due_date: dueDate || null,
      notes: notes || null,
      items,
    })
  }

  const kindTabs: { key: POLineKind; label: string }[] = [
    { key: 'product', label: t('poKindProduct') },
    { key: 'raw_material', label: t('poKindMaterial') },
  ]

  return (
    <Modal open={open} onClose={handleClose} title={direct ? t('dpurNew') : t('poCreateTitle')} size="lg">
      <div className="space-y-5">
        {/* Header fields — Pembelian langsung tanpa nomor (server memberi
            "PB-…") dan tanpa perkiraan tiba: barangnya sudah di tangan. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!direct && <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('poNumber')} <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="PO-2024-001"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
            />
          </div>}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('poSupplierOptional')}</label>
            <SearchableSelect
              className="w-full"
              value={supplierId}
              onChange={setSupplierId}
              options={[{ value: '', label: t('poNoSupplier') }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]}
              clearable={false}
              label={t('labelSupplier')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{direct ? t('dpurDate') : t('poOrderDate')}</label>
            <input
              type="date"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={orderDate}
              max={direct ? todayISODate() : undefined}
              onChange={(e) => setOrderDate(e.target.value)}
            />
          </div>
          {!direct && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('poExpectedDate')}</label>
              <input
                type="date"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          )}
          {/* Jatuh tempo bayar ke supplier: dasar umur di laporan Hutang Supplier. */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('htsDueDate')} <span className="text-muted-foreground font-normal">({t('labelOptional')})</span>
            </label>
            <input
              type="date"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={dueDate}
              min={orderDate || undefined}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">{t('htsDueHint')}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t('labelNoteOptional')}</label>
          <textarea
            rows={2}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder={t('poNotesPlaceholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Items section */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-sm font-semibold text-foreground">{t('poItemsSection')}</p>
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {kindTabs.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setItemKind(tab.key); setItemSearch('') }}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    itemKind === tab.key
                      ? 'bg-card text-blue-700 dark:text-blue-400 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {itemKind === 'product' && !activeOutlet ? (
            <div className="mb-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
              {t('poProductNeedsOutlet')}
            </div>
          ) : (
            <div className="relative mb-3">
              <input
                type="text"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={itemKind === 'product' ? t('poSearchProduct') : t('poSearchMaterial')}
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
              />
              {itemSearch && itemKind === 'raw_material' && rawMaterials.length > 0 && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {rawMaterials.map((rm) => (
                    <button
                      key={rm.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-500/10 flex items-center justify-between"
                      onClick={() => addMaterialRow(rm)}
                    >
                      <span className="font-medium text-foreground">{rm.name}</span>
                      <span className="text-muted-foreground text-xs">{rm.unit?.alias || rm.unit?.name || ''}</span>
                    </button>
                  ))}
                </div>
              )}
              {itemSearch && itemKind === 'product' && productPicks.length > 0 && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {productPicks.map((pick) => (
                    <button
                      key={pick.key}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-500/10 flex items-center justify-between gap-3"
                      onClick={() => addProductRow(pick)}
                    >
                      <span className="font-medium text-foreground truncate">{pick.label}</span>
                      <span className="text-muted-foreground text-xs shrink-0">
                        {pick.option.track_stock || pick.variant
                          ? t('poItemStock', { stock: formatQuantity(pick.variant?.stock ?? pick.option.stock), unit: pick.option.base_unit })
                          : pick.option.base_unit}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {itemSearch && (itemKind === 'product' ? productData && productPicks.length === 0 : rmData && rawMaterials.length === 0) && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-sm text-muted-foreground">
                  {t('notFound')}
                </div>
              )}
            </div>
          )}

          {rows.length > 0 && (
            <div className="border border-border rounded-lg overflow-x-auto">
              <table className="responsive-table w-full min-w-[560px] text-sm">
                <thead className="bg-muted text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">{t('labelItem')}</th>
                    <th className="px-3 py-2 text-left">{t('labelUnit')}</th>
                    <th className="px-3 py-2 text-right w-28">{t('labelQuantity')}</th>
                    <th className="px-3 py-2 text-right w-36">{t('poPricePerUnit')}</th>
                    <th className="px-3 py-2 text-right w-32">{t('labelSubtotalShort')}</th>
                    <th className="px-3 py-2 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row._key}>
                      <td data-label={t('labelItem')} className="px-3 py-2">
                        <p className="font-medium text-foreground">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{row.kind === 'product' ? t('poKindProduct') : t('poKindMaterial')}</p>
                      </td>
                      <td data-label={t('labelUnit')} className="px-3 py-2 text-muted-foreground text-xs">
                        {row.units.length > 1 ? (
                          <SearchableSelect label={t('labelUnit')} value={row.unitKey} onChange={value => changeUnit(row._key, value)}
                            options={row.units.map(unit => ({ value: unit.key, label: unit.label }))}
                            clearable={false} size="sm" className="w-full" />
                        ) : row.units[0]?.label}
                      </td>
                      <td data-label={t('labelQuantity')} className="px-3 py-2">
                        <NumericInput
                          type="number"
                          min="0"
                          step="any"
                          className="w-full border border-border rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                          value={row.quantity_ordered}
                          onChange={(e) => updateRow(row._key, 'quantity_ordered', e.target.value)}
                        />
                      </td>
                      <td data-label={t('poPricePerUnit')} className="px-3 py-2">
                        <NumericInput
                          type="number"
                          min="0" step="any"
                          className="w-full border border-border rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                          value={row.unit_cost}
                          onChange={(e) => updateRow(row._key, 'unit_cost', e.target.value)}
                        />
                      </td>
                      <td data-label={t('labelSubtotalShort')} className="px-3 py-2 text-right text-foreground font-mono text-xs">
                        {formatCurrency((parseNumericInput(row.quantity_ordered) || 0) * (parseNumericInput(row.unit_cost) || 0))}
                      </td>
                      <td data-label={t('labelActions')} className="px-3 py-2">
                        <DeleteButton onClick={() => removeRow(row._key)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rows.length === 0 && (
            <div className="border border-dashed border-border rounded-lg py-6 text-center text-sm text-muted-foreground">
              {t('poItemsEmpty')}
            </div>
          )}

          {hasProductRows && activeOutlet && (
            <p className="mt-2 text-xs text-muted-foreground">{t('poTargetOutlet', { outlet: activeOutlet.name })}</p>
          )}
        </div>

        {/* Total */}
        {rows.length > 0 && (
          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-500/10 border border-blue-100 rounded-lg px-4 py-3">
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">{t('poTotalAmount')}</span>
            <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{formatCurrency(totalAmount)}</span>
          </div>
        )}

        {/* Bayar sekarang — isian yang sama dengan "Bayar ke supplier" di
            rincian PO; sisanya tercatat di Hutang Supplier. */}
        {direct && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{t('dpurStockHint')}</p>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{t('dpurPayNow')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('dpurPayNowHint')}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={payNow}
                aria-label={t('dpurPayNow')}
                onClick={() => setPayNow(v => !v)}
                className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${payNow ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${payNow ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {payNow && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{t('htsPayAmount')}</label>
                  <NumericInput
                    min={0}
                    step="any"
                    aria-label={t('htsPayAmount')}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={String(totalAmount)}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                </div>
                {canCashBook && cashAccounts.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">{t('htsPayFrom')} <span className="text-muted-foreground font-normal">({t('labelOptional')})</span></label>
                    <SearchableSelect value={payAccountId} onChange={setPayAccountId} clearable={false} label={t('htsPayFrom')} className="w-full"
                      options={[{ value: '', label: t('htsPayFromNone') }, ...cashAccounts.map(a => ({ value: a.id, label: accountOptionLabel(a) }))]} />
                    <p className="mt-1 text-xs text-muted-foreground">{t('htsPayFromHint')}</p>
                  </div>
                )}
                {/* Bila akun dipilih, server menurunkan caranya dari jenis akun. */}
                {!payAccountId && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">{t('htsPayMethod')}</label>
                    <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit" role="radiogroup" aria-label={t('htsPayMethod')}>
                      {(Object.keys(PAYMENT_METHOD_LABEL) as POPaymentMethod[]).map(m => (
                        <button key={m} type="button" role="radio" aria-checked={payMethod === m} onClick={() => setPayMethod(m)}
                          className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${payMethod === m ? 'bg-card text-blue-700 dark:text-blue-400 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                          {t(PAYMENT_METHOD_LABEL[m])}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted"
          >
            {t('actionCancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={createMut.isPending || directMut.isPending || (!direct && !poNumber.trim()) || !rowsValid || !orderDate || (!!expectedDate && expectedDate < orderDate)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
          >
            {createMut.isPending || directMut.isPending ? t('saving') : direct ? t('dpurSave') : t('poSave')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── View / Receive PO Modal ─────────────────────────────────────────────────

function ViewPOModal({
  poId,
  open,
  onClose,
  onMutated,
}: {
  poId: string | null
  open: boolean
  onClose: () => void
  onMutated: () => void
}) {
  const qc = useQueryClient()
  const [showReceive, setShowReceive] = useState(false)
  const [receiveQtys, setReceiveQtys] = useState<Record<string, string>>({})
  const [receiveCosts, setReceiveCosts] = useState<Record<string, string>>({})
  const [receiveUnits, setReceiveUnits] = useState<Record<string, string>>({})
  const [updateCost, setUpdateCost] = useState(true)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['purchase-order', poId],
    queryFn: () => getPurchaseOrderById(poId!),
    enabled: open && !!poId,
  })

  const po: PurchaseOrder | null = data?.data?.data ?? null
  const hasProducts = po?.items.some(isProductItem) ?? false

  const receiveMut = useMutation({
    mutationFn: ({ id, items, update_cost }: { id: string; items: ReceiveItemPayload[]; update_cost?: boolean }) =>
      receivePurchaseOrder(id, { items, update_cost }),
    onSuccess: () => {
      toast.success(t('poReceived'))
      qc.invalidateQueries({ queryKey: ['purchase-order', poId] })
      // Stok bahan & produk berubah, begitu pula harga modal: segarkan daftar
      // bahan, stok outlet, produk, dan saran restok — bukan hanya satu.
      qc.invalidateQueries({ predicate: (q) => {
        const key = String(q.queryKey[0])
        return key.startsWith('raw-material') || key.startsWith('outlet-stock') || key.startsWith('product')
      } })
      qc.invalidateQueries({ queryKey: ['purchase-order-restock-suggestions'] })
      // Barang diterima = hutang supplier bertambah.
      qc.invalidateQueries({ queryKey: ['purchase-order-payments', poId] })
      qc.invalidateQueries({ queryKey: ['purchase-report'] })
      qc.invalidateQueries({ queryKey: ['supplier-payables'] })
      onMutated()
      setShowReceive(false)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const unitOf = (item: POItem) => poItemUnitOptions(item).find(unit => unit.key === receiveUnits[item.id]) ?? defaultReceiveUnit(item, 0)

  function handleReceive() {
    if (!po || !receiveValid) { toast.error(t('inputInvalidNumbers')); return }
    const items: ReceiveItemPayload[] = []
    for (const item of po.items) {
      const factor = unitOf(item).factor
      const qtyStr = receiveQtys[item.id] ?? '0'
      const costStr = receiveCosts[item.id]
      // Keep entered costs explicit; invalid drafts cannot be received.
      const parsedCost = costStr === undefined ? item.unit_cost * factor : parseNumericInput(costStr)
      const quantity = convertMaterialQuantity(parseNumericInput(qtyStr), factor)
      if (isProductItem(item) && !Number.isInteger(quantity)) {
        toast.error(t('poWholeQty', { name: poItemName(item), unit: item.unit_alias })); return
      }
      items.push({ item_id: item.id, quantity_received: quantity, unit_cost: parsedCost / factor })
    }
    if (items.some(item => !Number.isFinite(item.quantity_received) || item.quantity_received < 0 || !Number.isFinite(item.unit_cost) || item.unit_cost < 0) || !items.some(item => item.quantity_received > 0)) {
      toast.error(t('inputInvalidNumbers')); return
    }
    receiveMut.mutate({
      id: po.id,
      items: items.filter(item => item.quantity_received > 0),
      update_cost: hasProducts ? updateCost : undefined,
    })
  }

  function initReceive(items: POItem[]) {
    const qtys: Record<string, string> = {}
    const costs: Record<string, string> = {}
    const units: Record<string, string> = {}
    items.forEach((item) => {
      const remaining = Math.max(0, Number((item.quantity_ordered - item.quantity_received).toPrecision(12)))
      // Sisa dibuka dalam satuan beli PO bila pas ("2 Dus"), selain itu
      // satuan dasar.
      const unit = defaultReceiveUnit(item, remaining)
      units[item.id] = unit.key
      qtys[item.id] = String(convertMaterialQuantity(remaining, 1 / unit.factor))
      costs[item.id] = String(convertMaterialQuantity(item.unit_cost, unit.factor))
    })
    setReceiveUnits(units)
    setReceiveQtys(qtys)
    setReceiveCosts(costs)
    setUpdateCost(true)
    setShowReceive(true)
  }

  function changeReceiveUnit(item: POItem, nextKey: string) {
    const current = unitOf(item).factor
    const next = poItemUnitOptions(item).find(unit => unit.key === nextKey)?.factor ?? 1
    const qty = receiveQtys[item.id] ?? ''
    const cost = receiveCosts[item.id] ?? String(item.unit_cost)
    if (validNumericInput(qty)) setReceiveQtys(prev => ({ ...prev, [item.id]: String(convertMaterialQuantity(parseNumericInput(qty), current / next)) }))
    if (validNumericInput(cost)) setReceiveCosts(prev => ({ ...prev, [item.id]: String(convertMaterialQuantity(parseNumericInput(cost), next / current)) }))
    setReceiveUnits(prev => ({ ...prev, [item.id]: nextKey }))
  }

  const receiveValid = po && po.items.every(item => validNumericInput(receiveQtys[item.id] ?? '', 0) && validNumericInput(receiveCosts[item.id] ?? '') && (parseNumericInput(receiveCosts[item.id] ?? '') > 0 || item.unit_cost === 0))
    && po.items.some(item => validNumericInput(receiveQtys[item.id] ?? '', 0, true))

  const canReceive = po
    ? po.status === 'draft' || po.status === 'ordered' || po.status === 'partial_received'
    : false

  /** Baris "Harga modal: Rp2.800 → Rp2.978 /pcs" untuk satu produk — lihat PoCostPreview. */
  function costPreview(item: POItem) {
    if (!isProductItem(item) || !validNumericInput(receiveQtys[item.id] ?? '', 0, true)) return null
    const cost = parseNumericInput(receiveCosts[item.id] ?? '')
    if (!Number.isFinite(cost) || cost <= 0) return null
    const factor = unitOf(item).factor
    return (
      <PoCostPreview
        item={item}
        baseQty={parseNumericInput(receiveQtys[item.id] ?? '') * factor}
        baseUnitCost={cost / factor}
      />
    )
  }

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); setShowReceive(false) }}
      title={po ? t(po.is_direct ? 'dpurDetailTitle' : 'poDetailTitle', { po: po.po_number }) : t('poLoadingDetail')}
      size="lg"
    >
      <QueryErrorState error={error} onRetry={refetch} />
      {isLoading && (
        <div className="space-y-3 py-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 bg-muted rounded animate-pulse" />
          ))}
        </div>
      )}

      {po && (
        <div className="space-y-5">
          {/* PO info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">{t('poNumber')}</p>
              <p className="font-semibold text-foreground">{po.po_number}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">{t('labelStatus')}</p>
              <StatusBadge status={po.status} />
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">{t('navSuppliers')}</p>
              <p className="text-foreground">{po.supplier?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">{t('poTotalAmount')}</p>
              <p className="font-bold text-blue-700 dark:text-blue-400">{formatCurrency(po.total_amount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">{po.is_direct ? t('dpurDate') : t('poOrderDate')}</p>
              <p className="text-foreground">{formatDate(po.order_date)}</p>
            </div>
            {/* Pembelian langsung tidak punya perkiraan tiba — barangnya datang saat dicatat. */}
            {!po.is_direct && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">{t('poExpectedDateShort')}</p>
                <p className="text-foreground">{po.expected_date ? formatDate(po.expected_date) : '—'}</p>
              </div>
            )}
            {po.outlet_name && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">{t('poOutlet')}</p>
                <p className="text-foreground">{po.outlet_name}</p>
              </div>
            )}
            {po.notes && (
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs mb-0.5">{t('labelNote')}</p>
                <p className="text-foreground">{po.notes}</p>
              </div>
            )}
          </div>

          {/* Items table */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">{t('labelItem')}</p>
            <div className="border border-border rounded-lg overflow-x-auto">
              <table className="responsive-table w-full min-w-[560px] text-sm">
                <thead className="bg-muted text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">{t('labelItem')}</th>
                    <th className="px-3 py-2 text-left">{t('labelUnit')}</th>
                    <th className="px-3 py-2 text-right">{t('poOrdered')}</th>
                    <th className="px-3 py-2 text-right">{t('poReceivedQty')}</th>
                    <th className="px-3 py-2 text-right">{t('poPricePerUnit')}</th>
                    <th className="px-3 py-2 text-right">{t('labelSubtotalShort')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {po.items.map((item) => (
                    <tr key={item.id}>
                      <td data-label={t('labelItem')} className="px-3 py-2">
                        <p className="font-medium text-foreground">{poItemName(item)}</p>
                        <p className="text-xs text-muted-foreground">{isProductItem(item) ? t('poKindProduct') : t('poKindMaterial')}</p>
                      </td>
                      <td data-label={t('labelUnit')} className="px-3 py-2 text-muted-foreground text-xs">{item.unit_alias}</td>
                      <td data-label={t('poOrdered')} className="px-3 py-2 text-right font-mono text-foreground">
                        {formatPOQuantity(item, item.quantity_ordered, formatQuantity)}
                      </td>
                      <td data-label={t('poReceivedQty')} className="px-3 py-2 text-right font-mono text-foreground">
                        {formatPOQuantity(item, item.quantity_received, formatQuantity)}
                      </td>
                      <td data-label={t('poPricePerUnit')} className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(item.unit_cost)}</td>
                      <td data-label={t('labelSubtotalShort')} className="px-3 py-2 text-right font-semibold text-foreground">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hutang ke supplier muncul setelah barang diterima; PO batal yang
              belum menerima apa pun tidak punya apa-apa untuk dibayar. */}
          {(po.status !== 'cancelled' || (po.received_amount ?? 0) > 0) && <POPaymentSection po={po} />}

          {/* Receive section */}
          {canReceive && !showReceive && (
            <div className="flex justify-end">
              <button
                onClick={() => initReceive(po.items)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
              >
                {t('poReceiveGoods')}
              </button>
            </div>
          )}

          {canReceive && showReceive && (
            <div className="border border-green-100 rounded-xl overflow-hidden">
              <div className="bg-green-50 dark:bg-green-500/10 px-4 py-3 border-b border-green-100">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">{t('poReceiveGoods')}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">{t('poReceiveHint')}</p>
              </div>
              <div className="divide-y divide-border">
                {po.items.map((item) => {
                  const units = poItemUnitOptions(item)
                  return (
                    <div key={item.id} className="px-4 py-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                      <div className="sm:col-span-4">
                        <p className="text-sm font-medium text-foreground">{poItemName(item)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('poOrderedReceived', {
                            ordered: formatPOQuantity(item, item.quantity_ordered, formatQuantity),
                            received: formatPOQuantity(item, item.quantity_received, formatQuantity),
                          })}
                        </p>
                        {costPreview(item)}
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-xs text-muted-foreground mb-1">{t('labelQuantity')} · {t('labelUnit')}</label>
                        {units.length > 1 && (
                          <SearchableSelect label={t('labelUnit')} value={unitOf(item).key} onChange={value => changeReceiveUnit(item, value)}
                            options={units.map(unit => ({ value: unit.key, label: unit.label }))}
                            clearable={false} size="sm" className="w-full" />
                        )}
                        <NumericInput
                          type="number"
                          min="0"
                          step="any"
                          className="w-full border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                          placeholder="0"
                          value={receiveQtys[item.id] ?? ''}
                          onChange={(e) =>
                            setReceiveQtys((p) => ({ ...p, [item.id]: e.target.value }))
                          }
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-xs text-muted-foreground mb-1">{t('poPricePerUnit')} ({unitOf(item).label})</label>
                        <NumericInput
                          type="number"
                          min="0" step="any"
                          className="w-full border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                          value={receiveCosts[item.id] ?? ''}
                          onChange={(e) =>
                            setReceiveCosts((p) => ({ ...p, [item.id]: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              {hasProducts && (
                <label className="flex items-start gap-3 px-4 py-3 border-t border-border cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-border accent-green-600"
                    checked={updateCost}
                    onChange={(e) => setUpdateCost(e.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-foreground">{t('poUpdateCost')}</span>
                    <span className="block text-xs text-muted-foreground">{t('poUpdateCostHint')}</span>
                  </span>
                </label>
              )}
              <div className="px-4 py-3 flex justify-end gap-2 border-t border-border">
                <button
                  onClick={() => setShowReceive(false)}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted"
                >
                  {t('actionCancel')}
                </button>
                <button
                  onClick={handleReceive}
                  disabled={receiveMut.isPending || !receiveValid}
                  className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
                >
                  {receiveMut.isPending ? t('saving') : t('poConfirmReceipt')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function PurchaseOrdersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [viewPoId, setViewPoId] = useState<string | null>(null)
  const [draftSuggestions, setDraftSuggestions] = useState<RestockSuggestion[]>([])
  const [draftSupplierId, setDraftSupplierId] = useState('')
  // Saklar "Pakai Purchase Order" mati: halaman yang sama menjadi "Pembelian"
  // — tombol tambah membuka Pembelian langsung, tab status disembunyikan
  // (semua pembelian sudah diterima). PO lama tetap tampil di daftar.
  const usePo = purchaseOrdersEnabled(useAuthStore((s) => s.user?.business))
  const direct = !usePo

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['purchase-orders', { page, statusFilter }],
    queryFn: () =>
      getPurchaseOrders({
        page,
        limit: 20,
        status: (usePo && statusFilter) || undefined,
      }),
  })

  const items: PurchaseOrder[] = data?.data?.data ?? []
  const total: number = data?.data?.pagination?.total ?? 0

  const { selected: activeOutlet } = useOutletStore()
  const { data: restockData, isLoading: restockLoading } = useQuery({
    queryKey: ['purchase-order-restock-suggestions', activeOutlet?.id ?? null],
    queryFn: () => getRestockSuggestions(activeOutlet?.id),
  })
  const restockSuggestions = useMemo(
    () => restockData?.data?.data ?? [],
    [restockData],
  )
  const suggestionGroups = useMemo(() => {
    const groups = new Map<string, RestockSuggestion[]>()
    for (const item of restockSuggestions) {
      const key = item.suggested_supplier_id ?? ''
      groups.set(key, [...(groups.get(key) ?? []), item])
    }
    return [...groups.entries()]
  }, [restockSuggestions])

  function createSuggestedDraft(supplierId: string, suggestions: RestockSuggestion[]) {
    setDraftSupplierId(supplierId)
    setDraftSuggestions(suggestions)
    setCreateOpen(true)
  }

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelPurchaseOrder(id),
    onSuccess: () => {
      toast.success(t('poCancelled'))
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePurchaseOrder(id),
    onSuccess: () => {
      toast.success(t('poDeleted'))
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header title={usePo ? t('navPurchaseOrders') : t('dpurTitle')} subtitle={usePo ? t('poPageSubtitle') : t('dpurPageSubtitle')} />

      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-5">
        {(restockLoading || restockSuggestions.length > 0) && (
          <section className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/20 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-100 dark:bg-amber-900/50 p-2 text-amber-700 dark:text-amber-300"><Sparkles size={18} /></div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-foreground">Saran restok otomatis</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Dihitung dari pemakaian/penjualan 30 hari, batas stok minimum, dan target persediaan 14 hari.</p>
                {restockLoading ? (
                  <div className="mt-3 h-10 rounded-lg bg-amber-100/70 dark:bg-amber-900/30 animate-pulse" />
                ) : (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {suggestionGroups.map(([supplierId, suggestions]) => (
                      <div key={supplierId || 'none'} className="rounded-lg border border-amber-200 dark:border-amber-900 bg-card p-3 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{suggestions[0]?.suggested_supplier_name ?? 'Supplier belum ditentukan'}</p>
                          <p className="text-xs text-muted-foreground">{suggestions.length} barang · estimasi {formatCurrency(suggestions.reduce((sum, item) => sum + item.recommended_quantity * item.estimated_unit_cost, 0))}</p>
                        </div>
                        <button onClick={() => createSuggestedDraft(supplierId, suggestions)} className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700">{direct ? t('dpurNew') : t('poCreateShort')}</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
        {/* Tabs + action */}
        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:flex-wrap sm:items-center flex-wrap">
          {usePo ? <div className="flex gap-1 bg-muted rounded-lg p-1">
            {tabs().map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setStatusFilter(tab.key); setPage(1) }}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-card text-blue-700 dark:text-blue-400 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div> : <div />}
          <button
            onClick={() => { setDraftSuggestions([]); setDraftSupplierId(''); setCreateOpen(true) }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            <Plus size={16} /> {direct ? t('dpurNew') : t('poCreateShort')}
          </button>
        </div>

        {/* Table */}
        <QueryErrorState error={error} onRetry={refetch} />
        {isLoading ? (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex gap-4 items-center">
                  <div className="h-4 bg-muted rounded animate-pulse w-28" />
                  <div className="h-4 bg-muted rounded animate-pulse flex-1" />
                  <div className="h-4 bg-muted rounded animate-pulse w-24" />
                  <div className="h-4 bg-muted rounded animate-pulse w-24" />
                  <div className="h-4 bg-muted rounded animate-pulse w-28" />
                  <div className="h-4 bg-muted rounded animate-pulse w-20" />
                  <div className="h-4 bg-muted rounded animate-pulse w-16" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="responsive-table w-full min-w-[720px] text-sm">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">{t('poNumber')}</th>
                  <th className="px-4 py-3 text-left">{t('navSuppliers')}</th>
                  <th className="px-4 py-3 text-left">{t('poOrderDateShort')}</th>
                  <th className="px-4 py-3 text-left">{t('poExpectedDateShort')}</th>
                  <th className="px-4 py-3 text-right">{t('labelTotal')}</th>
                  <th className="px-4 py-3 text-left">{t('labelStatus')}</th>
                  <th className="px-4 py-3 text-center">{t('labelActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!error && items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 max-w-xs mx-auto">
                        <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center border border-border">
                          <ShoppingCart size={26} className="text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{usePo ? t('poEmpty') : t('dpurEmpty')}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {usePo ? t('poEmptyBody') : t('dpurEmptyBody')}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {items.map((po) => (
                  <tr key={po.id} className="hover:bg-muted transition-colors">
                    <td data-label={t('poNumber')} className="px-4 py-3 font-mono text-sm font-semibold text-foreground">
                      {po.po_number}
                    </td>
                    <td data-label={t('navSuppliers')} className="px-4 py-3 text-muted-foreground">{po.supplier?.name ?? '—'}</td>
                    <td data-label={t('poOrderDateShort')} className="px-4 py-3 text-muted-foreground">{formatDate(po.order_date)}</td>
                    <td data-label={t('poExpectedDateShort')} className="px-4 py-3 text-muted-foreground">
                      {po.expected_date ? formatDate(po.expected_date) : '—'}
                    </td>
                    <td data-label={t('labelTotal')} className="px-4 py-3 text-right font-semibold text-foreground">
                      {formatCurrency(po.total_amount)}
                    </td>
                    <td data-label={t('labelStatus')} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        {/* Pembelian langsung selalu "Diterima" — yang berarti status bayarnya. */}
                        {!po.is_direct && <StatusBadge status={po.status} />}
                        {/* Status bayar hanya bila sudah ada tagihan (barang diterima). */}
                        {po.payment_status && po.payment_status !== 'none' && (
                          <Badge variant={PAYMENT_STATUS_VARIANT[po.payment_status]}
                            title={canPay(po.payable_balance ?? 0) ? `${t('htsBalance')} ${formatCurrency(po.payable_balance ?? 0)}` : undefined}>
                            {paymentStatusLabel(po.payment_status)}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td data-label={t('labelActions')} className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <ActionButton variant="edit" onClick={() => setViewPoId(po.id)}>{t('actionView')}</ActionButton>
                        {(po.status === 'draft' || po.status === 'ordered') && (
                          <ActionButton onClick={() => { if (confirm(`Batalkan PO "${po.po_number}"?`)) cancelMut.mutate(po.id) }}>{t('actionCancelOrder')}</ActionButton>
                        )}
                        {/* Boleh dihapus selama belum ada barang diterima — sama dengan aturan server. */}
                        {(po.status === 'draft' || po.status === 'ordered' || po.status === 'cancelled') && (
                          <DeleteButton onClick={() => { if (confirm(t('confirmDeleteNamed', { name: po.po_number }))) deleteMut.mutate(po.id) }} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} total={total} limit={20} onChange={setPage} />
      </div>

      {/* Create PO Modal */}
      {createOpen && (
        <CreatePOModal
          open
          direct={direct}
          suggestions={draftSuggestions}
          initialSupplierId={draftSupplierId}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['purchase-orders'] })
            qc.invalidateQueries({ queryKey: ['purchase-order-restock-suggestions'] })
            // Pembelian langsung menambah stok & hutang seketika (dan bisa
            // mengurangi saldo Kas & Rekening) — sama dengan sesudah terima+bayar.
            if (direct) {
              for (const key of ['purchase-report', 'supplier-payables', 'cash-accounts', 'cash-ledger', 'outlet-stocks']) {
                qc.invalidateQueries({ queryKey: [key] })
              }
            }
          }}
        />
      )}

      {/* View / Receive PO Modal */}
      <ViewPOModal
        poId={viewPoId}
        open={!!viewPoId}
        onClose={() => setViewPoId(null)}
        onMutated={() => qc.invalidateQueries({ queryKey: ['purchase-orders'] })}
      />
    </div>
  )
}
