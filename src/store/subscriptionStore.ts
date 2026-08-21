import { create } from 'zustand'
import type { Membership } from '@/types'

// ─── Status model ─────────────────────────────────────────────────────────────
//
//  TRIAL   — within the free trial period (tier === 'trial', not expired)
//  ACTIVE  — paid Pro subscription, not expired
//  FREE    — permanent free tier (tier === 'free'), limited features & quota
//  EXPIRED — end_date is in the past AND tier is not 'free', OR no membership
//  null    — not yet seeded (store just initialised, user not yet loaded)

export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'FREE' | 'EXPIRED' | null

/**
 * Derives the canonical status from a Membership record.
 *
 * Called in two places:
 *  1. SubscriptionGuard (proactive — on every render, falling back to
 *     authStore data so the guard is correct even before any 402 is received)
 *  2. MembershipPage.onSuccess (after a successful upgrade, to immediately
 *     clear the lockout without waiting for a new 402 signal)
 */
export function deriveStatus(membership: Membership | null | undefined): SubscriptionStatus {
  if (!membership) return 'EXPIRED'
  // Use tier field if available (new API), fallback to type for legacy
  const tier = membership.tier ?? membership.type
  if (tier === 'free') return 'FREE'
  if (new Date(membership.end_date) <= new Date()) return 'EXPIRED'
  return tier === 'trial' ? 'TRIAL' : 'ACTIVE'
}

interface SubscriptionState {
  /**
   * null  → store not yet seeded; SubscriptionGuard will fall back to
   *          deriving status from authStore.user.business.membership.
   * other → explicitly set by a 402 response or a successful upgrade.
   */
  status: SubscriptionStatus
  setStatus: (status: SubscriptionStatus) => void
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  status: null,
  setStatus: (status) => set({ status }),
}))
