import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Minus, Plus, ShoppingCart, X, CheckCircle2, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getPublicMenu,
  createPublicOrder,
  type PublicMenu,
  type SelfOrderItem,
} from '@/api/public'
import type { Product, ProductVariant } from '@/types'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface CartLine {
  key: string
  name: string
  unitPrice: number
  qty: number
  payload: SelfOrderItem
}

const productPrice = (p: Product) => p.final_price ?? p.sell_price ?? 0
const variantPrice = (v: ProductVariant) => v.final_price ?? v.sell_price ?? 0

export default function PublicMenuPage() {
  const { token = '' } = useParams()
  const [cart, setCart] = useState<Record<string, CartLine>>({})
  const [customizing, setCustomizing] = useState<Product | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [notes, setNotes] = useState('')
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['public-menu', token],
    queryFn: () => getPublicMenu(token),
    enabled: !!token,
    retry: false,
  })
  const menu: PublicMenu | undefined = data?.data?.data

  const lines = Object.values(cart)
  const totalQty = lines.reduce((s, l) => s + l.qty, 0)
  const totalPrice = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)

  const orderMut = useMutation({
    mutationFn: () =>
      createPublicOrder(token, {
        customer_name: customerName.trim() || null,
        notes: notes.trim() || null,
        items: lines.map((l) => l.payload),
      }),
    onSuccess: (res) => {
      setPlacedOrderId(res.data.data.transaction_id)
      setCart({})
      setCartOpen(false)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const addLine = (key: string, name: string, unitPrice: number, payload: SelfOrderItem) => {
    setCart((prev) => {
      const existing = prev[key]
      return { ...prev, [key]: existing
        ? { ...existing, qty: existing.qty + 1 }
        : { key, name, unitPrice, qty: 1, payload } }
    })
  }

  const changeQty = (key: string, delta: number) => {
    setCart((prev) => {
      const line = prev[key]
      if (!line) return prev
      const qty = line.qty + delta
      if (qty <= 0) {
        const rest = { ...prev }
        delete rest[key]
        return rest
      }
      return { ...prev, [key]: { ...line, qty } }
    })
  }

  // Simple add: produk tanpa varian & tanpa add-on langsung masuk keranjang.
  const quickAdd = (p: Product) => {
    if (p.has_variant || (p.attributes && p.attributes.length > 0)) {
      setCustomizing(p)
      return
    }
    addLine(`p:${p.id}`, p.name, productPrice(p), {
      item_type: 'PRODUCT', reference_id: p.id, quantity: 1, attributes: [],
    })
    toast.success(`${p.name} ditambahkan`)
  }

  if (placedOrderId) return <OrderPlaced menu={menu} />

  if (isLoading) {
    return <CenterMsg><div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></CenterMsg>
  }
  if (isError || !menu) {
    return <CenterMsg><p className="text-gray-600 text-sm text-center max-w-xs">{getErrorMessage(error) || t('menuUnavailable')}</p></CenterMsg>
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          {menu.business_logo && (
            <img src={menu.business_logo} alt="" className="w-10 h-10 rounded-lg object-cover" />
          )}
          <div>
            <h1 className="font-bold text-gray-900 leading-tight">{menu.business_name}</h1>
            <p className="text-xs text-gray-500">{t('menuOutletTable', { outlet: menu.outlet_name, n: menu.table_number })}</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        {menu.categories.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-12">{t('menuEmpty')}</p>
        )}
        {menu.categories.map((cat) => (
          <section key={cat.id ?? cat.name}>
            <h2 className="font-semibold text-gray-900 mb-2">{cat.name}</h2>
            <div className="space-y-2">
              {cat.products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => quickAdd(p)}
                  className="w-full flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-3 text-left hover:border-blue-300 transition"
                >
                  {p.image
                    ? <img src={p.image} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    : <div className="w-16 h-16 rounded-lg bg-gray-100 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{p.name}</p>
                    {p.description && <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>}
                    <p className="text-sm font-semibold text-blue-600 mt-1">
                      {formatCurrency(productPrice(p))}
                      {p.has_variant && <span className="text-xs text-gray-400 font-normal"> {t('menuPickVariant')}</span>}
                    </p>
                  </div>
                  <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Plus size={16} />
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Cart bar */}
      {totalQty > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 left-4 right-4 max-w-2xl mx-auto bg-blue-600 text-white rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-lg"
        >
          <span className="flex items-center gap-2 font-semibold">
            <ShoppingCart size={18} /> {totalQty} item
          </span>
          <span className="font-bold">{formatCurrency(totalPrice)}</span>
        </button>
      )}

      {customizing && (
        <CustomizeSheet
          product={customizing}
          onClose={() => setCustomizing(null)}
          onAdd={addLine}
        />
      )}

      {cartOpen && (
        <CartSheet
          lines={lines}
          totalPrice={totalPrice}
          customerName={customerName}
          notes={notes}
          submitting={orderMut.isPending}
          onName={setCustomerName}
          onNotes={setNotes}
          onChangeQty={changeQty}
          onClose={() => setCartOpen(false)}
          onSubmit={() => orderMut.mutate()}
        />
      )}
    </div>
  )
}

// ─── Customize sheet (variants + add-ons) ────────────────────────────────────

function CustomizeSheet({
  product, onClose, onAdd,
}: {
  product: Product
  onClose: () => void
  onAdd: (key: string, name: string, unitPrice: number, payload: SelfOrderItem) => void
}) {
  const variants = (product.variants ?? []).filter((v) => v.is_available && v.is_active)
  const addons = (product.attributes ?? []).filter((a) => a.is_available && a.is_active)
  const [variantId, setVariantId] = useState<string>(variants[0]?.id ?? '')
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set())

  const variant = variants.find((v) => v.id === variantId)
  const base = product.has_variant && variant ? variantPrice(variant) : productPrice(product)
  const addonPrice = addons.filter((a) => selectedAddons.has(a.id)).reduce((s, a) => s + a.price, 0)
  const unitPrice = base + addonPrice
  const needsVariant = product.has_variant && variants.length > 0

  const toggleAddon = (id: string) =>
    setSelectedAddons((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  const handleAdd = () => {
    if (needsVariant && !variant) { toast.error(t('menuPickVariantFirst')); return }
    const chosenAddons = addons.filter((a) => selectedAddons.has(a.id))
    const key = `${variant ? `v:${variant.id}` : `p:${product.id}`}|${chosenAddons.map((a) => a.id).sort().join(',')}`
    const name = variant ? `${product.name} (${variant.name})` : product.name
    onAdd(key, name, unitPrice, {
      item_type: variant ? 'VARIANT' : 'PRODUCT',
      reference_id: variant ? variant.id : product.id,
      quantity: 1,
      attributes: chosenAddons.map((a) => ({ product_attribute_id: a.id, additional_price: a.price })),
    })
    toast.success(`${name} ditambahkan`)
    onClose()
  }

  return (
    <Sheet onClose={onClose} title={product.name}>
      {needsVariant && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">{t('menuVariant')}</p>
          <div className="space-y-2">
            {variants.map((v) => (
              <label key={v.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 cursor-pointer">
                <span className="flex items-center gap-2 text-sm">
                  <input type="radio" name="variant" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />
                  {v.name}
                </span>
                <span className="text-sm font-semibold text-gray-700">{formatCurrency(variantPrice(v))}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {addons.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">{t('menuAddons')}</p>
          <div className="space-y-2">
            {addons.map((a) => (
              <label key={a.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 cursor-pointer">
                <span className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selectedAddons.has(a.id)} onChange={() => toggleAddon(a.id)} />
                  {a.name}
                </span>
                <span className="text-sm font-semibold text-gray-700">+{formatCurrency(a.price)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleAdd} className="w-full bg-blue-600 text-white font-semibold rounded-xl py-3">
        {t('menuAddPrice', { price: formatCurrency(unitPrice) })}
      </button>
    </Sheet>
  )
}

// ─── Cart sheet ──────────────────────────────────────────────────────────────

function CartSheet({
  lines, totalPrice, customerName, notes, submitting,
  onName, onNotes, onChangeQty, onClose, onSubmit,
}: {
  lines: CartLine[]
  totalPrice: number
  customerName: string
  notes: string
  submitting: boolean
  onName: (v: string) => void
  onNotes: (v: string) => void
  onChangeQty: (key: string, delta: number) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <Sheet onClose={onClose} title={t('menuYourOrder')}>
      <div className="space-y-3 mb-4">
        {lines.map((l) => (
          <div key={l.key} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{l.name}</p>
              <p className="text-xs text-gray-500">{formatCurrency(l.unitPrice)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onChangeQty(l.key, -1)} className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center"><Minus size={14} /></button>
              <span className="w-6 text-center text-sm font-semibold">{l.qty}</span>
              <button onClick={() => onChangeQty(l.key, 1)} className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center"><Plus size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 mb-4">
        <input
          value={customerName}
          onChange={(e) => onName(e.target.value)}
          placeholder={t('menuNameOptional')}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <textarea
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          placeholder={t('menuNoteExample')}
          rows={2}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-600">{t('labelTotal')}</span>
        <span className="text-lg font-bold text-gray-900">{formatCurrency(totalPrice)}</span>
      </div>
      <button
        onClick={onSubmit}
        disabled={submitting || lines.length === 0}
        className="w-full bg-blue-600 text-white font-semibold rounded-xl py-3 disabled:opacity-60"
      >
        {submitting ? 'Mengirim...' : t('menuSendOrder')}
      </button>
      <p className="text-xs text-gray-400 text-center mt-2">{t('menuPayAtCounter')}</p>
    </Sheet>
  )
}

// ─── Order placed confirmation ───────────────────────────────────────────────

function OrderPlaced({ menu }: { menu: PublicMenu | undefined }) {
  return (
    <CenterMsg>
      <div className="text-center max-w-xs">
        <CheckCircle2 size={56} className="text-green-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-1">{t('menuOrderSent')}</h1>
        <p className="text-sm text-gray-600 mb-4">
          {menu ? t('menuTableAt', { n: menu.table_number, outlet: menu.outlet_name }) : ''}
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-xl py-2.5 px-4">
          <Clock size={16} /> {t('menuAwaitingCashier')}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 text-sm font-semibold text-blue-600"
        >
          {t('menuOrderAgain')}
        </button>
      </div>
    </CenterMsg>
  )
}

// ─── Shared UI ───────────────────────────────────────────────────────────────

function CenterMsg({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">{children}</div>
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog">
      {/* Backdrop visual saja — klik luar tidak menutup (tutup via tombol X). */}
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-2xl bg-white rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
