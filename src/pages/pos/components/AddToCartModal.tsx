import { useMemo, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { formatCurrency, cn } from '@/lib/utils'
import type { Product, ProductVariant, ProductAttribute } from '@/types'
import { resolveSellPrice, type CartItem } from '@/pages/pos/types'

interface Props {
  product: Product | null
  onClose: () => void
  onAdd: (item: Omit<CartItem, 'lineId'>) => void
}

/** Tax percent estimate for client-side display (server is authoritative). */
function taxPercentOf(product: Product): number {
  if (!product.is_taxable || !product.tax) return 0
  return product.tax.is_percentage ? product.tax.amount : 0
}

export default function AddToCartModal({ product, onClose, onAdd }: Props) {
  const [variant, setVariant] = useState<ProductVariant | null>(null)
  const [modifiers, setModifiers] = useState<ProductAttribute[]>([])
  const [qty, setQty] = useState(1)

  const variants = product?.variants ?? []
  const hasVariants = !!product?.has_variant && variants.length > 0
  const attributes = (product?.attributes ?? []).filter((a) => a.is_active && a.is_available)

  const unitPrice = useMemo(() => {
    if (!product) return 0
    const base = resolveSellPrice(variant ?? product)
    const mods = modifiers.reduce((s, m) => s + (m.price ?? 0), 0)
    return base + mods
  }, [product, variant, modifiers])

  if (!product) return null

  const canAdd = !hasVariants || variant !== null

  const toggleModifier = (m: ProductAttribute) =>
    setModifiers((prev) =>
      prev.some((x) => x.id === m.id) ? prev.filter((x) => x.id !== m.id) : [...prev, m],
    )

  const handleAdd = () => {
    const chosen = variant ?? null
    onAdd({
      itemType: chosen ? 'VARIANT' : 'PRODUCT',
      referenceId: chosen ? chosen.id : product.id,
      productId: product.id,
      variantId: chosen?.id ?? null,
      name: chosen ? `${product.name} — ${chosen.name}` : product.name,
      image: product.image,
      unitPrice: resolveSellPrice(chosen ?? product),
      quantity: qty,
      modifiers,
      isTaxable: product.is_taxable,
      taxPercent: taxPercentOf(product),
      discountPerUnit: 0,
      notes: null,
    })
    onClose()
  }

  return (
    <Modal open={!!product} onClose={onClose} title={product.name} size="md">
      <div className="space-y-5">
        {hasVariants && (
          <div>
            <p className="text-sm font-medium mb-2">Pilih Varian</p>
            <div className="grid grid-cols-2 gap-2">
              {variants
                .filter((v) => v.is_active && v.is_available)
                .map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVariant(v)}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-left text-sm transition',
                      variant?.id === v.id
                        ? 'border-primary bg-primary-subtle'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    <span className="block font-medium">{v.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(resolveSellPrice(v))}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {attributes.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Tambahan</p>
            <div className="space-y-2">
              {attributes.map((m) => {
                const checked = modifiers.some((x) => x.id === m.id)
                return (
                  <label
                    key={m.id}
                    className="flex items-center justify-between rounded-xl border border-border px-3 py-2 cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleModifier(m)}
                        className="accent-primary"
                      />
                      {m.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      + {formatCurrency(m.price)}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Jumlah</span>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => setQty((q) => Math.max(1, q - 1))}>
              <Minus size={16} />
            </Button>
            <span className="w-8 text-center font-semibold">{qty}</span>
            <Button variant="outline" size="icon" onClick={() => setQty((q) => q + 1)}>
              <Plus size={16} />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="text-lg font-bold">{formatCurrency(unitPrice * qty)}</span>
        </div>

        <Button className="w-full" disabled={!canAdd} onClick={handleAdd}>
          {canAdd ? 'Tambah ke Keranjang' : 'Pilih varian dulu'}
        </Button>
      </div>
    </Modal>
  )
}
