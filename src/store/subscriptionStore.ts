import { create } from 'zustand'
import type { Membership } from '@/types'

// ─── Status model ─────────────────────────────────────────────────────────────
//
//  TRIAL   — within the free trial period (tier === 'trial', not expired)
//  ACTIVE  — paid Pro subscription, not expired
//  FREE    — permanent free tier (tier === 'free'), limited features & quota
//  EXPIRED — legacy signal; does not block application access
//  null    — not yet seeded (store just initialised, user not yet loaded)

export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'FREE' | 'EXPIRED' | null

/** Status paket untuk banner dan akses fitur. Paket yang berakhir atau belum
 * tercatat dianggap Free; tidak mengunci seluruh aplikasi.
 */
export function deriveStatus(membership: Membership | null | undefined): SubscriptionStatus {
  if (!membership) return 'FREE'
  // Use tier field if available (new API), fallback to type for legacy
  const tier = (membership.tier || membership.type || 'free').toLowerCase()
  if (tier === 'free') return 'FREE'
  if (!membership.is_active || new Date(membership.end_date) <= new Date()) return 'FREE'
  return tier === 'trial' ? 'TRIAL' : 'ACTIVE'
}

interface SubscriptionState {
  /**
   * null  → store not yet seeded; UI derives status from the membership record.
   * other → explicitly set by a 402 response or a successful upgrade.
   */
  status: SubscriptionStatus
  setStatus: (status: SubscriptionStatus) => void
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  status: null,
  setStatus: (status) => set({ status }),
}))
