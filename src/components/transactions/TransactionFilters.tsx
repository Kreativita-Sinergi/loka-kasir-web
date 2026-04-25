import { Search, CalendarRange, GitBranch, X, Download } from 'lucide-react'
import type { Transaction } from '@/types'
import { formatDateTime } from '@/lib/utils'
import { exportToCSV, csvFilename } from '@/lib/exportUtils'

interface TransactionFiltersProps {
  search: string
  setSearch: (v: string) => void
  statusFilter: string
  setStatusFilter: (v: string) => void
  startDate: string
  setStartDate: (v: string) => void
  endDate: string
  setEndDate: (v: string) => void
  setPage: (page: number) => void
  selectedOutletName?: string
  total: number
  transactions: Transaction[]
}

export default function TransactionFilters({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  setPage,
  selectedOutletName,
  total,
  transactions,
}: TransactionFiltersProps) {
  const hasDateFilter = !!startDate || !!endDate

  const handleExport = () => {
    const rows = transactions.map(t => ({
      'No. Bill': t.bill_number,
      'Outlet': t.outlet?.name ?? '-',
      'Pelanggan': t.customer?.name || 'Umum',
      'Kasir': t.cashier?.name || '-',
      'Tipe Order': t.order_type?.name || '-',
      'Total (Rp)': t.final_price,
      'Diskon (Rp)': t.discount,
      'Pajak (Rp)': t.tax,
      'Status': t.is_canceled ? 'Dibatalkan' : t.is_refunded ? 'Direfund' : t.payment_status === 'paid' ? 'Lunas' : 'Pending',
      'Waktu': formatDateTime(t.created_at),
    }))
    exportToCSV(rows, csvFilename('transaksi'))
  }

  return (
    <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[160px] max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Cari no. bill..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
        className="py-2 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
      >
        <option value="">Semua Status</option>
        <option value="paid">Lunas</option>
        <option value="pending">Pending</option>
        <option value="canceled">Dibatalkan</option>
        <option value="refunded">Direfund</option>
      </select>

      {/* Date range filter */}
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
          <button
            onClick={() => { setStartDate(''); setEndDate(''); setPage(1) }}
            className="p-1 text-gray-400 hover:text-red-500 transition"
            title="Reset tanggal"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Outlet indicator */}
      {selectedOutletName && (
        <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-xl font-medium">
          <GitBranch size={12} />
          {selectedOutletName}
        </div>
      )}

      <p className="text-sm text-gray-500 ml-auto shrink-0">
        Total: <span className="font-semibold text-gray-900">{total}</span>
      </p>
      <button
        onClick={handleExport}
        disabled={!transactions.length}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition shrink-0"
      >
        <Download size={14} />
        Export CSV
      </button>
    </div>
  )
}
