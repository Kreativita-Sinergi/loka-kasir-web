import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DollarSign, TrendingUp, ArrowDownCircle, ArrowUpCircle, Download, CalendarRange, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import StatCard from '@/components/ui/StatCard'
import { getShifts } from '@/api/shifts'
import { useOutletStore } from '@/store/outletStore'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { exportToCSV, csvFilename } from '@/lib/exportUtils'
import type { Shift } from '@/types'

export default function FinancialReportsPage() {
  const { selected: selectedOutlet } = useOutletStore()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const hasDateFilter = !!startDate || !!endDate

  const { data, isLoading } = useQuery({
    queryKey: ['shifts-financial', selectedOutlet?.id, startDate, endDate],
    queryFn: () => getShifts({
      limit: 100,
      outlet_id: selectedOutlet?.id,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
  })

  const shifts: Shift[] = data?.data?.data?.results ?? []

  // ── Aggregate financial summary ──
  const totalSales     = shifts.reduce((s, sh) => s + (sh.total_sales ?? 0), 0)
  const totalRefunds   = shifts.reduce((s, sh) => s + (sh.total_refunds ?? 0), 0)
  const totalOpenCash  = shifts.reduce((s, sh) => s + (sh.opening_cash ?? 0), 0)
  const netRevenue     = totalSales - totalRefunds

  const openShifts   = shifts.filter((s) => s.status === 'open').length
  const closedShifts = shifts.filter((s) => s.status === 'closed').length

  const handleExport = () => {
    const rows = shifts.map((s) => ({
      'Kasir':           s.cashier?.business?.owner_name ?? '-',
      'Terminal':        s.terminal?.name ?? '-',
      'Outlet':          s.outlet?.name ?? '-',
      'Dibuka':          formatDateTime(s.opened_at),
      'Ditutup':         s.closed_at ? formatDateTime(s.closed_at) : '-',
      'Kas Awal (Rp)':   s.opening_cash ?? 0,
      'Kas Akhir (Rp)':  s.closing_cash ?? 0,
      'Total Penjualan (Rp)': s.total_sales ?? 0,
      'Total Refund (Rp)':    s.total_refunds ?? 0,
      'Net (Rp)':        (s.total_sales ?? 0) - (s.total_refunds ?? 0),
      'Status':          s.status === 'open' ? 'Buka' : 'Tutup',
    }))
    exportToCSV(rows, csvFilename('laporan-keuangan'))
  }

  const columns = [
    {
      key: 'cashier',
      label: 'Kasir / Terminal',
      render: (row: Shift) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{row.cashier?.name ?? '-'}</p>
          <p className="text-xs text-gray-400">{row.terminal?.name ?? '-'} · {row.outlet?.name ?? '-'}</p>
        </div>
      ),
    },
    {
      key: 'opened_at',
      label: 'Periode',
      render: (row: Shift) => (
        <div>
          <p className="text-xs text-gray-700">{formatDateTime(row.opened_at)}</p>
          <p className="text-xs text-gray-400">{row.closed_at ? formatDateTime(row.closed_at) : 'Belum Ditutup'}</p>
        </div>
      ),
    },
    {
      key: 'opening_cash',
      label: 'Kas Awal',
      render: (row: Shift) => (
        <span className="text-sm text-gray-700">{formatCurrency(row.opening_cash ?? 0)}</span>
      ),
    },
    {
      key: 'closing_cash',
      label: 'Kas Akhir',
      render: (row: Shift) => (
        <span className="text-sm text-gray-700">
          {row.closing_cash != null ? formatCurrency(row.closing_cash) : <span className="text-gray-300">—</span>}
        </span>
      ),
    },
    {
      key: 'total_sales',
      label: 'Total Penjualan',
      render: (row: Shift) => (
        <span className="text-sm font-semibold text-gray-900">{formatCurrency(row.total_sales ?? 0)}</span>
      ),
    },
    {
      key: 'total_refunds',
      label: 'Refund',
      render: (row: Shift) => (
        <span className={`text-sm ${(row.total_refunds ?? 0) > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
          {(row.total_refunds ?? 0) > 0 ? `- ${formatCurrency(row.total_refunds!)}` : '—'}
        </span>
      ),
    },
    {
      key: 'net',
      label: 'Net',
      render: (row: Shift) => {
        const net = (row.total_sales ?? 0) - (row.total_refunds ?? 0)
        return <span className="text-sm font-bold text-blue-600">{formatCurrency(net)}</span>
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Shift) => (
        <Badge variant={row.status === 'open' ? 'green' : 'gray'}>
          {row.status === 'open' ? 'Buka' : 'Tutup'}
        </Badge>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Laporan Keuangan"
        subtitle={selectedOutlet ? `Ringkasan Keuangan ${selectedOutlet.name}` : 'Ringkasan Keuangan Semua Outlet'}
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Total Penjualan"
            value={formatCurrency(totalSales)}
            icon={<TrendingUp size={20} />}
            color="green"
            loading={isLoading}
          />
          <StatCard
            title="Total Refund"
            value={formatCurrency(totalRefunds)}
            icon={<ArrowDownCircle size={20} />}
            color="orange"
            loading={isLoading}
          />
          <StatCard
            title="Net Pendapatan"
            value={formatCurrency(netRevenue)}
            icon={<DollarSign size={20} />}
            color="blue"
            loading={isLoading}
          />
          <StatCard
            title="Total Kas Awal"
            value={formatCurrency(totalOpenCash)}
            icon={<ArrowUpCircle size={20} />}
            color="purple"
            loading={isLoading}
          />
        </div>

        {/* Shift breakdown info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-xl text-xs text-green-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            {openShifts} Shift Aktif
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            {closedShifts} Shift Tutup
          </div>
        </div>

        {/* Shift Detail Table */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">Rincian Per Sesi Shift</p>
              <p className="text-xs text-gray-400 mt-0.5">Kas awal · Kas akhir · Penjualan · Refund per sesi</p>
            </div>
            {/* Date range */}
            <div className="flex items-center gap-1.5 shrink-0">
              <CalendarRange size={14} className="text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="py-1.5 px-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
              />
              <span className="text-gray-400 text-xs">—</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="py-1.5 px-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
              />
              {hasDateFilter && (
                <button onClick={() => { setStartDate(''); setEndDate('') }} className="p-1 text-gray-400 hover:text-red-500 transition" title="Reset">
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={handleExport}
              disabled={!shifts.length}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition shrink-0"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
          <DataTable
            columns={columns as never[]}
            data={shifts as never[]}
            loading={isLoading}
            emptyMessage="Belum Ada Data Keuangan"
          />
        </div>

      </div>
    </div>
  )
}
