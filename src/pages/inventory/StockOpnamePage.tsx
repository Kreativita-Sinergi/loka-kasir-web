import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Check, X, ClipboardCheck, Store, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import {
  getStockOpnamesByBusiness,
  getStockOpnameVariance,
  createStockOpname,
  postStockOpname,
  cancelStockOpname,
} from '@/api/stockOpname'
import { getOutletsByBusiness } from '@/api/outlets'
import { getCategories } from '@/api/library'
import { useAuthStore } from '@/store/authStore'
import type { StockOpname, StockOpnameItem, Outlet } from '@/types'
import { formatDateTime, getErrorMessage } from '@/lib/utils'
import { formatMoney, formatStockQuantity } from '@/lib/money'
import { t } from '@/lib/i18n'

type TabStatus = '' | 'COUNTING' | 'POSTED' | 'CANCELED'

const tabs = (): { label: string; value: TabStatus }[] => [
  { label: t('labelAll'), value: '' },
  { label: t('opnameStatusCounting'), value: 'COUNTING' },
  { label: t('opnameStatusPosted'), value: 'POSTED' },
  { label: t('opnameStatusCanceled'), value: 'CANCELED' },
]

function statusBadge(status: StockOpname['status']) {
  const map: Record<string, { variant: 'blue' | 'green' | 'gray' | 'red' | 'yellow'; label: string }> = {
    COUNTING: { variant: 'yellow', label: t('opnameStatusCounting') },
    POSTED: { variant: 'green', label: t('opnameStatusPosted') },
    CANCELED: { variant: 'red', label: t('opnameStatusCanceled') },
  }
  const s = map[status] ?? { variant: 'gray', label: status }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

/**
 * Barang kiloan menyimpan stoknya dalam GRAM, bukan dalam satuan jual.
 *
 * Tanpa penyesuaian ini, beras yang kurang 1,5 kg muncul sebagai "-1500" dan
 * pemilik yang membacanya akan mengira gudangnya kehilangan seribu lima ratus
 * karung.
 */
const qty = formatStockQuantity

function signed(
  value: number,
  isWeightBased?: boolean,
  unitName?: string | null,
  weightUnit?: string | null,
): string {
  const body = qty(Math.abs(value), isWeightBased, unitName, weightUnit)
  if (value === 0) return body
  return `${value > 0 ? '+' : '−'}${body}`
}

export default function StockOpnamePage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const businessId = user?.business?.id ?? ''

  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<TabStatus>('')
  const [selected, setSelected] = useState<StockOpname | null>(null)
  const [createModal, setCreateModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ type: 'post' | 'cancel'; id: string } | null>(null)

  const [form, setForm] = useState<{
    outlet_id: string
    scope_type: 'ALL' | 'CATEGORY'
    scope_ref_id: string
    notes: string
  }>({ outlet_id: '', scope_type: 'ALL', scope_ref_id: '', notes: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['stock-opnames', { businessId, page, status: statusFilter }],
    queryFn: () => getStockOpnamesByBusiness(businessId, {
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

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-selector'],
    queryFn: () => getCategories({ limit: 100, page: 1 }),
    enabled: createModal && form.scope_type === 'CATEGORY',
    staleTime: 60_000,
  })

  // Hanya baris berselisih yang ditarik untuk peninjauan: dari sepuluh ribu
  // barang yang dihitung, yang perlu diputuskan pemilik biasanya belasan.
  const { data: varianceData, isLoading: loadingVariance } = useQuery({
    queryKey: ['stock-opname-variance', selected?.id],
    queryFn: () => getStockOpnameVariance(selected!.id, { limit: 100, page: 1 }),
    enabled: !!selected,
  })

  const opnames = data?.data?.data ?? []
  const pagination = data?.data?.pagination
  const outlets: Outlet[] = outletsData?.data?.data ?? []
  const categories = categoriesData?.data?.data ?? []
  const varianceItems: StockOpnameItem[] = varianceData?.data?.data ?? []

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['stock-opnames'] })
    qc.invalidateQueries({ queryKey: ['stock-opname-variance'] })
    qc.invalidateQueries({ queryKey: ['stock-movements'] })
    qc.invalidateQueries({ queryKey: ['outlet-stocks'] })
  }

  const resetForm = () => setForm({ outlet_id: '', scope_type: 'ALL', scope_ref_id: '', notes: '' })

  const createMut = useMutation({
    mutationFn: () => createStockOpname({
      business_id: businessId,
      outlet_id: form.outlet_id,
      scope_type: form.scope_type,
      scope_ref_id: form.scope_type === 'CATEGORY' ? form.scope_ref_id : null,
      notes: form.notes || null,
    }),
    onSuccess: () => { toast.success(t('opnameCreated')); invalidate(); setCreateModal(false); resetForm() },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const postMut = useMutation({
    mutationFn: (id: string) => postStockOpname(id),
    onSuccess: () => { toast.success(t('opnamePosted')); invalidate(); setConfirmAction(null); setSelected(null) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelStockOpname(id),
    onSuccess: () => { toast.success(t('opnameCanceled')); invalidate(); setConfirmAction(null); setSelected(null) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const columns = [
    {
      key: 'opname_code',
      label: t('opnameCode'),
      render: (row: StockOpname) => (
        <span className="text-sm font-mono font-semibold text-foreground">{row.opname_code}</span>
      ),
    },
    {
      key: 'outlet',
      label: t('labelOutlet'),
      render: (row: StockOpname) => (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Store size={13} />
          <span>{row.outlet?.name ?? '-'}</span>
        </div>
      ),
    },
    {
      key: 'progress',
      label: t('opnameProgress'),
      render: (row: StockOpname) => {
        const { counted_items: counted, total_items: total } = row.summary
        const ratio = total > 0 ? Math.round((counted / total) * 100) : 0
        return (
          <div className="min-w-[120px]">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${ratio}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">
              {t('opnameCounted', { counted: String(counted), total: String(total) })}
            </span>
          </div>
        )
      },
    },
    {
      key: 'variance',
      label: t('opnameVariance'),
      render: (row: StockOpname) => {
        const value = row.summary.variance_value
        if (row.summary.variance_items === 0) {
          return <span className="text-sm text-muted-foreground">—</span>
        }
        return (
          <div>
            <span className={`text-sm font-semibold ${value < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {value < 0 ? '−' : '+'}{formatMoney(Math.abs(value))}
            </span>
            <p className="text-xs text-muted-foreground">
              {t('opnameVarianceItems', { count: String(row.summary.variance_items) })}
            </p>
          </div>
        )
      },
    },
    {
      key: 'status',
      label: t('labelStatus'),
      render: (row: StockOpname) => statusBadge(row.status),
    },
    {
      key: 'started_at',
      label: t('labelCreated'),
      render: (row: StockOpname) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(row.started_at)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row: StockOpname) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setSelected(row) }}
            className="p-1.5 text-muted-foreground hover:text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-500/10 rounded-lg transition"
          >
            <Eye size={14} />
          </button>
          {row.status === 'COUNTING' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'post', id: row.id }) }}
                className="p-1.5 text-muted-foreground hover:text-green-600 dark:text-green-400 hover:bg-green-50 dark:bg-green-500/10 rounded-lg transition"
                title={t('opnamePost')}
              >
                <Check size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'cancel', id: row.id }) }}
                className="p-1.5 text-muted-foreground hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-500/10 rounded-lg transition"
                title={t('actionCancel')}
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  const canSubmitCreate = !!form.outlet_id && (form.scope_type === 'ALL' || !!form.scope_ref_id)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('opnameTitle')} subtitle={t('opnameSubtitle')} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">

        <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl px-4 py-3 mb-4">
          <Smartphone size={15} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-900 dark:text-blue-200">{t('opnameCountOnPhone')}</p>
        </div>

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
                {t('opnameNew')}
              </button>
            </div>
          </div>

          <DataTable
            columns={columns as never[]}
            data={opnames as never[]}
            loading={isLoading}
            onRowClick={(row) => setSelected(row as StockOpname)}
          />
          <Pagination page={page} total={pagination?.total ?? 0} limit={20} onChange={setPage} />
        </div>
      </div>

      {/* Detail: ringkasan + baris berselisih */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={t('opnameTitle')} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold font-mono">{selected.opname_code}</p>
                <p className="text-sm text-muted-foreground">{selected.outlet?.name ?? '-'}</p>
              </div>
              {statusBadge(selected.status)}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-muted rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">{t('opnameProgress')}</p>
                <p className="font-semibold">{selected.summary.counted_items}/{selected.summary.total_items}</p>
              </div>
              <div className="bg-muted rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">{t('opnameSurplus')}</p>
                <p className="font-semibold text-green-600 dark:text-green-400">+{selected.summary.surplus_qty}</p>
              </div>
              <div className="bg-muted rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">{t('opnameShortage')}</p>
                <p className="font-semibold text-red-600 dark:text-red-400">−{selected.summary.shortage_qty}</p>
              </div>
              <div className="bg-muted rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">{t('opnameVarianceValue')}</p>
                <p className={`font-semibold ${selected.summary.variance_value < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {selected.summary.variance_value < 0 ? '−' : '+'}{formatMoney(Math.abs(selected.summary.variance_value))}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">{t('opnameStartedBy')}</p>
                <p className="font-medium">{selected.starter?.business?.owner_name ?? '-'}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(selected.started_at)}</p>
              </div>
              {selected.posted_at && (
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">{t('opnamePostedBy')}</p>
                  <p className="font-medium">{selected.poster?.business?.owner_name ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(selected.posted_at)}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">{t('opnameOnlyVariance')}</p>
              {loadingVariance ? (
                <p className="text-sm text-muted-foreground py-4">{t('loading')}</p>
              ) : varianceItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">{t('opnameNoVariance')}</p>
              ) : (
                <div className="max-h-72 overflow-y-auto border border-border rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left font-medium px-3 py-2">{t('labelProduct')}</th>
                        <th className="text-right font-medium px-3 py-2">{t('opnameSystemQty')}</th>
                        <th className="text-right font-medium px-3 py-2">{t('opnameCountedQty')}</th>
                        <th className="text-right font-medium px-3 py-2">{t('opnameDifference')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {varianceItems.map(item => (
                        <tr key={item.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2">{item.product?.name ?? '-'}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {qty(item.system_quantity, item.product?.is_weight_based, item.product?.unit?.name, item.product?.weight_unit)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {item.counted_quantity === null
                              ? <span className="text-muted-foreground">{t('opnameNotCounted')}</span>
                              : qty(item.counted_quantity, item.product?.is_weight_based, item.product?.unit?.name, item.product?.weight_unit)}
                          </td>
                          <td className={`px-3 py-2 text-right font-semibold ${item.difference < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {signed(item.difference, item.product?.is_weight_based, item.product?.unit?.name, item.product?.weight_unit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {selected.status === 'COUNTING' && (
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setConfirmAction({ type: 'post', id: selected.id })}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition"
                >
                  <ClipboardCheck size={15} />
                  {t('opnamePost')}
                </button>
                <button
                  onClick={() => setConfirmAction({ type: 'cancel', id: selected.id })}
                  className="px-4 py-2.5 border border-border text-sm font-medium rounded-xl hover:bg-muted transition"
                >
                  {t('actionCancel')}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Mulai sesi */}
      <Modal open={createModal} onClose={() => { setCreateModal(false); resetForm() }} title={t('opnameNew')}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t('labelOutlet')}</label>
            <select
              value={form.outlet_id}
              onChange={(e) => setForm(f => ({ ...f, outlet_id: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm"
            >
              <option value="">{t('opnameSelectOutlet')}</option>
              {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t('opnameScope')}</label>
            <div className="grid grid-cols-2 gap-2">
              {(['ALL', 'CATEGORY'] as const).map(scope => (
                <button
                  key={scope}
                  onClick={() => setForm(f => ({ ...f, scope_type: scope, scope_ref_id: '' }))}
                  className={`px-3 py-2 text-sm rounded-xl border transition ${
                    form.scope_type === scope
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  {scope === 'ALL' ? t('opnameScopeAll') : t('opnameScopeCategory')}
                </button>
              ))}
            </div>
          </div>

          {form.scope_type === 'CATEGORY' && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('labelCategory')}</label>
              <select
                value={form.scope_ref_id}
                onChange={(e) => setForm(f => ({ ...f, scope_ref_id: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm"
              >
                <option value="">{t('opnameSelectCategory')}</option>
                {categories.map((c: { id: string; name: string }) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t('labelNote')}</label>
            <input
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm"
            />
          </div>

          <button
            onClick={() => createMut.mutate()}
            disabled={!canSubmitCreate || createMut.isPending}
            className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
          >
            {createMut.isPending ? t('loading') : t('opnameNew')}
          </button>
        </div>
      </Modal>

      {/* Konfirmasi */}
      <Modal open={!!confirmAction} onClose={() => setConfirmAction(null)} title={confirmAction?.type === 'post' ? t('opnamePostConfirm') : t('opnameCancelConfirm')}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {confirmAction?.type === 'post' ? t('opnamePostWarning') : t('opnameCancelWarning')}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!confirmAction) return
                if (confirmAction.type === 'post') postMut.mutate(confirmAction.id)
                else cancelMut.mutate(confirmAction.id)
              }}
              disabled={postMut.isPending || cancelMut.isPending}
              className={`flex-1 px-4 py-2.5 text-white text-sm font-medium rounded-xl transition disabled:opacity-50 ${
                confirmAction?.type === 'post' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {confirmAction?.type === 'post' ? t('opnamePost') : t('actionCancel')}
            </button>
            <button
              onClick={() => setConfirmAction(null)}
              className="px-4 py-2.5 border border-border text-sm font-medium rounded-xl hover:bg-muted transition"
            >
              {t('actionClose')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
