import { create } from 'zustand'
import type { AuthUser, PermissionCode } from '@/types'

interface AuthState {
  user: AuthUser | null
  token: string | null

  /** Persist user + token after a successful login. */
  setAuth: (user: AuthUser, token: string) => void

  /** Wipe all auth state on logout or 401. */
  clearAuth: () => void

  /** Patch business image URL without requiring a full re-login. */
  setBusinessImage: (imageUrl: string | null) => void

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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: storedUser,
  token: storedToken ?? null,

  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('token', token)
    set({ user, token })
  },

  clearAuth: () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },

  setBusinessImage: (imageUrl) => {
    const user = get().user
    if (!user) return
    const updated = { ...user, business: { ...user.business, image: imageUrl } }
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
