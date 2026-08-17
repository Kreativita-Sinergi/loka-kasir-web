import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ArrowDownToLine, SlidersHorizontal, Package, AlertTriangle, TrendingUp, Upload, Flame } from 'lucide-react'
import { EditButton, DeleteButton } from '@/components/ui/RowActions'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import StatCard from '@/components/ui/StatCard'
import RawMaterialImportModal from '@/components/raw-materials/RawMaterialImportModal'
import LowStockAlert from '@/components/inventory/LowStockAlert'
import {
  getRawMaterials,
  getRawMaterialStats,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  stockInRawMaterial,
  adjustRawMaterialStock,
  recordRawMaterialWaste,
} from '@/api/rawMaterials'
import type { CreateRawMaterialPayload, StockInPayload, AdjustStockPayload, WastePayload } from '@/api/rawMaterials'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import type { RawMaterial } from '@/types'
import { formatQuantity } from '@/lib/money'
import { t } from '@/lib/i18n'

// ─── Stock status helper ─────────────────────────────────────────────────────

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) return <Badge variant="red">{t('stockOut')}</Badge>
  if (stock <= 5) return <Badge variant="yellow">{t('stockLow')}</Badge>
  return <Badge variant="green">{t('labelAvailable')}</Badge>
}

// ─── Sub-form for stock-in ──────────────────────────────────────────────────

function StockInForm({
  item,
  onSubmit,
  loading,
}: {
  item: RawMaterial
  onSubmit: (data: StockInPayload) => void
  loading: boolean
}) {
  const [qty, setQty] = useState('')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')

  const newAvgPreview = useMemo(() => {
    const q = parseFloat(qty)
    const c = parseFloat(cost)
    if (!q || q <= 0 || isNaN(c)) return null
    const totalStock = item.stock + q
    return (item.stock * item.avg_cost + q * c) / totalStock
  }, [qty, cost, item.stock, item.avg_cost])

  return (
    <div className="space-y-4">
      {/* Current state info */}
      <div className="bg-muted rounded-lg px-4 py-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-muted-foreground">{t('rmCurrentStock')}</p>
          <p className="font-semibold text-foreground mt-0.5">
            {formatQuantity(item.stock)} {item.unit?.alias ?? item.unit?.name ?? ''}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t('rmCurrentAvgCost')}</p>
          <p className="font-semibold text-blue-700 dark:text-blue-400 mt-0.5">{formatCurrency(item.avg_cost)}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">{t('rmQtyIn')}</label>
        <input
          type="number"
          min="0.001"
          step="0.001"
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0"
          value={qty}
          onChange={e => setQty(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">{t('rmPurchasePricePerUnit')}</label>
        <input
          type="number"
          min="0"
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0"
          value={cost}
          onChange={e => setCost(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">{t('labelNoteOptional')}</label>
        <input
          type="text"
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t('rmNotesPlaceholder')}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      {/* Moving average HPP preview */}
      {newAvgPreview !== null && (
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="text-xs">
            <p className="text-blue-700 dark:text-blue-400 font-semibold">{t('rmNewAvgCost')}</p>
            <p className="text-muted-foreground mt-0.5">{t('rmMovingAverage')}</p>
          </div>
          <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{formatCurrency(newAvgPreview)}</p>
        </div>
      )}

      <button
        type="button"
        disabled={loading || !qty || !cost}
        onClick={() => onSubmit({ quantity: parseFloat(qty), unit_cost: parseFloat(cost), notes: notes || null })}
        className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Menyimpan...' : t('rmAddStock')}
      </button>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function RawMaterialsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formModal, setFormModal] = useState<{ open: boolean; item?: RawMaterial }>({ open: false })
  const [stockInModal, setStockInModal] = useState<{ open: boolean; item?: RawMaterial }>({ open: false })
  const [adjustModal, setAdjustModal] = useState<{ open: boolean; item?: RawMaterial }>({ open: false })
  const [wasteModal, setWasteModal] = useState<{ open: boolean; item?: RawMaterial }>({ open: false })
  const [wasteQty, setWasteQty] = useState('')
  const [wasteNotes, setWasteNotes] = useState('')
  const [newQty, setNewQty] = useState('')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [formData, setFormData] = useState<CreateRawMaterialPayload>({ name: '' })
  const [showImportModal, setShowImportModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['raw-materials', { page, search }],
    queryFn: () => getRawMaterials({ page, limit: 20, search: search || undefined }),
  })

  const items: RawMaterial[] = data?.data?.data ?? []
  const total: number = data?.data?.pagination?.total ?? 0

  // Statistik dihitung di DB (COUNT) — ringan & konsisten walau data besar.
  const statsAll = useQuery({
    queryKey: ['raw-materials-stats'],
    queryFn: () => getRawMaterialStats(),
    staleTime: 120_000,
    select: (res) => {
      const s = res.data?.data
      return {
        total: s?.total ?? 0,
        outOfStock: s?.out_of_stock ?? 0,
        lowStock: s?.low_stock ?? 0,
      }
    },
  })

  const createMut = useMutation({
    mutationFn: (payload: CreateRawMaterialPayload) => createRawMaterial(payload),
    onSuccess: () => {
      toast.success(t('rmCreated'))
      qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('raw-materials') })
      setFormModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateRawMaterialPayload }) => updateRawMaterial(id, payload),
    onSuccess: () => {
      toast.success(t('rmUpdated'))
      qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('raw-materials') })
      setFormModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteRawMaterial(id),
    onSuccess: () => {
      toast.success(t('rmDeleted'))
      qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('raw-materials') })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const stockInMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: StockInPayload }) => stockInRawMaterial(id, payload),
    onSuccess: () => {
      toast.success(t('stockAdded'))
      qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('raw-materials') })
      setStockInModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const adjustMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdjustStockPayload }) => adjustRawMaterialStock(id, payload),
    onSuccess: () => {
      toast.success(t('stockAdjusted'))
      qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('raw-materials') })
      setAdjustModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const wasteMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WastePayload }) => recordRawMaterialWaste(id, payload),
    onSuccess: () => {
      toast.success(t('wasteRecorded'))
      qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('raw-materials') })
      setWasteModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  function openCreate() {
    setFormData({ name: '' })
    setFormModal({ open: true })
  }

  function openEdit(item: RawMaterial) {
    setFormData({ name: item.name, sku: item.sku ?? undefined, unit_id: item.unit?.id ?? undefined, min_stock: item.min_stock ?? 0 })
    setFormModal({ open: true, item })
  }

  function handleFormSubmit() {
    if (!formData.name.trim()) return
    if (formModal.item) {
      updateMut.mutate({ id: formModal.item.id, payload: formData })
    } else {
      createMut.mutate(formData)
    }
  }

  return (
    <>
      <Header title={t('navRawMaterials')} subtitle={t('rmPageSubtitle')} />

      <div className="p-6 space-y-5">
        {/* Summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title={t('rmTotal')}
            value={statsAll.data?.total ?? total}
            icon={<Package size={18} />}
            color="blue"
            loading={statsAll.isLoading}
          />
          <StatCard
            title={t('rmOutOfStock')}
            value={statsAll.data?.outOfStock ?? 0}
            icon={<AlertTriangle size={18} />}
            color="orange"
            subtitle={t('rmRefillSoon')}
            loading={statsAll.isLoading}
          />
          <StatCard
            title={t('rmLowStock')}
            value={statsAll.data?.lowStock ?? 0}
            icon={<TrendingUp size={18} />}
            color="purple"
            subtitle={t('rmLowStockHint')}
            loading={statsAll.isLoading}
          />
        </div>

        {/* Low stock alert banner */}
        <LowStockAlert />

        {/* Filter & actions bar */}
        <div className="flex items-center justify-between gap-3">
          <input
            className="border border-border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('rmSearch')}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 border border-border text-muted-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-muted"
            >
              <Upload size={16} /> {t('importFromCsv')}
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              <Plus size={16} /> {t('rmAdd')}
            </button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex gap-4 items-center">
                  <div className="h-4 bg-muted rounded animate-pulse flex-1" />
                  <div className="h-4 bg-muted rounded animate-pulse w-20" />
                  <div className="h-4 bg-muted rounded animate-pulse w-16" />
                  <div className="h-4 bg-muted rounded animate-pulse w-24" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">{t('labelName')}</th>
                  <th className="px-4 py-3 text-left">{t('labelSku')}</th>
                  <th className="px-4 py-3 text-left">{t('labelUnit')}</th>
                  <th className="px-4 py-3 text-right">{t('labelStock')}</th>
                  <th className="px-4 py-3 text-left">{t('labelStatus')}</th>
                  <th className="px-4 py-3 text-right">{t('rmAvgCost')}</th>
                  <th className="px-4 py-3 text-center">{t('labelActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 max-w-xs mx-auto">
                        <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center border border-border">
                          <Package size={26} className="text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{t('rmEmpty')}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('rmEmptyBody')}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-muted transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{item.sku ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.unit?.alias ?? item.unit?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.is_low_stock && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:text-orange-400">
                            <AlertTriangle size={11} />
                            {t('rmLowStock')}
                          </span>
                        )}
                        {formatQuantity(item.stock)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StockBadge stock={item.stock} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.avg_cost > 0
                        ? <span className="font-semibold text-blue-700 dark:text-blue-400">{formatCurrency(item.avg_cost)}</span>
                        : <span className="text-muted-foreground text-xs italic">{t('rmNoPurchases')}</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          title={t('rmStockIn')}
                          onClick={() => setStockInModal({ open: true, item })}
                          className="p-1.5 rounded hover:bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400"
                        >
                          <ArrowDownToLine size={14} />
                        </button>
                        <button
                          title={t('rmAdjustStock')}
                          onClick={() => { setNewQty(String(item.stock)); setAdjustNotes(''); setAdjustModal({ open: true, item }) }}
                          className="p-1.5 rounded hover:bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400"
                        >
                          <SlidersHorizontal size={14} />
                        </button>
                        <button
                          title={t('rmRecordWaste')}
                          onClick={() => { setWasteQty(''); setWasteNotes(''); setWasteModal({ open: true, item }) }}
                          className="p-1.5 rounded hover:bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400"
                        >
                          <Flame size={14} />
                        </button>
                        <EditButton onClick={() => openEdit(item)} />
                        <DeleteButton onClick={() => { if (confirm(t('rmDeleteConfirm'))) deleteMut.mutate(item.id) }} />
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

      {/* CSV Import Modal */}
      {showImportModal && (
        <RawMaterialImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('raw-materials') })
          }}
        />
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={formModal.open}
        onClose={() => setFormModal({ open: false })}
        title={formModal.item ? t('rmEdit') : t('rmAdd')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('labelName')} <span className="text-red-500 dark:text-red-400">*</span></label>
            <input
              type="text"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('rmNameExample')}
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('skuOptional')}</label>
            <input
              type="text"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('rmSkuExample')}
              value={formData.sku ?? ''}
              onChange={e => setFormData(p => ({ ...p, sku: e.target.value || null }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('rmMinStock')}</label>
            <input
              type="number"
              min="0"
              step="0.001"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('rmMinStockPlaceholder')}
              value={formData.min_stock ?? ''}
              onChange={e => setFormData(p => ({ ...p, min_stock: e.target.value === '' ? null : parseFloat(e.target.value) }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setFormModal({ open: false })} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">{t('actionCancel')}</button>
            <button
              onClick={handleFormSubmit}
              disabled={createMut.isPending || updateMut.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {createMut.isPending || updateMut.isPending ? 'Menyimpan...' : t('actionSave')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Stock In Modal */}
      <Modal
        open={stockInModal.open}
        onClose={() => setStockInModal({ open: false })}
        title={t('rawStockInTitle', { name: stockInModal.item?.name ?? '' })}
      >
        {stockInModal.item && (
          <StockInForm
            item={stockInModal.item}
            loading={stockInMut.isPending}
            onSubmit={payload => stockInMut.mutate({ id: stockInModal.item!.id, payload })}
          />
        )}
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        open={adjustModal.open}
        onClose={() => setAdjustModal({ open: false })}
        title={t('rawAdjustTitle', { name: adjustModal.item?.name ?? '' })}
      >
        {adjustModal.item && (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg px-4 py-3 text-xs">
              <p className="text-muted-foreground">{t('rmRecordedStock')}</p>
              <p className="font-bold text-foreground text-base mt-0.5">
                {formatQuantity(adjustModal.item.stock)}{' '}
                <span className="font-normal text-muted-foreground">{adjustModal.item.unit?.alias ?? adjustModal.item.unit?.name ?? ''}</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('rmActualStock')}</label>
              <input
                type="number"
                min="0"
                step="0.001"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newQty}
                onChange={e => setNewQty(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('labelNoteOptional')}</label>
              <input
                type="text"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('rmAdjustReasonPlaceholder')}
                value={adjustNotes}
                onChange={e => setAdjustNotes(e.target.value)}
              />
            </div>
            {newQty !== '' && parseFloat(newQty) !== adjustModal.item.stock && (
              <div className={`rounded-lg px-4 py-3 text-xs flex items-center gap-2 ${parseFloat(newQty) < adjustModal.item.stock ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-100' : 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-100'}`}>
                <AlertTriangle size={14} className="shrink-0" />
                {parseFloat(newQty) < adjustModal.item.stock
                  ? t('stockWillDecrease', {
                      amount: formatQuantity(adjustModal.item.stock - parseFloat(newQty)),
                    })
                  : t('stockWillIncrease', {
                      amount: formatQuantity(parseFloat(newQty) - adjustModal.item.stock),
                    })
                }
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setAdjustModal({ open: false })} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">{t('actionCancel')}</button>
              <button
                onClick={() => adjustMut.mutate({ id: adjustModal.item!.id, payload: { new_quantity: parseFloat(newQty), notes: adjustNotes || undefined } })}
                disabled={adjustMut.isPending || newQty === ''}
                className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-semibold"
              >
                {adjustMut.isPending ? t('saving') : t('actionAdjust')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Waste Modal */}
      <Modal
        open={wasteModal.open}
        onClose={() => setWasteModal({ open: false })}
        title={`Catat Pemborosan/Sisa — ${wasteModal.item?.name}`}
      >
        {wasteModal.item && (
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 rounded-lg px-4 py-3 text-xs">
              <p className="text-muted-foreground">{t('rmCurrentStock')}</p>
              <p className="font-bold text-foreground text-base mt-0.5">
                {formatQuantity(wasteModal.item.stock)}{' '}
                <span className="font-normal text-muted-foreground">{wasteModal.item.unit?.alias ?? wasteModal.item.unit?.name ?? ''}</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('rmWasteQty')} <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="number"
                min="0.001"
                step="0.001"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="0"
                value={wasteQty}
                onChange={e => setWasteQty(e.target.value)}
              />
              {wasteQty !== '' && parseFloat(wasteQty) > wasteModal.item.stock && (
                <p className="text-red-500 dark:text-red-400 text-xs mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} className="shrink-0" />
                  Jumlah waste melebihi stok tersedia ({formatQuantity(wasteModal.item.stock)})
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('labelNoteOptional')}</label>
              <input
                type="text"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder={t('rmWasteReasonPlaceholder')}
                value={wasteNotes}
                onChange={e => setWasteNotes(e.target.value)}
              />
            </div>
            {wasteQty !== '' && parseFloat(wasteQty) > 0 && parseFloat(wasteQty) <= wasteModal.item.stock && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 rounded-lg px-4 py-3 text-xs flex items-center justify-between">
                <div>
                  <p className="text-red-700 dark:text-red-400 font-semibold">{t('rmStockAfterWaste')}</p>
                  <p className="text-muted-foreground mt-0.5">{t('rmStockRemaining')}</p>
                </div>
                <p className="text-lg font-bold text-red-700 dark:text-red-400">
                  {formatQuantity(wasteModal.item.stock - parseFloat(wasteQty))}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setWasteModal({ open: false })} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">{t('actionCancel')}</button>
              <button
                onClick={() => wasteMut.mutate({ id: wasteModal.item!.id, payload: { quantity: parseFloat(wasteQty), notes: wasteNotes || null } })}
                disabled={
                  wasteMut.isPending ||
                  wasteQty === '' ||
                  parseFloat(wasteQty) <= 0 ||
                  parseFloat(wasteQty) > wasteModal.item.stock
                }
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold"
              >
                {wasteMut.isPending ? 'Menyimpan...' : t('rmRecordWasteAction')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
