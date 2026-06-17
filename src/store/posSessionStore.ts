// Per-cashier POS session. Mirrors the app: a shift is opened FOR a selected
// cashier (employee) — so transactions are attributed to that cashier, not the
// logged-in owner. `cashierId` + `shiftId` are set once the open/continue-shift
// flow completes (see ShiftGate); cleared on close/logout.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SelectedCustomer {
  id: string
  name: string
  phone?: string | null
  points?: number
}

interface PosSessionState {
  // Active shift context (set by ShiftGate after open/continue)
  cashierId: string | null
  cashierName: string | null
  shiftId: string | null
  terminalId: string | null

  // Per-sale selections
  orderTypeId: number | null
  tableId: string | null
  customer: SelectedCustomer | null
  customerName: string | null

  startShift: (info: { cashierId: string; cashierName: string; shiftId: string; terminalId: string | null }) => void
  endShift: () => void
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
      cashierId: null,
      cashierName: null,
      shiftId: null,
      terminalId: null,
      orderTypeId: null,
      tableId: null,
      customer: null,
      customerName: null,

      startShift: ({ cashierId, cashierName, shiftId, terminalId }) =>
        set({ cashierId, cashierName, shiftId, terminalId }),
      endShift: () =>
        set({
          cashierId: null,
          cashierName: null,
          shiftId: null,
          terminalId: null,
          tableId: null,
          customer: null,
          customerName: null,
        }),
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
