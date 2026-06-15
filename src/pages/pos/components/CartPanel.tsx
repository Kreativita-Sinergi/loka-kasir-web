import { Minus, Plus, ShoppingCart, PauseCircle, ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency, cn } from '@/lib/utils'
import { useCartStore, computeTotals } from '@/store/cartStore'
import { usePosSessionStore } from '@/store/posSessionStore'
import { unitPriceWithModifiers } from '@/pages/pos/types'
import type { OrderType } from '@/types'

interface Props {
  orderTypes: OrderType[]
  heldCount: number
  onCheckout: () => void
  onHold: () => void
  onShowHeld: () => void
}

export default function CartPanel({ orderTypes, heldCount, onCheckout, onHold, onShowHeld }: Props) {
  const items = useCartStore((s) => s.items)
  const increment = useCartStore((s) => s.increment)
  const decrement = useCartStore((s) => s.decrement)
  const removeItem = useCartStore((s) => s.removeItem)
  const clear = useCartStore((s) => s.clear)

  const orderTypeId = usePosSessionStore((s) => s.orderTypeId)
  const setOrderType = usePosSessionStore((s) => s.setOrderType)
  const customerName = usePosSessionStore((s) => s.customerName)
  const setCustomerName = usePosSessionStore((s) => s.setCustomerName)

  const totals = computeTotals(items)
  const empty = items.length === 0

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <ShoppingCart size={18} /> Keranjang
          {totals.itemCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {totals.itemCount}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onShowHeld}>
            <ListChecks size={16} /> {heldCount > 0 && heldCount}
          </Button>
          {!empty && (
            <Button variant="ghost" size="sm" onClick={clear} className="text-destructive">
              Kosongkan
            </Button>
          )}
        </div>
      </div>

      {/* Order type + customer */}
      <div className="space-y-3 border-b border-border px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {orderTypes.map((ot) => (
            <button
              key={ot.id}
              onClick={() => setOrderType(ot.id)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
                orderTypeId === ot.id ? 'border-primary bg-primary-subtle' : 'border-border hover:bg-muted',
              )}
            >
              {ot.name}
            </button>
          ))}
        </div>
        <Input
          value={customerName ?? ''}
          onChange={(e) => setCustomerName(e.target.value || null)}
          placeholder="Nama pelanggan (opsional)"
          className="h-9 text-sm"
        />
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {empty ? (
          <EmptyState icon={<ShoppingCart size={26} />} title="Keranjang kosong" description="Pilih produk untuk memulai transaksi." />
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.lineId} className="rounded-xl px-2 py-2 hover:bg-muted">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    {item.modifiers.length > 0 && (
                      <p className="truncate text-xs text-muted-foreground">
                        {item.modifiers.map((m) => m.name).join(', ')}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(unitPriceWithModifiers(item))}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    {formatCurrency(unitPriceWithModifiers(item) * item.quantity)}
                  </p>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => decrement(item.lineId)}>
                    <Minus size={14} />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => increment(item.lineId)}>
                    <Plus size={14} />
                  </Button>
                  <button
                    onClick={() => removeItem(item.lineId)}
                    className="ml-auto text-xs text-destructive hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Totals + actions */}
      <div className="border-t border-border px-4 py-3">
        <div className="space-y-1 text-sm">
          <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
          {totals.discount > 0 && <Row label="Diskon" value={`- ${formatCurrency(totals.discount)}`} />}
          {totals.tax > 0 && <Row label="Pajak" value={formatCurrency(totals.tax)} />}
          <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
            <span>Total</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" disabled={empty} onClick={onHold}>
            <PauseCircle size={16} /> Tahan
          </Button>
          <Button className="flex-1" disabled={empty} onClick={onCheckout}>
            Bayar · {formatCurrency(totals.total)}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}
