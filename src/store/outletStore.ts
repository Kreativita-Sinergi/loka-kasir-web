import { create } from 'zustand'
import type { Outlet } from '@/types'
import { normalizeTextData } from '@/lib/textCase'

interface OutletState {
  selected: Outlet | null
  setOutlet: (outlet: Outlet | null) => void
  /** Outlet yang ditolak server (OUTLET_NOT_ASSIGNED) selama sesi ini. */
  rejectedIds: string[]
  /** Lepas outlet aktif karena karyawan tidak bertugas di sana. */
  rejectOutlet: (outletId: string) => void
}

const stored = localStorage.getItem('selected_outlet')
let storedOutlet: Outlet | null = null
try {
  storedOutlet = stored ? normalizeTextData(JSON.parse(stored), 'display') : null
} catch {
  localStorage.removeItem('selected_outlet')
}

export const useOutletStore = create<OutletState>((set, get) => ({
  selected: storedOutlet,
  // Hanya di memori, tidak disimpan: penugasan bisa berubah kapan saja, dan
  // gunanya cuma mencegah pemilih outlet memilih ulang outlet yang sama
  // secara otomatis lalu ditolak lagi berulang-ulang.
  rejectedIds: [],
  rejectOutlet: (outletId) => {
    const { selected, rejectedIds, setOutlet } = get()
    if (!rejectedIds.includes(outletId)) set({ rejectedIds: [...rejectedIds, outletId] })
    if (selected?.id === outletId) setOutlet(null)
  },
  setOutlet: (outlet) => {
    if (outlet) {
      localStorage.setItem('selected_outlet', JSON.stringify(normalizeTextData(outlet, 'storage')))
    } else {
      localStorage.removeItem('selected_outlet')
    }
    set({ selected: normalizeTextData(outlet, 'display') })
  },
}))
