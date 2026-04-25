import Badge from '@/components/ui/Badge'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Transaction } from '@/types'

interface RecentTransactionsListProps {
  transactions: Transaction[]
  loading: boolean
  outletName?: string
}

function statusBadge(tx: { is_canceled: boolean; is_refunded: boolean; payment_status: string }) {
  if (tx.is_canceled) return <Badge variant="red">Dibatalkan</Badge>
  if (tx.is_refunded) return <Badge variant="yellow">Direfund</Badge>
  if (tx.payment_status === 'paid') return <Badge variant="green">Lunas</Badge>
  return <Badge variant="blue">Pending</Badge>
}

export default function RecentTransactionsList({ transactions, loading, outletName }: RecentTransactionsListProps) {
  return (
    <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Transaksi Terbaru</h2>
        {outletName && (
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg font-medium">
            {outletName}
          </span>
        )}
      </div>
      <div className="divide-y divide-gray-50">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <div className="h-4 flex-1 bg-gray-100 rounded animate-pulse" />
            </div>
          ))
        ) : transactions.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">Belum Ada Transaksi</div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.transaction_id} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">#{tx.bill_number}</p>
                <p className="text-xs text-gray-400">{formatDateTime(tx.created_at)}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {statusBadge(tx)}
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(tx.final_price)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
