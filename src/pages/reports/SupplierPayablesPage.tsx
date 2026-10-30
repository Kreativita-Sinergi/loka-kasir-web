import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Download, Info, Receipt, Truck, Wallet } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import QueryErrorState from '@/components/ui/QueryErrorState'
import { DataTable } from '@/components/ui/Table'
import {
  getPayablesReport, getSupplierPayable, type PayableAging, type SupplierPayable,
} from '@/api/purchasePayables'
import { formatCurrency, formatDate } from '@/lib/utils'
import { formatQuantity } from '@/lib/money'
import { exportToCSV, csvFilename } from '@/lib/exportUtils'
import { t } from '@/lib/i18n'
import {
  AGING_BUCKETS, PAYMENT_STATUS_VARIANT, agingTotal, payablesCsvRows, paymentStatusLabel, supplierLabel,
} from '@/lib/purchasePayables'

const exportButtonClass =
  'flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted disabled:opacity-40 transition shrink-0'

// Makin lama lewat jatuh tempo, makin merah.
const BUCKET_BAR = ['bg-success', 'bg-warning', 'bg-orange-500', 'bg-destructive', 'bg-destructive']

/** Lima ember umur hutang sebagai baris berbilah. */
function AgingBars({ aging }: { aging: PayableAging }) {
  const total = agingTotal(aging)
  return (
    <div className="space-y-2">
      {AGING_BUCKETS.map((b, i) => (
        <div key={b.key} className="flex items-center gap-3 text-sm">
          <span className="w-32 shrink-0 text-xs text-muted-foreground">{t(b.label)}</span>
          <div className="h-2 flex-1 rounded bg-muted overflow-hidden">
            <div className={`h-full ${BUCKET_BAR[i]}`} style={{ width: `${total > 0 ? (aging[b.key] / total) * 100 : 0}%` }} />
          </div>
          <span className={`w-32 shrink-0 text-right font-medium ${i > 0 && aging[b.key] > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
            {formatCurrency(aging[b.key])}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * Hutang Supplier — sisa hutang dari barang yang sudah diterima, per supplier,
 * dengan umur lewat jatuh tempo. Klik supplier untuk kartu hutangnya.
 */
export default function SupplierPayablesPage() {
  const [selected, setSelected] = useState<SupplierPayable | null>(null)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['supplier-payables'],
    queryFn: () => getPayablesReport(),
    select: res => res.data.data,
  })
  const suppliers = data?.suppliers ?? []

  const columns = [
    {
      key: 'supplier_name',
      label: t('htsSupplierCount'),
      render: (r: SupplierPayable) => (
        <div>
          <p className={`text-sm font-medium ${r.supplier_name ? 'text-foreground' : 'text-muted-foreground italic'}`}>{supplierLabel(r.supplier_name)}</p>
          {r.oldest_due_date && <p className="text-xs text-muted-foreground">{t('htsOldestDue')}: {formatDate(r.oldest_due_date)}</p>}
        </div>
      ),
    },
    { key: 'open_order_count', label: t('htsColOrders'), className: 'text-right', render: (r: SupplierPayable) => <span className="text-sm text-muted-foreground">{formatQuantity(r.open_order_count)}</span> },
    ...AGING_BUCKETS.map((b, i) => ({
      key: b.key,
      label: t(b.label),
      className: 'text-right',
      render: (r: SupplierPayable) => (
        <span className={`text-sm ${i > 0 && r.aging[b.key] > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
          {r.aging[b.key] ? formatCurrency(r.aging[b.key]) : '—'}
        </span>
      ),
    })),
    { key: 'balance', label: t('htsBalance'), className: 'text-right', render: (r: SupplierPayable) => <span className="text-sm font-semibold text-foreground">{formatCurrency(r.balance)}</span> },
  ]

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header title={t('navSupplierPayables')} subtitle={t('htsSubtitle')} />

      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title={t('htsTotal')} value={formatCurrency(data?.total_balance ?? 0)} icon={<Wallet size={18} />} color="blue" loading={isLoading} emphasis />
          <StatCard title={t('htsOverdue')} value={formatCurrency(data?.total_overdue ?? 0)} icon={<AlertTriangle size={18} />} color="red" loading={isLoading} />
          <StatCard title={t('htsSupplierCount')} value={formatQuantity(data?.supplier_count ?? 0)} icon={<Truck size={18} />} color="green" loading={isLoading} />
          <StatCard title={t('htsOpenOrders')} value={formatQuantity(data?.open_order_count ?? 0)} icon={<Receipt size={18} />} color="purple" loading={isLoading} />
        </div>

        {data && (
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-sm font-semibold text-foreground mb-3">{t('htsAging')}</p>
            <AgingBars aging={data.aging} />
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
            <p className="w-full min-w-0 sm:w-auto sm:flex-1 text-sm font-semibold text-foreground">{t('htsSupplierCount')}</p>
            <button type="button" onClick={() => data && exportToCSV(payablesCsvRows(data), csvFilename('hutang-supplier'))}
              disabled={!suppliers.length} className={exportButtonClass}>
              <Download size={14} />
              {t('exportCsv')}
            </button>
          </div>
          <DataTable
            columns={columns as never[]}
            data={suppliers.map(s => ({ ...s, id: s.supplier_id ?? 'none' })) as never[]}
            loading={isLoading} error={error} onRetry={refetch}
            emptyMessage={t('htsEmpty')}
            onRowClick={row => setSelected(row as unknown as SupplierPayable)}
          />
        </div>

        <div className="flex gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">{t('htsAsOfNote')}</p>
        </div>
      </div>

      {selected && <SupplierPayableModal supplier={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

/** Kartu hutang satu supplier: PO yang belum lunas dan mutasinya. */
function SupplierPayableModal({ supplier, onClose }: { supplier: SupplierPayable; onClose: () => void }) {
  const key = supplier.supplier_id ?? 'none'
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['supplier-payables', key],
    queryFn: () => getSupplierPayable(key),
    select: res => res.data.data,
  })
  return (
    <Modal open onClose={onClose} size="lg" title={`${t('htsCard')} — ${supplierLabel(supplier.supplier_name)}`}>
      <QueryErrorState error={error} onRetry={refetch} />
      {isLoading && <div className="h-4 bg-muted rounded animate-pulse" />}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <StatCard title={t('htsBalance')} value={formatCurrency(data.balance)} icon={<Wallet size={18} />} color="blue" />
            <StatCard title={t('htsOverdue')} value={formatCurrency(data.overdue)} icon={<AlertTriangle size={18} />} color="red" />
          </div>
          <AgingBars aging={data.aging} />

          <div>
            <p className="text-sm font-semibold text-foreground mb-2">{t('htsOpenOrders')}</p>
            <div className="border border-border rounded-lg overflow-x-auto">
              <table className="responsive-table w-full min-w-[560px] text-sm">
                <thead className="bg-muted text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">{t('pbrColPo')}</th>
                    <th className="px-3 py-2 text-left">{t('htsDueDate')}</th>
                    <th className="px-3 py-2 text-right">{t('htsReceivedValue')}</th>
                    <th className="px-3 py-2 text-right">{t('htsPaid')}</th>
                    <th className="px-3 py-2 text-right">{t('htsBalance')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.orders.map(o => (
                    <tr key={o.id}>
                      <td data-label={t('pbrColPo')} className="px-3 py-2">
                        <p className="font-mono font-semibold text-foreground">{o.po_number}</p>
                        <Badge variant={PAYMENT_STATUS_VARIANT[o.payment_status]}>{paymentStatusLabel(o.payment_status)}</Badge>
                      </td>
                      <td data-label={t('htsDueDate')} className={`px-3 py-2 ${o.days_overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                        {o.effective_due_date ? formatDate(o.effective_due_date) : '—'}
                        {o.days_overdue > 0 && <span className="block text-xs">{t('htsOverdueDays', { days: o.days_overdue })}</span>}
                      </td>
                      <td data-label={t('htsReceivedValue')} className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(o.received_amount)}</td>
                      <td data-label={t('htsPaid')} className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(o.paid_amount)}</td>
                      <td data-label={t('htsBalance')} className="px-3 py-2 text-right font-semibold text-foreground">{formatCurrency(o.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data.entries.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">{t('htsCard')}</p>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {data.entries.map((e, i) => (
                  <li key={`${e.purchase_order_id}-${i}`} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{t(e.kind === 'receipt' ? 'htsCardReceipt' : 'htsCardPayment', { po: e.po_number })}</p>
                      <p className="text-xs text-muted-foreground">{[formatDate(e.date), e.note].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={e.kind === 'receipt' ? 'font-semibold text-foreground' : 'font-semibold text-green-600 dark:text-green-400'}>
                        {e.kind === 'receipt' ? '+' : '−'}{formatCurrency(e.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(e.balance)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
