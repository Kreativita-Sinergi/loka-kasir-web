import { Trash2, PauseCircle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import { useHeldOrdersStore } from '@/store/heldOrdersStore'
import { computeTotals } from '@/store/cartStore'
import type { HeldOrder } from '@/pages/pos/types'

interface Props {
  open: boolean
  onClose: () => void
  onRecall: (order: HeldOrder) => void
}

export default function HeldOrdersDrawer({ open, onClose, onRecall }: Props) {
  const orders = useHeldOrdersStore((s) => s.orders)
  const recall = useHeldOrdersStore((s) => s.recall)
  const remove = useHeldOrdersStore((s) => s.remove)

  return (
    <Modal open={open} onClose={onClose} title="Pesanan Ditahan" size="md">
      {orders.length === 0 ? (
        <EmptyState icon={<PauseCircle size={26} />} title="Belum ada pesanan ditahan" description="Tahan keranjang untuk melayani pelanggan lain." />
      ) : (
        <div className="space-y-2">
          {orders.map((o) => {
            const totals = computeTotals(o.items)
            return (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5"
              >
                <div>
                  <p className="font-medium text-sm">{o.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {totals.itemCount} item · {formatCurrency(totals.total)} ·{' '}
                    {new Date(o.heldAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      const found = recall(o.id)
                      if (found) {
                        onRecall(found)
                        onClose()
                      }
                    }}
                  >
                    Buka
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(o.id)}>
                    <Trash2 size={16} className="text-destructive" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
