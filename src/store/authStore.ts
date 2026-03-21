import { create } from 'zustand'
import type { AuthUser } from '@/types'

interface AuthState {
  user: AuthUser | null
  token: string | null
  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

const storedToken = localStorage.getItem('token')
const storedUserRaw = localStorage.getItem('user')
let storedUser: AuthUser | null = null
try {
  storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null
} catch {
  localStorage.removeItem('user')
  localStorage.removeItem('token')
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: storedUser,
  token: storedToken || null,
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
  isAuthenticated: () => !!get().token,
}))
