import { create } from 'zustand'
import type { Membership } from '@/types'

// ─── Status model ─────────────────────────────────────────────────────────────
//
//  TRIAL   — masa trial 14 hari, belum berakhir
//  ACTIVE  — langganan Pro (bulanan/tahunan/3 tahun), belum berakhir
//  EXPIRED — trial/langganan berakhir: usaha TERKUNCI = mode lihat saja.
//            Semua halaman tetap bisa dibuka; penulisan ditolak server (402
//            SUBSCRIPTION_EXPIRED) dan tombol ubah dimatikan lewat useCanWrite.
//
// Tidak ada paket Gratis. Membership `free` lama (sebelum migrasi) atau usaha
// tanpa membership sama sekali diperlakukan sebagai EXPIRED.

export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'EXPIRED'

/** Status langganan dari rekaman membership (GET /membership atau data login).
 *
 * Server adalah sumber kebenaran (`status`/`tier`/`is_active`), tetapi
 * `end_date` juga dicek di sisi klien supaya data login yang sudah basi tidak
 * terus tampil aktif setelah masa trial/paket lewat.
 */
export function deriveStatus(membership: Membership | null | undefined): SubscriptionStatus {
  if (!membership) return 'EXPIRED'
  if ((membership.status ?? '').toLowerCase() === 'expired') return 'EXPIRED'
  // tier (API baru) → type (API lama). Pakai || agar string kosong ikut jatuh.
  const tier = (membership.tier || membership.type || '').toLowerCase()
  if (!tier || tier === 'expired' || tier === 'free') return 'EXPIRED'
  if (membership.is_active === false) return 'EXPIRED'
  if (membership.end_date && new Date(membership.end_date) <= new Date()) return 'EXPIRED'
  return tier === 'trial' ? 'TRIAL' : 'ACTIVE'
}

/** Jeda setelah paywall ditutup sebelum boleh muncul lagi — beberapa
 * permintaan yang gagal bersamaan tidak memunculkan modal berulang. */
export const PAYWALL_COOLDOWN_MS = 1500

interface SubscriptionState {
  /**
   * null  → belum ada sinyal langsung; UI memakai deriveStatus(membership login).
   * other → hasil GET /membership terbaru atau penolakan 402 dari server.
   */
  status: SubscriptionStatus | null
  /** Kapan `status` terakhir diisi (ms epoch) — data membership yang diambil
   * SEBELUM penolakan 402 tidak boleh menimpanya kembali menjadi aktif. */
  statusAt: number
  setStatus: (status: SubscriptionStatus | null) => void
  /** Selaraskan dengan hasil GET /membership yang diambil pada `fetchedAt`. */
  syncFromMembership: (membership: Membership | null | undefined, fetchedAt: number) => void

  /** Modal "Langganan berakhir" yang dibuka oleh penolakan 402. */
  paywallOpen: boolean
  paywallClosedAt: number
  openPaywall: () => void
  closePaywall: () => void
  reset: () => void
}

const initial = { status: null, statusAt: 0, paywallOpen: false, paywallClosedAt: 0 }

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  ...initial,
  setStatus: (status) => set({ status, statusAt: Date.now() }),
  syncFromMembership: (membership, fetchedAt) => {
    if (get().status !== null && fetchedAt < get().statusAt) return
    set({ status: deriveStatus(membership), statusAt: fetchedAt })
  },
  openPaywall: () => {
    const { paywallOpen, paywallClosedAt } = get()
    if (paywallOpen || Date.now() - paywallClosedAt < PAYWALL_COOLDOWN_MS) return
    set({ paywallOpen: true })
  },
  closePaywall: () => set({ paywallOpen: false, paywallClosedAt: Date.now() }),
  reset: () => set(initial),
}))
