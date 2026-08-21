import { create } from 'zustand'
import type { AuthUser, Membership, PermissionCode } from '@/types'
import { useOutletStore } from './outletStore'
import { useSubscriptionStore } from './subscriptionStore'
import { queryClient } from '@/lib/queryClient'
import { applyBusinessMoney } from '@/lib/money'

interface AuthState {
  user: AuthUser | null
  token: string | null

  /** Persist user + token after a successful login. */
  setAuth: (user: AuthUser, token: string) => void

  /** Wipe all auth state on logout or 401. */
  clearAuth: () => void

  /** Patch business image URL without requiring a full re-login. */
  setBusinessImage: (imageUrl: string | null) => void

  /**
   * Patch the active membership (tier/type/dates) without a full re-login.
   * Dipanggil saat data membership terbaru diambil dari API agar keputusan
   * akses fitur (usePermissions.isPro) tidak memakai data login basi.
   */
  setMembership: (membership: Membership) => void

  isAuthenticated: () => boolean

  /**
   * Returns true if the logged-in user has the given permission code.
   *
   * Owner role short-circuits to true for every permission — this
   * matches the backend seeder where Owner gets all permissions.
   */
  can: (code: PermissionCode) => boolean

  /**
   * Returns true if the user has ANY of the listed permission codes.
   * Useful for showing a section visible to multiple roles
   * (e.g. both Kasir and Manager can view shifts).
   */
  canAny: (...codes: PermissionCode[]) => boolean
}

// ── Bootstrap from localStorage (survives page refresh) ──────────────────────
const storedToken = localStorage.getItem('token')
const storedUserRaw = localStorage.getItem('user')
let storedUser: AuthUser | null = null
try {
  storedUser = storedUserRaw ? (JSON.parse(storedUserRaw) as AuthUser) : null
} catch {
  localStorage.removeItem('user')
  localStorage.removeItem('token')
}

// Mata uang dipulihkan saat modul dimuat, bukan setelah render pertama. Tanpa
// ini, dasbor yang dimuat ulang menampilkan seluruh angka sebagai rupiah selama
// beberapa frame sebelum berkedip ke ¥ — dan halaman yang tidak pernah memuat
// ulang profil bisnisnya tidak akan pernah berubah sama sekali.
applyBusinessMoney({
  currencyCode: storedUser?.business?.currency_code,
  decimalDigits: storedUser?.business?.decimal_digits,
})

export const useAuthStore = create<AuthState>((set, get) => ({
  user: storedUser,
  token: storedToken ?? null,

  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('token', token)
    // Mata uang bisnis diterapkan di sini, bukan di komponen: setiap angka di
    // dasbor melewati lib/money, dan sebagian dirender sebelum komponen mana pun
    // sempat menjalankan efek.
    //
    // Bahasa TIDAK ikut diterapkan — itu pilihan pengguna yang disimpan
    // terpisah (localeStore); memaksanya di setiap login akan membatalkan
    // pilihan pemilik toko setiap kali ia masuk.
    applyBusinessMoney({
      currencyCode: user.business?.currency_code,
      decimalDigits: user.business?.decimal_digits,
    })
    set({ user, token })
  },

  clearAuth: () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    useOutletStore.getState().setOutlet(null)
    useSubscriptionStore.getState().setStatus(null)
    queryClient.clear()
    set({ user: null, token: null })
  },

  setBusinessImage: (imageUrl) => {
    const user = get().user
    if (!user) return
    const updated = { ...user, business: { ...user.business, image: imageUrl } }
    localStorage.setItem('user', JSON.stringify(updated))
    set({ user: updated })
  },

  setMembership: (membership) => {
    const user = get().user
    if (!user) return
    const current = user.business?.membership
    // Hindari update tak perlu (mencegah render berulang) bila tidak berubah.
    if (current && current.tier === membership.tier && current.type === membership.type &&
        current.end_date === membership.end_date && current.is_active === membership.is_active) {
      return
    }
    const updated = { ...user, business: { ...user.business, membership } }
    localStorage.setItem('user', JSON.stringify(updated))
    set({ user: updated })
  },

  isAuthenticated: () => !!get().token,

  can: (code) => {
    const user = get().user
    if (!user) return false
    // Owner always has full access — mirrors backend seeder
    if (user.role?.code === 'OWNER' || user.role?.name === 'Owner') return true
    return user.permissions?.includes(code) ?? false
  },

  canAny: (...codes) => {
    return codes.some((c) => get().can(c))
  },
}))
