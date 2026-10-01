import Badge from '@/components/ui/Badge'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Transaction } from '@/types'
import { t } from '@/lib/i18n'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ReceiptText } from 'lucide-react'

interface RecentTransactionsListProps {
  transactions: Transaction[]
  loading: boolean
  outletName?: string
}

function statusBadge(tx: { is_canceled: boolean; is_refunded: boolean; payment_status: string }) {
  if (tx.is_canceled) return <Badge variant="red">{t('statusCancelled')}</Badge>
  if (tx.is_refunded) return <Badge variant="yellow">{t('statusRefundedShort')}</Badge>
  if (tx.payment_status === 'paid') return <Badge variant="green">{t('statusPaid')}</Badge>
  return <Badge variant="blue">{t('statusPending')}</Badge>
}

export default function RecentTransactionsList({ transactions, loading, outletName }: RecentTransactionsListProps) {
  return (
    <div className="xl:col-span-2 bg-card rounded-2xl border border-border">
      <div className="px-5 py-4 border-b border-border flex flex-wrap gap-2 items-center justify-between">
        <h2 className="font-semibold text-foreground">{t('dashRecentTx')}</h2>
        <Link to="/transactions" className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-primary">{t('dashViewTransactions')}<ArrowUpRight size={14} /></Link>
      </div>
      <div className="divide-y divide-border">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <div className="h-4 flex-1 bg-muted rounded animate-pulse" />
            </div>
          ))
        ) : transactions.length === 0 ? (
          <div className="px-5 py-10 flex flex-col items-center gap-3 text-center text-muted-foreground text-sm"><ReceiptText size={28} className="opacity-50" /><p>{t('dashNoTxYet')}</p></div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.transaction_id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">#{tx.bill_number}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(tx.created_at)}{outletName ? ` · ${outletName}` : ''}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {statusBadge(tx)}
                <span className="text-sm font-semibold text-foreground">{formatCurrency(tx.final_price)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
