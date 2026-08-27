import { useQuery } from '@tanstack/react-query'
import { Utensils, CreditCard, RotateCcw, XCircle, Trash2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { getTransactionById } from '@/api/transactions'
import type { Transaction, TransactionItem, KitchenStatus } from '@/types'
import { formatCurrency, formatDateTime, transactionProfit } from '@/lib/utils'
import { usePermissions, PERMS } from '@/hooks/usePermissions'
import { t } from '@/lib/i18n'

const KITCHEN_STATUS_CONFIG: Record<KitchenStatus, { label: string; variant: 'gray' | 'yellow' | 'blue' | 'green' }> = {
  WAITING:   { label: t('statusPending'),  variant: 'gray' },
  PREPARING: { label: t('kitchenCooking'),   variant: 'yellow' },
  READY:     { label: t('kitchenReady'),      variant: 'blue' },
  SERVED:    { label: t('kitchenServed'), variant: 'green' },
}

function kitchenBadge(status: KitchenStatus | null) {
  if (!status) return null
  const cfg = KITCHEN_STATUS_CONFIG[status]
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

function itemDisplayName(item: TransactionItem) {
  return item.name || item.product?.name || item.bundle?.name || 'Item'
}

function statusBadge(tx: Transaction) {
  if (tx.is_canceled) return <Badge variant="red">{t('statusCancelled')}</Badge>
  if (tx.is_refunded) return <Badge variant="yellow">{t('statusRefundedShort')}</Badge>
  if (tx.payment_status === 'paid') return <Badge variant="green">{t('statusPaid')}</Badge>
  return <Badge variant="blue">{t('statusPending')}</Badge>
}

interface TransactionDetailModalProps {
  transactionId: string | null
  onClose: () => void
  onRefund: (id: string) => void
  onCancel: (id: string) => void
  onDelete: (id: string) => void
}

export default function TransactionDetailModal({
  transactionId,
  onClose,
  onRefund,
  onCancel,
  onDelete,
}: TransactionDetailModalProps) {
  const { can } = usePermissions()
  const { data: detail } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => getTransactionById(transactionId!),
    enabled: !!transactionId,
  })

  const tx = detail?.data?.data

  return (
    <Modal open={!!transactionId} onClose={onClose} title={t('txDetailTitle')} size="lg">
      {tx ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold font-mono">#{tx.bill_number}</p>
              <p className="text-sm text-muted-foreground">{formatDateTime(tx.created_at)}</p>
            </div>
            {statusBadge(tx)}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">{t('navCustomers')}</p>
              <p className="font-medium">{tx.customer?.name || 'Umum'}</p>
            </div>
            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">{t('labelCashier')}</p>
              <p className="font-medium">{tx.cashier?.name || '-'}</p>
            </div>
            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">{t('labelOutlet')}</p>
              <p className="font-medium">{tx.outlet?.name || '-'}</p>
            </div>
            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">{t('txOrderType')}</p>
              <p className="font-medium">{tx.order_type?.name || '-'}</p>
            </div>
            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">{t('txTable')}</p>
              <p className="font-medium">{tx.table?.number || '-'}</p>
            </div>
          </div>

          {/* Items */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-muted flex items-center gap-2">
              <Utensils size={12} className="text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">{t('txItems')}</span>
            </div>
            {tx.items?.map((item, i) => (
              <div key={item.id ?? i} className="px-4 py-3 flex items-start justify-between border-t border-border text-sm gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{itemDisplayName(item)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                    {item.kitchen_status && kitchenBadge(item.kitchen_status)}
                  </div>
                </div>
                <p className="font-semibold text-foreground shrink-0">{formatCurrency(item.total)}</p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border border-border rounded-xl p-4 space-y-2 text-sm">
            {tx.discount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>{t('labelDiscount')}</span>
                <span>-{formatCurrency(tx.discount)}</span>
              </div>
            )}
            {tx.tax > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>{t('labelTax')}</span>
                <span>{formatCurrency(tx.tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-foreground text-base pt-2 border-t border-border">
              <span>{t('labelTotal')}</span>
              <span>{formatCurrency(tx.final_price)}</span>
            </div>
            {/* Laba menyingkap harga modal, jadi hanya untuk yang boleh melihat
                laporan keuangan — sama seperti kartu laba di Beranda. */}
            {can(PERMS.REPORTS_FINANCIAL) && (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('txCogs')}</span>
                  <span>{formatCurrency(tx.base_price ?? 0)}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground">
                  <span>{t('txGrossProfit')}</span>
                  <span>{formatCurrency(transactionProfit(tx))}</span>
                </div>
              </>
            )}
            {tx.amount_received && (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('txPaid')}</span>
                  <span>{formatCurrency(tx.amount_received)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('txChange')}</span>
                  <span>{formatCurrency(tx.change ?? 0)}</span>
                </div>
              </>
            )}
          </div>

          {/* Payment breakdown */}
          {tx.payments && tx.payments.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-muted flex items-center gap-2">
                <CreditCard size={12} className="text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase">{t('txPaymentBreakdown')}</span>
              </div>
              {tx.payments.map((p) => (
                <div key={p.id} className="px-4 py-2.5 flex items-center justify-between border-t border-border text-sm">
                  <div>
                    <p className="font-medium text-foreground">
                      {p.payment_method_name || p.payment_method?.name || `Metode #${p.payment_method_id}`}
                    </p>
                    {p.reference && <p className="text-xs text-muted-foreground font-mono">{p.reference}</p>}
                  </div>
                  <p className="font-semibold text-foreground">{formatCurrency(p.amount)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {!tx.is_canceled && !tx.is_refunded && tx.payment_status === 'paid' && (
            <div className="flex gap-3">
              <button
                onClick={() => onRefund(tx.transaction_id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-yellow-200 dark:border-yellow-500/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:bg-yellow-500/10 text-sm font-medium rounded-xl transition"
              >
                <RotateCcw size={15} />
                {t('txRefundAction')}
              </button>
              <button
                onClick={() => onCancel(tx.transaction_id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-500/10 text-sm font-medium rounded-xl transition"
              >
                <XCircle size={15} />
                {t('actionCancelOrder')}
              </button>
            </div>
          )}

          {/* Hapus permanen berdiri sendiri di bawah, bukan sebaris dengan
              refund dan batal: ia berlaku untuk transaksi apa pun — termasuk
              yang batal dan yang belum dibayar — dan tidak boleh tertekan
              karena tangan meleset satu tombol. */}
          {can(PERMS.POS_DELETE_TRANSACTION) && (
            <button
              onClick={() => onDelete(tx.transaction_id)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 text-sm font-medium rounded-xl transition"
            >
              <Trash2 size={15} />
              {t('txDeleteAction')}
            </button>
          )}
        </div>
      ) : (
        <div className="py-8 text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}
    </Modal>
  )
}
