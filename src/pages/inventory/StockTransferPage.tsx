import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Check, ArrowRight, X, GitBranch, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import RequireRole from '@/components/auth/RequireRole'
import {
  getStockTransfersByBusiness,
  createStockTransfer,
  approveStockTransfer,
  completeStockTransfer,
  cancelStockTransfer,
  getOutletStocksAll,
} from '@/api/stock'
import { getOutletsByBusiness } from '@/api/outlets'
import { useAuthStore } from '@/store/authStore'
import type { StockTransfer, Outlet } from '@/types'
import { formatDateTime, getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'

type TabStatus = '' | 'PENDING' | 'APPROVED' | 'COMPLETED' | 'CANCELED'

// Fungsi, bukan konstanta: isinya memanggil t(), dan konstanta modul
// dievaluasi sekali saat berkas dimuat — bahasanya akan terkunci pada yang
// kebetulan aktif saat itu dan tidak ikut berubah saat pengguna menggantinya.
const tabs = (): { label: string; value: TabStatus; count?: number }[] => [
  { label: t('labelAll'), value: '' },
  { label: t('statusPending'),   value: 'PENDING' },
  { label: t('labelApproved'),  value: 'APPROVED' },
  { label: t('labelCompleted'),    value: 'COMPLETED' },
  { label: t('statusCancelled'), value: 'CANCELED' },
]

function statusBadge(status: StockTransfer['status']) {
  const map: Record<string, { variant: 'blue' | 'green' | 'gray' | 'red' | 'yellow' | 'purple'; label: string }> = {
    PENDING:   { variant: 'yellow', label: t('statusPending') },
    APPROVED:  { variant: 'blue',   label: t('labelApproved') },
    COMPLETED: { variant: 'green',  label: t('labelCompleted') },
    CANCELED:  { variant: 'red',    label: t('statusCancelled') },
  }
  const s = map[status] ?? { variant: 'gray', label: status }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

export default function StockTransferPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const businessId = user?.business?.id ?? ''

  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<TabStatus>('')
  const [selected, setSelected] = useState<StockTransfer | null>(null)
  const [createModal, setCreateModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'complete' | 'cancel'; id: string } | null>(null)
  const [productSearch, setProductSearch] = useState('')

  // Form state
  const [form, setForm] = useState({
    from_outlet_id: '',
    to_outlet_id: '',
    product_id: '',
    quantity: 1 as number | string,
    notes: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['stock-transfers', { businessId, page, status: statusFilter }],
    queryFn: () => getStockTransfersByBusiness(businessId, {
      page,
      limit: 20,
      status: statusFilter || undefined,
    }),
    enabled: !!businessId,
  })

  const { data: outletsData } = useQuery({
    queryKey: ['outlets-selector', businessId],
    queryFn: () => getOutletsByBusiness(businessId, { limit: 50, page: 1 }),
    enabled: !!businessId,
    staleTime: 60_000,
  })

  // Fetch stocks for selection
  const { data: stocksData, isLoading: loadingStocks } = useQuery({
    queryKey: ['outlet-stocks-selector', form.from_outlet_id],
    queryFn: () => getOutletStocksAll(form.from_outlet_id),
    enabled: !!form.from_outlet_id,
  })

  const transfers = data?.data?.data ?? []
  const pagination = data?.data?.pagination
  const outlets: Outlet[] = outletsData?.data?.data ?? []
  const stocks = stocksData?.data?.data ?? []

  const filteredStocks = productSearch.trim()
    ? stocks.filter(s => s.product?.track_stock && (
        s.product?.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
        s.product?.sku?.toLowerCase().includes(productSearch.toLowerCase())
      ))
    : stocks.filter(s => s.product?.track_stock)

  const selectedProduct = stocks.find(s => s.product_id === form.product_id)

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['stock-transfers'] })
    qc.invalidateQueries({ queryKey: ['stock-movements'] })
  }

  const createMut = useMutation({
    mutationFn: () => createStockTransfer({ business_id: businessId, ...form, quantity: Number(form.quantity) }),
    onSuccess: () => { toast.success(t('transferCreated')); invalidate(); setCreateModal(false); resetForm() },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const approveMut = useMutation({
    mutationFn: (id: string) => approveStockTransfer(id),
    onSuccess: () => { toast.success(t('transferApproved')); invalidate(); setConfirmAction(null) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const completeMut = useMutation({
    mutationFn: (id: string) => completeStockTransfer(id),
    onSuccess: () => { toast.success(t('transferCompleted')); invalidate(); setConfirmAction(null) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelStockTransfer(id),
    onSuccess: () => { toast.success(t('transferCancelled')); invalidate(); setConfirmAction(null) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const resetForm = () => {
    setForm({ from_outlet_id: '', to_outlet_id: '', product_id: '', quantity: 1 as number | string, notes: '' })
    setProductSearch('')
  }

  const columns = [
    {
      key: 'transfer_code',
      label: t('labelCode'),
      render: (row: StockTransfer) => (
        <span className="font-mono text-sm font-semibold text-foreground">{row.transfer_code}</span>
      ),
    },
    {
      key: 'route',
      label: t('labelRoute'),
      render: (row: StockTransfer) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <GitBranch size={13} className="text-muted-foreground" />
          <span>{row.from_outlet?.name ?? '-'}</span>
          <ArrowRight size={13} className="text-muted-foreground" />
          <span>{row.to_outlet?.name ?? '-'}</span>
        </div>
      ),
    },
    {
      key: 'product',
      label: t('labelProduct'),
      render: (row: StockTransfer) => (
        <div className="flex items-center gap-2">
          <Package size={14} className="text-muted-foreground shrink-0" />
          <span className="text-sm text-foreground">{row.product?.name ?? '-'}</span>
        </div>
      ),
    },
    {
      key: 'quantity',
      label: t('labelQuantity'),
      render: (row: StockTransfer) => (
        <span className="text-sm font-semibold text-foreground">{row.quantity}</span>
      ),
    },
    {
      key: 'status',
      label: t('labelStatus'),
      render: (row: StockTransfer) => statusBadge(row.status),
    },
    {
      key: 'created_at',
      label: t('labelCreated'),
      render: (row: StockTransfer) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(row.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row: StockTransfer) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setSelected(row) }}
            className="p-1.5 text-muted-foreground hover:text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-500/10 rounded-lg transition"
          >
            <Eye size={14} />
          </button>
          {row.status === 'PENDING' && (
            <RequireRole allowedRoles={['Owner', 'Manager']}>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'approve', id: row.id }) }}
                className="p-1.5 text-muted-foreground hover:text-green-600 dark:text-green-400 hover:bg-green-50 dark:bg-green-500/10 rounded-lg transition"
                title={t('transferApprove')}
              >
                <Check size={14} />
              </button>
            </RequireRole>
          )}
          {row.status === 'APPROVED' && (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'complete', id: row.id }) }}
              className="p-1.5 text-muted-foreground hover:text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-500/10 rounded-lg transition"
              title={t('transferMarkDone')}
            >
              <ArrowRight size={14} />
            </button>
          )}
          {(row.status === 'PENDING' || row.status === 'APPROVED') && (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'cancel', id: row.id }) }}
              className="p-1.5 text-muted-foreground hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-500/10 rounded-lg transition"
              title={t('actionCancelOrder')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      ),
    },
  ]

  const confirmLabels = {
    approve:  { title: t('transferApproveTitle'), desc: t('transferApproveHint'), btn: 'Setujui', color: 'bg-green-500 hover:bg-green-600' },
    complete: { title: t('transferMarkDone'), desc: t('transferDoneHint'), btn: 'Selesaikan', color: 'bg-blue-500 hover:bg-blue-600' },
    cancel:   { title: t('transferCancelTitle'), desc: t('transferCancelHint'), btn: 'Batalkan', color: 'bg-red-500 hover:bg-red-600' },
  }

  const handleConfirm = () => {
    if (!confirmAction) return
    if (confirmAction.type === 'approve') approveMut.mutate(confirmAction.id)
    else if (confirmAction.type === 'complete') completeMut.mutate(confirmAction.id)
    else cancelMut.mutate(confirmAction.id)
  }

  const isPending = approveMut.isPending || completeMut.isPending || cancelMut.isPending

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('navStockTransfer')} subtitle={t('transferPageSubtitle')} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">

        {/* Tab strip */}
        <div className="bg-card rounded-2xl border border-border mb-4">
          <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-border">
            {tabs().map(tab => (
              <button
                key={tab.value}
                onClick={() => { setStatusFilter(tab.value); setPage(1) }}
                className={`px-4 py-2 text-sm font-medium rounded-t-xl transition -mb-px border-b-2 ${
                  statusFilter === tab.value
                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 bg-blue-50 dark:bg-blue-500/10'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-3 pb-2">
              <p className="text-sm text-muted-foreground">
                {t('totalColon')} <span className="font-semibold text-foreground">{pagination?.total ?? 0}</span>
              </p>
              <button
                onClick={() => setCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition"
              >
                <Plus size={15} />
                {t('transferNew')}
              </button>
            </div>
          </div>

          <DataTable
            columns={columns as never[]}
            data={transfers as never[]}
            loading={isLoading}
            onRowClick={(row) => setSelected(row as StockTransfer)}
          />
          <Pagination page={page} total={pagination?.total ?? 0} limit={20} onChange={setPage} />
        </div>
      </div>

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={t('transferDetailTitle')} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xl font-bold font-mono">{selected.transfer_code}</p>
              {statusBadge(selected.status)}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">{t('labelFromOutlet')}</p>
                <p className="font-medium">{selected.from_outlet?.name ?? '-'}</p>
              </div>
              <div className="bg-muted rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">{t('labelToOutlet')}</p>
                <p className="font-medium">{selected.to_outlet?.name ?? '-'}</p>
              </div>
              <div className="bg-muted rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">{t('labelProduct')}</p>
                <p className="font-medium">{selected.product?.name ?? '-'}</p>
              </div>
              <div className="bg-muted rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">{t('labelQuantity')}</p>
                <p className="font-medium text-lg">{selected.quantity}</p>
              </div>
              {selected.notes && (
                <div className="col-span-2 bg-muted rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">{t('labelNote')}</p>
                  <p className="font-medium">{selected.notes}</p>
                </div>
              )}
              <div className="bg-muted rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">{t('labelCreated')}</p>
                <p className="font-medium text-xs">{formatDateTime(selected.created_at)}</p>
              </div>
              {selected.approved_at && (
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">{t('labelApproved')}</p>
                  <p className="font-medium text-xs">{formatDateTime(selected.approved_at)}</p>
                </div>
              )}
              {selected.completed_at && (
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">{t('labelCompleted')}</p>
                  <p className="font-medium text-xs">{formatDateTime(selected.completed_at)}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              {selected.status === 'PENDING' && (
                <RequireRole allowedRoles={['Owner', 'Manager']}>
                  <button
                    onClick={() => { setSelected(null); setConfirmAction({ type: 'approve', id: selected.id }) }}
                    className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition"
                  >
                    {t('transferApprove')}
                  </button>
                </RequireRole>
              )}
              {selected.status === 'APPROVED' && (
                <button
                  onClick={() => { setSelected(null); setConfirmAction({ type: 'complete', id: selected.id }) }}
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition"
                >
                  {t('transferMarkDone')}
                </button>
              )}
              {(selected.status === 'PENDING' || selected.status === 'APPROVED') && (
                <button
                  onClick={() => { setSelected(null); setConfirmAction({ type: 'cancel', id: selected.id }) }}
                  className="flex-1 py-2.5 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-500/10 text-sm font-medium rounded-xl transition"
                >
                  {t('actionCancelOrder')}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal open={createModal} onClose={() => { setCreateModal(false); resetForm() }} title={t('transferCreateTitle')} size="sm">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('labelFromOutlet')}</label>
            <select
              value={form.from_outlet_id}
              onChange={(e) => setForm(f => ({ ...f, from_outlet_id: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('transferPickSource')}</option>
              {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('labelToOutlet')}</label>
            <select
              value={form.to_outlet_id}
              onChange={(e) => setForm(f => ({ ...f, to_outlet_id: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('transferPickDest')}</option>
              {outlets.filter(o => o.id !== form.from_outlet_id).map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('labelProduct')}</label>
            {!form.from_outlet_id ? (
              <div className="px-3 py-4 bg-muted border border-dashed border-border rounded-xl text-center">
                <p className="text-xs text-muted-foreground text-balance">{t('transferPickSourceFirst')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t('transferSearchProduct')}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {loadingStocks && (
                    <div className="absolute right-3 top-2.5">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                
                <div className="border border-border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {filteredStocks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">{loadingStocks ? t('loadingProducts') : t('stockNoProductFound')}</p>
                  ) : filteredStocks.map(s => (
                    <button
                      key={s.product_id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, product_id: s.product_id }))}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted transition ${form.product_id === s.product_id ? 'bg-blue-50 dark:bg-blue-500/10 border-l-2 border-blue-500' : ''}`}
                    >
                      {s.product?.image
                        ? <img src={s.product.image} className="w-7 h-7 rounded-lg object-cover shrink-0" alt="" />
                        : <div className="w-7 h-7 bg-muted rounded-lg flex items-center justify-center shrink-0"><Package size={12} className="text-muted-foreground" /></div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground capitalize truncate">{s.product?.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{s.product?.sku ?? '-'}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{t('labelStock')}: {s.quantity}</span>
                    </button>
                  ))}
                </div>

                {selectedProduct && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-sm text-blue-700 dark:text-blue-400">
                    <span className="font-medium capitalize">{selectedProduct.product?.name}</span>
                    <span className="text-blue-400">·</span>
                    <span>{t('transferStockAvailable')} <strong>{selectedProduct.quantity}</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('labelQuantity')}</label>
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('labelNoteOptional')}</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder={t('transferReasonPlaceholder')}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setCreateModal(false); resetForm() }} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted">{t('actionCancel')}</button>
            <button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || !form.from_outlet_id || !form.to_outlet_id || !form.product_id || Number(form.quantity) <= 0}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition"
            >
              {createMut.isPending ? 'Membuat...' : t('transferCreate')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Action Modal */}
      <Modal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction ? confirmLabels[confirmAction.type].title : ''}
        size="sm"
      >
        {confirmAction && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{confirmLabels[confirmAction.type].desc}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted">{t('actionCancel')}</button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className={`flex-1 py-2.5 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition ${confirmLabels[confirmAction.type].color}`}
              >
                {isPending ? 'Memproses...' : confirmLabels[confirmAction.type].btn}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
