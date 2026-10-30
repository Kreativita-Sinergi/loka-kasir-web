import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Factory, Package, Wallet, XCircle } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { DataTable } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import ReportDateRange from '@/components/reports/ReportDateRange'
import { getProductionReport, productionDisplayName, type ProductionOrder, type ProductionReport } from '@/api/production'
import { getOutletsByBusiness } from '@/api/outlets'
import { useAuthStore } from '@/store/authStore'
import { defaultLedgerRange } from '@/lib/cashBook'
import { csvFilename, exportToCSV } from '@/lib/exportUtils'
import { productionReportCsvRows } from '@/lib/productionReport'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { formatQuantity } from '@/lib/money'
import { t } from '@/lib/i18n'
import type { Outlet } from '@/types'

type ProductRow = ProductionReport['products'][number]
type ComponentRow = ProductionReport['components'][number]

/** Laporan Perakitan — per produksi, per barang jadi, dan komponen terpakai. */
export default function ProductionReportPage() {
  const businessId = useAuthStore(s => s.user?.business?.id ?? '')
  const [range, setRange] = useState(defaultLedgerRange)
  const [outletId, setOutletId] = useState('')

  const outletsQuery = useQuery({
    queryKey: ['outlets-selector', businessId],
    queryFn: () => getOutletsByBusiness(businessId, { limit: 50, page: 1 }),
    select: res => (res.data.data ?? []) as Outlet[],
    enabled: !!businessId,
    staleTime: 60_000,
  })
  const reportQuery = useQuery({
    queryKey: ['production-report', range.start, range.end, outletId],
    queryFn: () => getProductionReport({ start_date: range.start || undefined, end_date: range.end || undefined, outlet_id: outletId || undefined }),
    select: res => res.data.data,
  })
  const report = reportQuery.data
  const outlets = outletsQuery.data ?? []

  const productColumns = [
    { key: 'name', label: t('pdnFieldProduct'), render: (r: ProductRow) => <span className="text-sm font-medium text-foreground">{productionDisplayName(r)}</span> },
    { key: 'orders', label: t('pdnStatOrders'), className: 'text-right', render: (r: ProductRow) => <span className="tabular-nums">{r.orders}</span> },
    { key: 'qty', label: t('pdnStatQty'), className: 'text-right', render: (r: ProductRow) => <span className="tabular-nums">{formatQuantity(r.qty_output)}</span> },
    { key: 'total', label: t('pdnTotalCost'), className: 'text-right', render: (r: ProductRow) => <span className="tabular-nums font-semibold">{formatCurrency(r.total_cost)}</span> },
    { key: 'avg', label: t('pdnCsvAvgCost'), className: 'text-right', render: (r: ProductRow) => <span className="tabular-nums">{formatCurrency(r.avg_cost)}</span> },
  ]
  const componentColumns = [
    { key: 'name', label: t('pdnCsvName'), render: (r: ComponentRow) => <span className="text-sm font-medium text-foreground">{r.name}</span> },
    { key: 'qty', label: t('pdnCsvQty'), className: 'text-right', render: (r: ComponentRow) => <span className="tabular-nums">{formatQuantity(r.qty)}{r.unit_name ? ` ${r.unit_name}` : ''}</span> },
    { key: 'total', label: t('pdnTotalCost'), className: 'text-right', render: (r: ComponentRow) => <span className="tabular-nums font-semibold">{formatCurrency(r.total_cost)}</span> },
    { key: 'avg', label: t('pdnCsvAvgCost'), className: 'text-right', render: (r: ComponentRow) => <span className="tabular-nums">{formatCurrency(r.avg_cost)}</span> },
  ]
  const orderColumns = [
    {
      key: 'when', label: t('labelTime'),
      render: (o: ProductionOrder) => (
        <div>
          <p className="text-xs text-foreground">{formatDateTime(o.produced_at)}</p>
          <p className="text-xs font-mono text-muted-foreground">{o.number}</p>
        </div>
      ),
    },
    { key: 'product', label: t('pdnFieldProduct'), render: (o: ProductionOrder) => <span className={`text-sm ${o.status === 'voided' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{formatQuantity(o.qty_output)} × {productionDisplayName(o)}</span> },
    { key: 'outlet', label: t('pdnFieldOutlet'), render: (o: ProductionOrder) => <span className="text-xs text-muted-foreground">{o.outlet_name}</span> },
    { key: 'total', label: t('pdnTotalCost'), className: 'text-right', render: (o: ProductionOrder) => <span className="tabular-nums font-semibold">{formatCurrency(o.total_cost)}</span> },
    { key: 'status', label: t('labelStatus'), render: (o: ProductionOrder) => o.status === 'voided' ? <Badge variant="red">{t('pdnVoidedBadge')}</Badge> : <Badge variant="green">{t('pdnStatusDone')}</Badge> },
  ]

  const card = (title: string, body: React.ReactNode, action?: React.ReactNode) => (
    <div className="bg-card rounded-2xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {body}
    </div>
  )

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      <Header title={t('pdnReportTitle')} subtitle={t('pdnReportSubtitle')} />
      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <ReportDateRange from={range.start} to={range.end} onChange={({ from, to }) => setRange({ start: from, end: to })} />
          {outlets.length > 1 && (
            <div className="w-56">
              <SearchableSelect
                value={outletId}
                onChange={setOutletId}
                options={outlets.map(o => ({ value: o.id, label: o.name }))}
                placeholder={t('labelAllOutlets')}
                size="sm"
              />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard title={t('pdnStatOrders')} value={String(report?.summary.orders ?? 0)} icon={<Factory size={20} />} color="blue" loading={reportQuery.isLoading} />
          <StatCard title={t('pdnStatQty')} value={formatQuantity(report?.summary.qty_output ?? 0)} icon={<Package size={20} />} color="green" loading={reportQuery.isLoading} />
          <StatCard title={t('pdnStatCost')} value={formatCurrency(report?.summary.total_cost ?? 0)} icon={<Wallet size={20} />} color="purple" emphasis loading={reportQuery.isLoading} />
          <StatCard title={t('pdnStatVoided')} value={String(report?.summary.voided ?? 0)} icon={<XCircle size={20} />} color="red" loading={reportQuery.isLoading} />
        </div>
        {card(t('pdnReportByProduct'),
          <DataTable columns={productColumns as never[]} data={(report?.products ?? []) as never[]} loading={reportQuery.isLoading} error={reportQuery.error} onRetry={reportQuery.refetch} emptyMessage={t('pdnEmptyBody')} />,
          <button
            type="button"
            disabled={!report?.orders.length}
            onClick={() => report && exportToCSV(productionReportCsvRows(report), csvFilename('laporan-perakitan'), { withTotal: false })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-50"
          >
            <Download size={14} /> {t('exportCsv')}
          </button>,
        )}
        {card(t('pdnReportComponents'),
          <DataTable columns={componentColumns as never[]} data={(report?.components ?? []) as never[]} loading={reportQuery.isLoading} emptyMessage={t('pdnEmptyBody')} />,
        )}
        {card(t('pdnReportOrders'),
          <DataTable columns={orderColumns as never[]} data={(report?.orders ?? []) as never[]} loading={reportQuery.isLoading} emptyMessage={t('pdnEmptyBody')} />,
        )}
        <p className="text-xs text-muted-foreground">{t('pdnReportNote')}</p>
      </div>
    </div>
  )
}
