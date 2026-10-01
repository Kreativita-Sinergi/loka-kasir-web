import { create } from 'zustand'
import type { Outlet } from '@/types'
import { normalizeTextData } from '@/lib/textCase'

interface OutletState {
  selected: Outlet | null
  setOutlet: (outlet: Outlet | null) => void
}

const stored = localStorage.getItem('selected_outlet')
let storedOutlet: Outlet | null = null
try {
  storedOutlet = stored ? normalizeTextData(JSON.parse(stored), 'display') : null
} catch {
  localStorage.removeItem('selected_outlet')
}

export const useOutletStore = create<OutletState>((set) => ({
  selected: storedOutlet,
  setOutlet: (outlet) => {
    if (outlet) {
      localStorage.setItem('selected_outlet', JSON.stringify(normalizeTextData(outlet, 'storage')))
    } else {
      localStorage.removeItem('selected_outlet')
    }
    set({ selected: normalizeTextData(outlet, 'display') })
  },
}))
