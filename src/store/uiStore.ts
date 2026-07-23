import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  mobileSidebarOpen: boolean
  openMobileSidebar: () => void
  closeMobileSidebar: () => void

  /** Mode Sederhana: sembunyikan menu lanjutan dari Sidebar. */
  simpleMode: boolean
  setSimpleMode: (v: boolean) => void
  toggleSimpleMode: () => void

  /** Banner penjelasan Mode Sederhana sudah pernah ditutup pengguna. */
  simpleModeNoticeSeen: boolean
  dismissSimpleModeNotice: () => void
}

/**
 * Default Mode Sederhana.
 *
 * Pengguna baru (browser bersih, belum pernah login) mulai dari mode sederhana
 * agar Sidebar tidak langsung padat. Pengguna lama — yang sudah punya token di
 * localStorage saat versi ini pertama dimuat — tetap melihat menu lengkap
 * supaya tidak kaget menunya "hilang".
 */
function defaultSimpleMode(): boolean {
  try {
    return !localStorage.getItem('token')
  } catch {
    return true
  }
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      mobileSidebarOpen: false,
      openMobileSidebar: () => set({ mobileSidebarOpen: true }),
      closeMobileSidebar: () => set({ mobileSidebarOpen: false }),

      simpleMode: defaultSimpleMode(),
      setSimpleMode: (v) => set({ simpleMode: v }),
      toggleSimpleMode: () => set({ simpleMode: !get().simpleMode }),

      simpleModeNoticeSeen: false,
      dismissSimpleModeNotice: () => set({ simpleModeNoticeSeen: true }),
    }),
    {
      name: 'loka-ui',
      // mobileSidebarOpen sengaja tidak dipersist — selalu tertutup saat load.
      partialize: (s) => ({
        simpleMode: s.simpleMode,
        simpleModeNoticeSeen: s.simpleModeNoticeSeen,
      }),
    }
  )
)
