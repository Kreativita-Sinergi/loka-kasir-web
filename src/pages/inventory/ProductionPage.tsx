import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Factory, Package, Plus, Wallet, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import ReportDateRange from '@/components/reports/ReportDateRange'
import ProductionFormModal from '@/components/production/ProductionFormModal'
import {
  getProductionOrder, getProductionOrders, productionDisplayName, voidProduction,
  type ProductionOrder,
} from '@/api/production'
import { defaultLedgerRange } from '@/lib/cashBook'
import { formatCurrency, formatDateTime, getErrorMessage } from '@/lib/utils'
import { formatQuantity } from '@/lib/money'
import { t } from '@/lib/i18n'

const LIMIT = 20

/**
 * Produksi / Perakitan — barang jadi dirakit dari resepnya sebelum dijual.
 * Daftar per periode, catat produksi baru, rincian, dan pembatalan (alasan
 * wajib; pergerakan stoknya dibalik, catatannya tetap ada).
 */
export default function ProductionPage() {
  const qc = useQueryClient()
  const [range, setRange] = useState(defaultLedgerRange)
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [voiding, setVoiding] = useState(false)

  const listQuery = useQuery({
    queryKey: ['production-orders', range.start, range.end, page],
    queryFn: () => getProductionOrders({ start_date: range.start || undefined, end_date: range.end || undefined, page, limit: LIMIT }),
    select: res => res.data.data,
  })
  const detailQuery = useQuery({
    queryKey: ['production-order', selectedId],
    queryFn: () => getProductionOrder(selectedId!),
    select: res => res.data.data,
    enabled: !!selectedId,
  })
  const list = listQuery.data
  const detail = detailQuery.data

  const closeDetail = () => { setSelectedId(null); setVoiding(false); setVoidReason('') }

  const voidMut = useMutation({
    mutationFn: () => voidProduction(selectedId!, voidReason.trim()),
    onSuccess: () => {
      toast.success(t('pdnVoided'))
      qc.invalidateQueries({ queryKey: ['production-orders'] })
      qc.invalidateQueries({ queryKey: ['production-order'] })
      qc.invalidateQueries({ queryKey: ['production-report'] })
      qc.invalidateQueries({ queryKey: ['outlet-stocks'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      closeDetail()
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  const reasonOk = voidReason.trim().length >= 3 && voidReason.trim().length <= 200

  const columns = [
    {
      key: 'produced_at', label: t('labelTime'),
      render: (row: ProductionOrder) => (
        <div>
          <p className="text-xs text-foreground">{formatDateTime(row.produced_at)}</p>
          <p className="text-xs font-mono text-muted-foreground">{row.number}</p>
        </div>
      ),
    },
    {
      key: 'product', label: t('pdnFieldProduct'),
      render: (row: ProductionOrder) => (
        <div className="min-w-0">
          <p className={`text-sm font-medium text-foreground ${row.status === 'voided' ? 'line-through' : ''}`}>
            {formatQuantity(row.qty_output)} × {productionDisplayName(row)}
          </p>
          <p className="text-xs text-muted-foreground">
            {[row.outlet_name, t('pdnComponentCount', { count: row.item_count }), row.created_by_name].filter(Boolean).join(' · ')}
          </p>
        </div>
      ),
    },
    {
      key: 'unit_cost', label: t('pdnUnitCost'), className: 'text-right',
      render: (row: ProductionOrder) => <span className="tabular-nums text-foreground">{formatCurrency(row.unit_cost)}</span>,
    },
    {
      key: 'total_cost', label: t('pdnTotalCost'), className: 'text-right',
      render: (row: ProductionOrder) => <span className="tabular-nums font-semibold text-foreground">{formatCurrency(row.total_cost)}</span>,
    },
    {
      key: 'status', label: t('labelStatus'),
      render: (row: ProductionOrder) => row.status === 'voided'
        ? <Badge variant="red">{t('pdnVoidedBadge')}</Badge>
        : <Badge variant="green">{t('pdnStatusDone')}</Badge>,
    },
  ]

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      <Header title={t('pdnTitle')} subtitle={t('pdnSubtitle')} />
      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <ReportDateRange from={range.start} to={range.end} onChange={({ from, to }) => { setRange({ start: from, end: to }); setPage(1) }} />
          <div className="ml-auto flex items-center gap-2">
            <Link to="/reports/production" className="px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition">
              {t('pdnReportTitle')}
            </Link>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition"
            >
              <Plus size={15} /> {t('pdnCreate')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard title={t('pdnStatOrders')} value={String(list?.summary.orders ?? 0)} icon={<Factory size={20} />} color="blue" loading={listQuery.isLoading} />
          <StatCard title={t('pdnStatQty')} value={formatQuantity(list?.summary.qty_output ?? 0)} icon={<Package size={20} />} color="green" loading={listQuery.isLoading} />
          <StatCard title={t('pdnStatCost')} value={formatCurrency(list?.summary.total_cost ?? 0)} icon={<Wallet size={20} />} color="purple" emphasis loading={listQuery.isLoading} />
          <StatCard title={t('pdnStatVoided')} value={String(list?.summary.voided ?? 0)} icon={<XCircle size={20} />} color="red" loading={listQuery.isLoading} />
        </div>

        <div className="bg-card rounded-2xl border border-border">
          <DataTable
            columns={columns as never[]}
            data={(list?.orders ?? []) as never[]}
            loading={listQuery.isLoading} error={listQuery.error} onRetry={listQuery.refetch}
            emptyMessage={t('pdnEmptyBody')}
            onRowClick={(row) => setSelectedId((row as ProductionOrder).id)}
          />
          <Pagination page={page} total={list?.pagination.total ?? 0} limit={LIMIT} onChange={setPage} />
        </div>
      </div>

      <ProductionFormModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <Modal open={!!selectedId} onClose={closeDetail} title={detail?.number ?? t('pdnTitle')} size="lg">
        {detailQuery.isLoading && <p className="py-8 text-center text-sm text-muted-foreground">{t('loading')}</p>}
        {detailQuery.error && <p className="py-8 text-center text-sm text-red-600">{getErrorMessage(detailQuery.error)}</p>}
        {detail && (
          <div className="space-y-4">
            {detail.status === 'voided' && (
              <div className="rounded-xl bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                {[t('pdnVoidedReason', { reason: detail.void_reason ?? '-' }), detail.voided_by_name, detail.voided_at && formatDateTime(detail.voided_at)].filter(Boolean).join(' · ')}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                [t('pdnFieldOutput'), `${formatQuantity(detail.qty_output)} × ${productionDisplayName(detail)}`],
                [t('pdnFieldDate'), formatDateTime(detail.produced_at)],
                [t('pdnFieldOutlet'), detail.outlet_name],
                [t('pdnFieldBy'), detail.created_by_name ?? '-'],
                [t('pdnTotalCost'), formatCurrency(detail.total_cost)],
                [t('pdnUnitCost'), formatCurrency(detail.unit_cost)],
                ...(detail.cost_after != null ? [[t('pdnCostChange'), `${detail.cost_before != null ? formatCurrency(detail.cost_before) : '-'} → ${formatCurrency(detail.cost_after)}`]] : []),
                ...(detail.notes ? [[t('pdnFieldNotes'), detail.notes]] : []),
              ].map(([k, v]) => (
                <div key={k} className="bg-muted rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">{k}</p>
                  <p className="font-medium">{v}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">{t('pdnComponents')}</p>
              <div className="divide-y divide-border rounded-xl border border-border">
                {(detail.items ?? []).map(it => (
                  <div key={it.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{it.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatQuantity(it.qty)}{it.unit_name ? ` ${it.unit_name}` : ''} · {t('pdnAtCost', { cost: formatCurrency(it.unit_cost) })}
                      </p>
                    </div>
                    <span className="tabular-nums font-semibold">{formatCurrency(it.total_cost)}</span>
                  </div>
                ))}
              </div>
            </div>
            {detail.status === 'done' && !voiding && (
              <button
                type="button"
                onClick={() => setVoiding(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 text-sm font-medium rounded-xl transition"
              >
                <Ban size={15} /> {t('pdnVoidAction')}
              </button>
            )}
            {voiding && (
              <div className="space-y-2 rounded-xl border border-red-200 dark:border-red-500/20 p-3">
                <p className="text-xs text-muted-foreground">{t('pdnVoidHint')}</p>
                <textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  maxLength={200}
                  rows={2}
                  placeholder={t('pdnVoidReason')}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-card text-foreground"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setVoiding(false)} className="flex-1 py-2 border border-border text-sm rounded-xl hover:bg-muted">{t('actionCancel')}</button>
                  <button
                    type="button"
                    disabled={!reasonOk || voidMut.isPending}
                    onClick={() => voidMut.mutate()}
                    className="flex-1 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl"
                  >
                    {voidMut.isPending ? t('loading') : t('pdnVoidAction')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
