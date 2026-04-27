import { useQuery } from '@tanstack/react-query'
import { Utensils, CreditCard, RotateCcw, XCircle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { getTransactionById } from '@/api/transactions'
import type { Transaction, TransactionItem, KitchenStatus } from '@/types'
import { formatCurrency, formatDateTime } from '@/lib/utils'

const KITCHEN_STATUS_CONFIG: Record<KitchenStatus, { label: string; variant: 'gray' | 'yellow' | 'blue' | 'green' }> = {
  WAITING:   { label: 'Menunggu',  variant: 'gray' },
  PREPARING: { label: 'Dimasak',   variant: 'yellow' },
  READY:     { label: 'Siap',      variant: 'blue' },
  SERVED:    { label: 'Disajikan', variant: 'green' },
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
  if (tx.is_canceled) return <Badge variant="red">Dibatalkan</Badge>
  if (tx.is_refunded) return <Badge variant="yellow">Direfund</Badge>
  if (tx.payment_status === 'paid') return <Badge variant="green">Lunas</Badge>
  return <Badge variant="blue">Pending</Badge>
}

interface TransactionDetailModalProps {
  transactionId: string | null
  onClose: () => void
  onRefund: (id: string) => void
  onCancel: (id: string) => void
}

export default function TransactionDetailModal({
  transactionId,
  onClose,
  onRefund,
  onCancel,
}: TransactionDetailModalProps) {
  const { data: detail } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => getTransactionById(transactionId!),
    enabled: !!transactionId,
  })

  const tx = detail?.data?.data

  return (
    <Modal open={!!transactionId} onClose={onClose} title="Detail Transaksi" size="lg">
      {tx ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold font-mono">#{tx.bill_number}</p>
              <p className="text-sm text-gray-400">{formatDateTime(tx.created_at)}</p>
            </div>
            {statusBadge(tx)}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Pelanggan</p>
              <p className="font-medium">{tx.customer?.name || 'Umum'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Kasir</p>
              <p className="font-medium">{tx.cashier?.name || '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Outlet</p>
              <p className="font-medium">{tx.outlet?.name || '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Tipe Order</p>
              <p className="font-medium">{tx.order_type?.name || '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Meja</p>
              <p className="font-medium">{tx.table?.number || '-'}</p>
            </div>
          </div>

          {/* Items */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 flex items-center gap-2">
              <Utensils size={12} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase">Item Pesanan</span>
            </div>
            {tx.items?.map((item, i) => (
              <div key={item.id ?? i} className="px-4 py-3 flex items-start justify-between border-t border-gray-50 text-sm gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{itemDisplayName(item)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-400">x{item.quantity}</p>
                    {item.kitchen_status && kitchenBadge(item.kitchen_status)}
                  </div>
                </div>
                <p className="font-semibold text-gray-900 shrink-0">{formatCurrency(item.total)}</p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-2 text-sm">
            {tx.discount > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Diskon</span>
                <span>-{formatCurrency(tx.discount)}</span>
              </div>
            )}
            {tx.tax > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Pajak</span>
                <span>{formatCurrency(tx.tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
              <span>Total</span>
              <span>{formatCurrency(tx.final_price)}</span>
            </div>
            {tx.amount_received && (
              <>
                <div className="flex justify-between text-gray-500">
                  <span>Dibayar</span>
                  <span>{formatCurrency(tx.amount_received)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Kembalian</span>
                  <span>{formatCurrency(tx.change ?? 0)}</span>
                </div>
              </>
            )}
          </div>

          {/* Split Payment breakdown */}
          {tx.payments && tx.payments.length > 0 && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 flex items-center gap-2">
                <CreditCard size={12} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase">Rincian Pembayaran</span>
              </div>
              {tx.payments.map((p) => (
                <div key={p.id} className="px-4 py-2.5 flex items-center justify-between border-t border-gray-50 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">
                      {p.payment_method?.name ?? `Metode #${p.payment_method_id}`}
                    </p>
                    {p.reference && <p className="text-xs text-gray-400 font-mono">{p.reference}</p>}
                  </div>
                  <p className="font-semibold text-gray-900">{formatCurrency(p.amount)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {!tx.is_canceled && !tx.is_refunded && tx.payment_status === 'paid' && (
            <div className="flex gap-3">
              <button
                onClick={() => onRefund(tx.transaction_id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-yellow-200 text-yellow-600 hover:bg-yellow-50 text-sm font-medium rounded-xl transition"
              >
                <RotateCcw size={15} />
                Refund
              </button>
              <button
                onClick={() => onCancel(tx.transaction_id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-xl transition"
              >
                <XCircle size={15} />
                Batalkan
              </button>
            </div>
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
