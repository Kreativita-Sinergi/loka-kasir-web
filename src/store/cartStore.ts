// Cart state for the web POS. Mirrors the app's `cart_controller.dart`:
// add-or-increment with variant + modifier matching, qty edits, per-item
// discount, and persistence across refreshes (the app keeps the cart alive
// across tab switches via ref.keepAlive()).

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@/pages/pos/types'
import { unitPriceWithModifiers } from '@/pages/pos/types'

function sameModifiers(a: CartItem['modifiers'], b: CartItem['modifiers']): boolean {
  if (a.length !== b.length) return false
  const aIds = new Set(a.map((m) => m.id))
  return b.every((m) => aIds.has(m.id))
}

function makeLineId(): string {
  return (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
}

interface CartState {
  items: CartItem[]
  /** Add a fresh item, merging into an existing identical line when possible. */
  addOrIncrement: (item: Omit<CartItem, 'lineId'>) => void
  setQuantity: (lineId: string, quantity: number) => void
  increment: (lineId: string) => void
  decrement: (lineId: string) => void
  removeItem: (lineId: string) => void
  setItemDiscount: (lineId: string, discountPerUnit: number) => void
  setItemNotes: (lineId: string, notes: string) => void
  replaceAll: (items: CartItem[]) => void
  clear: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addOrIncrement: (incoming) =>
        set((state) => {
          const existing = state.items.find(
            (e) =>
              e.productId === incoming.productId &&
              e.variantId === incoming.variantId &&
              sameModifiers(e.modifiers, incoming.modifiers),
          )
          if (existing) {
            return {
              items: state.items.map((e) =>
                e.lineId === existing.lineId
                  ? { ...e, quantity: e.quantity + incoming.quantity }
                  : e,
              ),
            }
          }
          return { items: [...state.items, { ...incoming, lineId: makeLineId() }] }
        }),

      setQuantity: (lineId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((e) => e.lineId !== lineId)
              : state.items.map((e) =>
                  e.lineId === lineId ? { ...e, quantity } : e,
                ),
        })),

      increment: (lineId) =>
        set((state) => ({
          items: state.items.map((e) =>
            e.lineId === lineId ? { ...e, quantity: e.quantity + 1 } : e,
          ),
        })),

      decrement: (lineId) =>
        set((state) => ({
          items: state.items.flatMap((e) => {
            if (e.lineId !== lineId) return [e]
            const q = e.quantity - 1
            return q <= 0 ? [] : [{ ...e, quantity: q }]
          }),
        })),

      removeItem: (lineId) =>
        set((state) => ({ items: state.items.filter((e) => e.lineId !== lineId) })),

      setItemDiscount: (lineId, discountPerUnit) =>
        set((state) => ({
          items: state.items.map((e) =>
            e.lineId === lineId ? { ...e, discountPerUnit } : e,
          ),
        })),

      setItemNotes: (lineId, notes) =>
        set((state) => ({
          items: state.items.map((e) =>
            e.lineId === lineId ? { ...e, notes } : e,
          ),
        })),

      replaceAll: (items) => set({ items }),
      clear: () => set({ items: [] }),
    }),
    { name: 'pos_cart' },
  ),
)

// ─── Derived totals (pure helpers; mirror app summary calculations) ───────────

export interface CartTotals {
  subtotal: number
  discount: number
  tax: number
  total: number
  itemCount: number
}

export function computeTotals(items: CartItem[]): CartTotals {
  let subtotal = 0
  let discount = 0
  let tax = 0
  let itemCount = 0

  for (const item of items) {
    const unit = unitPriceWithModifiers(item)
    const lineGross = unit * item.quantity
    const lineDiscount = Math.min(item.discountPerUnit * item.quantity, lineGross)
    const lineNet = lineGross - lineDiscount
    const lineTax = item.isTaxable ? (lineNet * item.taxPercent) / 100 : 0

    subtotal += lineGross
    discount += lineDiscount
    tax += lineTax
    itemCount += item.quantity
  }

  const total = subtotal - discount + tax
  return { subtotal, discount, tax, total, itemCount }
}
