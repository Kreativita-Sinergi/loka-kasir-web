import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Package, ArrowDown, ArrowUp, RefreshCw, GitBranch, Download, CalendarRange, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import { getStockMovementsByBusiness } from '@/api/stock'
import { useAuthStore } from '@/store/authStore'
import { useOutletStore } from '@/store/outletStore'
import type { StockMovement } from '@/types'
import { formatDateTime } from '@/lib/utils'
import { exportToCSV, csvFilename } from '@/lib/exportUtils'
import { t } from '@/lib/i18n'

type MovementType = StockMovement['type']

// Fungsi, bukan konstanta: isinya memanggil t(), dan konstanta modul
// dievaluasi sekali saat berkas dimuat — bahasanya akan terkunci pada yang
// kebetulan aktif saat itu.
const typeConfig = (): Record<MovementType, { label: string; variant: 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray'; icon: React.ReactNode }> => ({
  IN:         { label: t('attClockIn'),        variant: 'green',  icon: <ArrowDown size={12} /> },
  OUT:        { label: t('attClockOut'),       variant: 'red',    icon: <ArrowUp size={12} /> },
  SALE:       { label: t('movementSold'),      variant: 'blue',   icon: <ArrowUp size={12} /> },
  REFUND:     { label: t('movementRefund'),    variant: 'yellow', icon: <RefreshCw size={12} /> },
  ADJUSTMENT: { label: t('movementAdjustment'), variant: 'purple', icon: <RefreshCw size={12} /> },
  TRANSFER:   { label: t('movementTransfer'),  variant: 'gray',   icon: <GitBranch size={12} /> },
})

function typeBadge(type: MovementType) {
  const cfg = typeConfig()[type] ?? { label: type, variant: 'gray' as const, icon: null }
  return (
    <Badge variant={cfg.variant}>
      <span className="flex items-center gap-1">{cfg.icon}{cfg.label}</span>
    </Badge>
  )
}

export default function StockMovementPage() {
  const { user } = useAuthStore()
  const { selected: selectedOutlet } = useOutletStore()
  const businessId = user?.business?.id ?? ''

  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const hasDateFilter = !!startDate || !!endDate

  const outletId = selectedOutlet?.id

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements', { businessId, page, type: typeFilter, outlet_id: outletId, startDate, endDate }],
    queryFn: () => getStockMovementsByBusiness(businessId, {
      page,
      limit: 30,
      type: typeFilter || undefined,
      outlet_id: outletId || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
    enabled: !!businessId,
  })

  const movements = data?.data?.data ?? []
  const pagination = data?.data?.pagination

  const handleExport = () => {
    const rows = movements.map(m => ({
      [t('labelTime')]: formatDateTime(m.created_at),
      [t('labelProduct')]: m.product?.name ?? m.product_id,
      [t('labelOutlet')]: m.outlet?.name ?? '-',
      'Tipe': typeConfig()[m.type]?.label ?? m.type,
      'Qty': m.quantity,
      'Referensi': m.reference_type ?? '-',
    }))
    exportToCSV(rows, csvFilename('pergerakan-stok'))
  }

  const columns = [
    {
      key: 'created_at',
      label: t('labelTime'),
      render: (row: StockMovement) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(row.created_at)}</span>
      ),
    },
    {
      key: 'product',
      label: t('labelProduct'),
      render: (row: StockMovement) => (
        <div className="flex items-center gap-2">
          <Package size={14} className="text-muted-foreground shrink-0" />
          <span className="text-sm text-foreground">{row.product?.name ?? row.product_id.slice(0, 8) + '...'}</span>
        </div>
      ),
    },
    {
      key: 'outlet',
      label: t('labelOutlet'),
      render: (row: StockMovement) => (
        <span className="text-xs text-muted-foreground">{row.outlet?.name ?? '-'}</span>
      ),
    },
    {
      key: 'type',
      label: t('labelTypeShort'),
      render: (row: StockMovement) => typeBadge(row.type),
    },
    {
      key: 'quantity',
      label: t('labelQuantity'),
      render: (row: StockMovement) => {
        const isPositive = ['IN', 'REFUND'].includes(row.type)
        const isNegative = ['OUT', 'SALE'].includes(row.type)
        const color = isPositive ? 'text-green-600 dark:text-green-400' : isNegative ? 'text-red-600 dark:text-red-400' : 'text-foreground'
        const prefix = isPositive ? '+' : isNegative ? '-' : ''
        return <span className={`text-sm font-semibold ${color}`}>{prefix}{row.quantity}</span>
      },
    },
    {
      key: 'reference',
      label: t('labelReference'),
      render: (row: StockMovement) => (
        <span className="text-xs font-mono text-muted-foreground">
          {row.reference_type ? `${row.reference_type}` : '-'}
        </span>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title={t('navStockHistory')}
        subtitle={selectedOutlet ? t('stockMovementSubtitleOutlet', { outlet: selectedOutlet.name }) : t('movementPageSubtitle')}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
              className="py-2 px-3 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-muted-foreground"
            >
              <option value="">{t('labelAllTypes')}</option>
              {(Object.keys(typeConfig()) as MovementType[]).map((type) => (
                <option key={type} value={type}>{typeConfig()[type].label}</option>
              ))}
            </select>

            {/* Date range */}
            <div className="flex items-center gap-1.5">
              <CalendarRange size={14} className="text-muted-foreground shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
                className="py-2 px-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-muted-foreground"
              />
              <span className="text-muted-foreground text-xs">—</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
                className="py-2 px-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-muted-foreground"
              />
              {hasDateFilter && (
                <button onClick={() => { setStartDate(''); setEndDate(''); setPage(1) }} className="p-1 text-muted-foreground hover:text-red-500 dark:text-red-400 transition" title={t('actionReset')}>
                  <X size={14} />
                </button>
              )}
            </div>

            {selectedOutlet && (
              <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-2 rounded-xl font-medium">
                <GitBranch size={12} />
                {selectedOutlet.name}
              </div>
            )}

            <p className="text-sm text-muted-foreground ml-auto">
              {t('totalColon')} <span className="font-semibold text-foreground">{pagination?.total ?? 0}</span>
            </p>
            <button
              onClick={handleExport}
              disabled={!movements.length}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted disabled:opacity-40 transition shrink-0"
            >
              <Download size={14} />
              {t('exportCsv')}
            </button>
          </div>

          <DataTable
            columns={columns as never[]}
            data={movements as never[]}
            loading={isLoading}
          />
          <Pagination page={page} total={pagination?.total ?? 0} limit={30} onChange={setPage} />
        </div>
      </div>
    </div>
  )
}
