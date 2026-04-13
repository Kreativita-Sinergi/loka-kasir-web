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

type MovementType = StockMovement['type']

const TYPE_CONFIG: Record<MovementType, { label: string; variant: 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray'; icon: React.ReactNode }> = {
  IN:         { label: 'Masuk',    variant: 'green',  icon: <ArrowDown size={12} /> },
  OUT:        { label: 'Keluar',   variant: 'red',    icon: <ArrowUp size={12} /> },
  SALE:       { label: 'Terjual',  variant: 'blue',   icon: <ArrowUp size={12} /> },
  REFUND:     { label: 'Refund',   variant: 'yellow', icon: <RefreshCw size={12} /> },
  ADJUSTMENT: { label: 'Koreksi', variant: 'purple', icon: <RefreshCw size={12} /> },
  TRANSFER:   { label: 'Transfer', variant: 'gray',   icon: <GitBranch size={12} /> },
}

function typeBadge(type: MovementType) {
  const cfg = TYPE_CONFIG[type] ?? { label: type, variant: 'gray' as const, icon: null }
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
      'Waktu': formatDateTime(m.created_at),
      'Produk': m.product?.name ?? m.product_id,
      'Outlet': m.outlet?.name ?? '-',
      'Tipe': TYPE_CONFIG[m.type]?.label ?? m.type,
      'Qty': m.quantity,
      'Referensi': m.reference_type ?? '-',
    }))
    exportToCSV(rows, csvFilename('pergerakan-stok'))
  }

  const columns = [
    {
      key: 'created_at',
      label: 'Waktu',
      render: (row: StockMovement) => (
        <span className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(row.created_at)}</span>
      ),
    },
    {
      key: 'product',
      label: 'Produk',
      render: (row: StockMovement) => (
        <div className="flex items-center gap-2">
          <Package size={14} className="text-gray-400 shrink-0" />
          <span className="text-sm text-gray-800">{row.product?.name ?? row.product_id.slice(0, 8) + '...'}</span>
        </div>
      ),
    },
    {
      key: 'outlet',
      label: 'Outlet',
      render: (row: StockMovement) => (
        <span className="text-xs text-gray-500">{row.outlet?.name ?? '-'}</span>
      ),
    },
    {
      key: 'type',
      label: 'Tipe',
      render: (row: StockMovement) => typeBadge(row.type),
    },
    {
      key: 'quantity',
      label: 'Qty',
      render: (row: StockMovement) => {
        const isPositive = ['IN', 'REFUND'].includes(row.type)
        const isNegative = ['OUT', 'SALE'].includes(row.type)
        const color = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-700'
        const prefix = isPositive ? '+' : isNegative ? '-' : ''
        return <span className={`text-sm font-semibold ${color}`}>{prefix}{row.quantity}</span>
      },
    },
    {
      key: 'reference',
      label: 'Referensi',
      render: (row: StockMovement) => (
        <span className="text-xs font-mono text-gray-400">
          {row.reference_type ? `${row.reference_type}` : '-'}
        </span>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Riwayat Pergerakan Stok"
        subtitle={selectedOutlet ? `Outlet: ${selectedOutlet.name}` : 'Semua outlet'}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
              className="py-2 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
            >
              <option value="">Semua Tipe</option>
              {(Object.keys(TYPE_CONFIG) as MovementType[]).map(t => (
                <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
              ))}
            </select>

            {/* Date range */}
            <div className="flex items-center gap-1.5">
              <CalendarRange size={14} className="text-gray-400 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
                className="py-2 px-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
              />
              <span className="text-gray-400 text-xs">—</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
                className="py-2 px-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
              />
              {hasDateFilter && (
                <button onClick={() => { setStartDate(''); setEndDate(''); setPage(1) }} className="p-1 text-gray-400 hover:text-red-500 transition" title="Reset">
                  <X size={14} />
                </button>
              )}
            </div>

            {selectedOutlet && (
              <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-xl font-medium">
                <GitBranch size={12} />
                {selectedOutlet.name}
              </div>
            )}

            <p className="text-sm text-gray-500 ml-auto">
              Total: <span className="font-semibold text-gray-900">{pagination?.total ?? 0}</span>
            </p>
            <button
              onClick={handleExport}
              disabled={!movements.length}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition shrink-0"
            >
              <Download size={14} />
              Export CSV
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
