// Held (parked) orders for the web POS. Mirrors the app's held-orders feature
// (`held_orders_controller.dart` + `held_orders_sheet.dart`): the cashier can
// park the current cart and recall it later. Persisted across refreshes.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, HeldOrder } from '@/pages/pos/types'

interface HeldOrdersState {
  orders: HeldOrder[]
  hold: (order: Omit<HeldOrder, 'id' | 'heldAt'>) => void
  recall: (id: string) => HeldOrder | undefined
  remove: (id: string) => void
  clear: () => void
}

export const useHeldOrdersStore = create<HeldOrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      hold: (order) =>
        set((state) => ({
          orders: [
            ...state.orders,
            {
              ...order,
              id: crypto.randomUUID?.() ?? `${Date.now()}`,
              heldAt: Date.now(),
            },
          ],
        })),
      recall: (id) => {
        const found = get().orders.find((o) => o.id === id)
        if (found) set((state) => ({ orders: state.orders.filter((o) => o.id !== id) }))
        return found
      },
      remove: (id) =>
        set((state) => ({ orders: state.orders.filter((o) => o.id !== id) })),
      clear: () => set({ orders: [] }),
    }),
    { name: 'pos_held_orders' },
  ),
)

export type { CartItem }
