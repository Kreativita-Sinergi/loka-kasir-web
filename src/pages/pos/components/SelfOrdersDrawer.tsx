import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Check, QrCode, Clock, RefreshCw } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import { getErrorMessage } from '@/lib/utils'
import { updateOrderStatus } from '@/api/transactions'
import { useAuthStore } from '@/store/authStore'
import type { Transaction } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  orders: Transaction[]
  onRefresh: () => void
  refreshing: boolean
}

/**
 * SelfOrdersDrawer menampilkan pesanan QR Scan-to-Order yang menunggu konfirmasi
 * kasir. Kasir dapat "Terima" sebuah pesanan (pending → confirmed) sehingga
 * pesanan masuk ke alur dapur; pembayaran tetap dilakukan di kasir.
 */
export default function SelfOrdersDrawer({ open, onClose, orders, onRefresh, refreshing }: Props) {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)

  const acceptMut = useMutation({
    mutationFn: (id: string) => updateOrderStatus(id, 'confirmed', userId),
    onSuccess: () => {
      toast.success('Pesanan diterima')
      qc.invalidateQueries({ queryKey: ['self-orders-pending'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Pesanan QR Masuk" size="md">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {orders.length > 0 ? `${orders.length} pesanan menunggu konfirmasi` : 'Tidak ada pesanan menunggu'}
        </p>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Muat ulang
        </Button>
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={<QrCode size={28} />} title="Belum ada pesanan QR" description="Pesanan dari pelanggan yang scan QR meja akan muncul di sini." />
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {orders.map((o) => (
            <div key={o.transaction_id} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {o.table ? `Meja ${o.table.number}` : o.bill_number}
                    </span>
                    {o.queue_number && (
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                        No. {o.queue_number}
                      </span>
                    )}
                  </div>
                  {o.customer?.name && <p className="text-xs text-muted-foreground">{o.customer.name}</p>}
                </div>
                <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 shrink-0">
                  <Clock size={12} /> {formatTime(o.created_at)}
                </span>
              </div>

              <ul className="mt-2 space-y-0.5 text-sm text-foreground">
                {o.items.map((it) => (
                  <li key={it.id} className="flex justify-between gap-2">
                    <span className="truncate">{it.quantity}× {it.name}</span>
                    <span className="text-muted-foreground shrink-0">{formatCurrency(it.total)}</span>
                  </li>
                ))}
              </ul>

              {o.notes && <p className="mt-2 text-xs italic text-muted-foreground">Catatan: {o.notes}</p>}

              <div className="mt-3 flex items-center justify-between">
                <span className="font-semibold text-foreground">{formatCurrency(o.final_price)}</span>
                <Button
                  size="sm"
                  onClick={() => acceptMut.mutate(o.transaction_id)}
                  disabled={acceptMut.isPending}
                >
                  <Check size={14} /> Terima
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
