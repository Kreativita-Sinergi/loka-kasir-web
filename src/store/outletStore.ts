import { create } from 'zustand'
import type { Outlet } from '@/types'

interface OutletState {
  selected: Outlet | null
  setOutlet: (outlet: Outlet | null) => void
}

const stored = localStorage.getItem('selected_outlet')
let storedOutlet: Outlet | null = null
try {
  storedOutlet = stored ? JSON.parse(stored) : null
} catch {
  localStorage.removeItem('selected_outlet')
}

export const useOutletStore = create<OutletState>((set) => ({
  selected: storedOutlet,
  setOutlet: (outlet) => {
    if (outlet) {
      localStorage.setItem('selected_outlet', JSON.stringify(outlet))
    } else {
      localStorage.removeItem('selected_outlet')
    }
    set({ selected: outlet })
  },
}))
