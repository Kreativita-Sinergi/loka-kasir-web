// Per-cashier POS session: selected terminal, order type, customer, table.
// The active outlet lives in outletStore; the active shift is fetched live
// from the backend (GET /shift/active/me) inside the POS shell.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SelectedCustomer {
  id: string
  name: string
}

interface PosSessionState {
  terminalId: string | null
  orderTypeId: number | null
  tableId: string | null
  customer: SelectedCustomer | null
  customerName: string | null
  setTerminal: (id: string | null) => void
  setOrderType: (id: number | null) => void
  setTable: (id: string | null) => void
  setCustomer: (c: SelectedCustomer | null) => void
  setCustomerName: (name: string | null) => void
  /** Reset transient selections after a completed sale. */
  resetAfterSale: () => void
}

export const usePosSessionStore = create<PosSessionState>()(
  persist(
    (set) => ({
      terminalId: null,
      orderTypeId: null,
      tableId: null,
      customer: null,
      customerName: null,
      setTerminal: (terminalId) => set({ terminalId }),
      setOrderType: (orderTypeId) => set({ orderTypeId }),
      setTable: (tableId) => set({ tableId }),
      setCustomer: (customer) => set({ customer }),
      setCustomerName: (customerName) => set({ customerName }),
      resetAfterSale: () =>
        set({ tableId: null, customer: null, customerName: null }),
    }),
    { name: 'pos_session' },
  ),
)
