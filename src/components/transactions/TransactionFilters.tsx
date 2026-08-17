import { Search, CalendarRange, GitBranch, X, Download } from 'lucide-react'
import type { Transaction } from '@/types'
import { formatDateTime } from '@/lib/utils'
import { exportToCSV, csvFilename } from '@/lib/exportUtils'
// Diimpor sebagai `msg` karena berkas ini memakai `t` sebagai nama variabel
// transaksi di beberapa closure — nama yang sudah ada lebih dulu.
import { t as msg } from '@/lib/i18n'

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
      // Judul kolom memakai kunci terhitung: berkas ekspor ikut bahasa
      // dasbor, karena yang membukanya adalah orang yang sama.
      [msg('txReceiptNumber')]: t.bill_number,
      [msg('labelOutlet')]: t.outlet?.name ?? '-',
      [msg('navCustomers')]: t.customer?.name || msg('txWalkInCustomer'),
      [msg('labelCashier')]: t.cashier?.name || '-',
      [msg('txOrderType')]: t.order_type?.name || '-',
      [msg('labelTotal')]: t.final_price,
      [msg('labelDiscount')]: t.discount,
      [msg('labelTax')]: t.tax,
      [msg('labelStatus')]: t.is_canceled
        ? msg('statusCancelled')
        : t.is_refunded
          ? msg('txStatusRefunded')
          : t.payment_status === 'paid'
            ? msg('statusPaid')
            : msg('txStatusAwaitingPayment'),
      [msg('labelTime')]: formatDateTime(t.created_at),
    }))
    exportToCSV(rows, csvFilename('transaksi'))
  }

  return (
    <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[160px] max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={msg('txSearchReceipt')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
        className="py-2 px-3 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-muted-foreground"
      >
        <option value="">{msg('labelAllStatus')}</option>
        <option value="paid">{msg('statusPaid')}</option>
        <option value="pending">{msg('txStatusAwaitingPayment')}</option>
        <option value="canceled">{msg('statusCancelled')}</option>
        <option value="refunded">{msg('txStatusRefunded')}</option>
      </select>

      {/* Date range filter */}
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
          <button
            onClick={() => { setStartDate(''); setEndDate(''); setPage(1) }}
            className="p-1 text-muted-foreground hover:text-red-500 dark:text-red-400 transition"
            title={msg('txClearDateFilter')}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Outlet indicator */}
      {selectedOutletName && (
        <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-2 rounded-xl font-medium">
          <GitBranch size={12} />
          {selectedOutletName}
        </div>
      )}

      <p className="text-sm text-muted-foreground ml-auto shrink-0">
        {msg('totalColon')} <span className="font-semibold text-foreground">{total}</span>
      </p>
      <button
        onClick={handleExport}
        disabled={!transactions.length}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted disabled:opacity-40 transition shrink-0"
      >
        <Download size={14} />
        {msg('exportCsv')}
      </button>
    </div>
  )
}
