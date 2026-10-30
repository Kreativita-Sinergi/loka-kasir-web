import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Boxes, Download, Info, Receipt, ShoppingCart, Truck } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import Badge from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/Table'
import ReportDateRange from '@/components/reports/ReportDateRange'
import { getPurchaseReport, type PurchaseReport } from '@/api/purchasePayables'
import { useOutletStore } from '@/store/outletStore'
import { formatCurrency, formatDate, todayISODate } from '@/lib/utils'
import { formatQuantity } from '@/lib/money'
import { exportToCSV, csvFilename } from '@/lib/exportUtils'
import { monthStartISO } from '@/lib/reportRange'
import { t } from '@/lib/i18n'
import {
  PAYMENT_STATUS_VARIANT, PURCHASE_GROUP_LABEL, paymentStatusLabel, purchaseCsvRows, supplierLabel,
  type PurchaseGroup,
} from '@/lib/purchasePayables'

const exportButtonClass =
  'flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted disabled:opacity-40 transition shrink-0'

const GROUPS: PurchaseGroup[] = ['supplier', 'item', 'order']

type SupplierRow = PurchaseReport['by_supplier'][number]
type ItemRow = PurchaseReport['by_item'][number]
type OrderRow = PurchaseReport['by_order'][number]

/**
 * Laporan Pembelian — barang yang DITERIMA dari supplier dalam rentang
 * tanggal, per supplier, per barang, atau per PO. Setiap kiriman dihitung
 * dengan harganya sendiri, jadi totalnya sama dengan hutang yang lahir darinya.
 */
export default function PurchaseReportPage() {
  const { selected: selectedOutlet } = useOutletStore()
  const [range, setRange] = useState(() => ({ from: monthStartISO(), to: todayISODate() }))
  const [group, setGroup] = useState<PurchaseGroup>('supplier')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['purchase-report', range.from, range.to, selectedOutlet?.id],
    queryFn: () => getPurchaseReport({ start_date: range.from, end_date: range.to, outlet_id: selectedOutlet?.id }),
    select: res => res.data.data,
    enabled: !!range.from && !!range.to,
  })

  const summary = data?.summary
  const rows: object[] = !data ? [] : group === 'supplier'
    ? data.by_supplier.map(r => ({ ...r, id: r.supplier_id ?? 'none' }))
    : group === 'item'
      ? data.by_item.map(r => ({ ...r, id: `${r.product_id ?? r.raw_material_id}:${r.variant_id ?? ''}` }))
      : data.by_order

  const handleExport = () => {
    if (!data) return
    exportToCSV(purchaseCsvRows(data, group), csvFilename(`laporan-pembelian-${group}`))
  }

  const columns = group === 'supplier'
    ? [
        { key: 'supplier_name', label: t('htsSupplierCount'), render: (r: SupplierRow) => <span className={`text-sm font-medium ${r.supplier_name ? 'text-foreground' : 'text-muted-foreground italic'}`}>{supplierLabel(r.supplier_name)}</span> },
        { key: 'order_count', label: t('pbrOrders'), className: 'text-right', render: (r: SupplierRow) => <span className="text-sm text-muted-foreground">{formatQuantity(r.order_count)}</span> },
        { key: 'total', label: t('pbrTotal'), className: 'text-right', render: (r: SupplierRow) => <span className="text-sm font-semibold text-foreground">{formatCurrency(r.total)}</span> },
      ]
    : group === 'item'
      ? [
          { key: 'name', label: t('pbrColItem'), render: (r: ItemRow) => <span className="text-sm font-medium text-foreground">{r.variant_name ? `${r.name} — ${r.variant_name}` : r.name}</span> },
          { key: 'quantity', label: t('pbrColQty'), className: 'text-right', render: (r: ItemRow) => <span className="text-sm text-muted-foreground">{formatQuantity(r.quantity)} {r.unit}</span> },
          { key: 'average_cost', label: t('pbrColAvg'), className: 'text-right', render: (r: ItemRow) => <span className="text-sm text-muted-foreground">{formatCurrency(r.average_cost)}</span> },
          { key: 'total', label: t('pbrTotal'), className: 'text-right', render: (r: ItemRow) => <span className="text-sm font-semibold text-foreground">{formatCurrency(r.total)}</span> },
        ]
      : [
          { key: 'po_number', label: t('pbrColPo'), render: (r: OrderRow) => <span className="font-mono text-sm font-semibold text-foreground">{r.po_number}</span> },
          { key: 'supplier_name', label: t('htsSupplierCount'), render: (r: OrderRow) => <span className="text-sm text-muted-foreground">{supplierLabel(r.supplier_name)}</span> },
          { key: 'received_at', label: t('pbrColReceivedAt'), render: (r: OrderRow) => <span className="text-sm text-muted-foreground">{formatDate(r.received_at)}</span> },
          { key: 'total', label: t('pbrTotal'), className: 'text-right', render: (r: OrderRow) => <span className="text-sm font-semibold text-foreground">{formatCurrency(r.total)}</span> },
          { key: 'paid_amount', label: t('htsPaid'), className: 'text-right', render: (r: OrderRow) => <span className="text-sm text-muted-foreground">{formatCurrency(r.paid_amount)}</span> },
          { key: 'balance', label: t('htsBalance'), className: 'text-right', render: (r: OrderRow) => <span className="text-sm text-foreground">{formatCurrency(r.balance)}</span> },
          { key: 'payment_status', label: t('pbrColStatus'), render: (r: OrderRow) => <Badge variant={PAYMENT_STATUS_VARIANT[r.payment_status]}>{paymentStatusLabel(r.payment_status)}</Badge> },
        ]

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header
        title={t('navPurchaseReport')}
        subtitle={selectedOutlet ? t('pbrSubtitleOutlet', { outlet: selectedOutlet.name }) : t('pbrSubtitle')}
      />

      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <ReportDateRange from={range.from} to={range.to} onChange={setRange} />

        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title={t('pbrTotal')} value={formatCurrency(summary?.total_purchase ?? 0)} icon={<ShoppingCart size={18} />} color="blue" loading={isLoading} emphasis />
          <StatCard title={t('pbrOrders')} value={formatQuantity(summary?.order_count ?? 0)} icon={<Receipt size={18} />} color="purple" loading={isLoading} />
          <StatCard title={t('pbrSuppliers')} value={formatQuantity(summary?.supplier_count ?? 0)} icon={<Truck size={18} />} color="green" loading={isLoading} />
          <StatCard title={t('pbrItems')} value={formatQuantity(summary?.item_count ?? 0)} icon={<Boxes size={18} />} color="orange" loading={isLoading} />
        </div>

        <div className="flex flex-wrap gap-2 bg-muted p-1 rounded-xl w-fit max-w-full" role="tablist">
          {GROUPS.map(g => (
            <button
              key={g}
              type="button"
              role="tab"
              aria-selected={group === g}
              onClick={() => setGroup(g)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition ${
                group === g ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(PURCHASE_GROUP_LABEL[g])}
            </button>
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
            <p className="w-full min-w-0 sm:w-auto sm:flex-1 text-sm font-semibold text-foreground">{t(PURCHASE_GROUP_LABEL[group])}</p>
            <button type="button" onClick={handleExport} disabled={!rows.length} className={exportButtonClass}>
              <Download size={14} />
              {t('exportCsv')}
            </button>
          </div>
          <DataTable
            columns={columns as never[]}
            data={rows as never[]}
            loading={isLoading} error={error} onRetry={refetch}
            emptyMessage={t('pbrEmpty')}
          />
        </div>

        <div className="flex gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">{t('pbrDateNote')}</p>
        </div>
      </div>
    </div>
  )
}
