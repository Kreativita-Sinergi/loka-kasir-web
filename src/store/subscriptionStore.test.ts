import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { deriveStatus, useSubscriptionStore, PAYWALL_COOLDOWN_MS } from './subscriptionStore'
import type { Membership } from '@/types'

const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
const pastDate   = new Date(Date.now() - 1000).toISOString()

function makeMembership(overrides: Partial<Membership>): Membership {
  return {
    id: 'mem-1',
    tier: 'pro',
    type: 'pro',
    is_active: true,
    start_date: new Date().toISOString(),
    end_date: futureDate,
    days_remaining: 30,
    is_pro: true,
    ...overrides,
  } as Membership
}

describe('deriveStatus', () => {
  it('treats a missing membership as EXPIRED (no Free plan to fall back to)', () => {
    expect(deriveStatus(null)).toBe('EXPIRED')
    expect(deriveStatus(undefined)).toBe('EXPIRED')
  })

  it('returns TRIAL for an active trial', () => {
    expect(deriveStatus(makeMembership({ tier: 'trial', type: 'trial' }))).toBe('TRIAL')
  })

  it('returns ACTIVE for an active Pro plan', () => {
    expect(deriveStatus(makeMembership({ tier: 'pro', type: 'pro-yearly' }))).toBe('ACTIVE')
  })

  it('follows the server status/tier from GET /membership', () => {
    expect(deriveStatus(makeMembership({ status: 'expired' }))).toBe('EXPIRED')
    expect(deriveStatus(makeMembership({ tier: 'expired', type: 'pro', is_active: false }))).toBe('EXPIRED')
    expect(deriveStatus(makeMembership({ is_active: false }))).toBe('EXPIRED')
  })

  it('locks when the end date has passed client-side, even if stale data says active', () => {
    expect(deriveStatus(makeMembership({ tier: 'pro', end_date: pastDate }))).toBe('EXPIRED')
    expect(deriveStatus(makeMembership({ tier: 'trial', end_date: pastDate }))).toBe('EXPIRED')
  })

  it('treats a legacy free membership as EXPIRED', () => {
    expect(deriveStatus(makeMembership({ tier: 'free', type: 'free', end_date: futureDate }))).toBe('EXPIRED')
  })

  it('falls back to type when tier is absent', () => {
    expect(deriveStatus(makeMembership({ tier: '', type: 'trial' }))).toBe('TRIAL')
  })
})

describe('useSubscriptionStore', () => {
  beforeEach(() => useSubscriptionStore.getState().reset())
  afterEach(() => vi.useRealTimers())

  it('starts unseeded', () => {
    expect(useSubscriptionStore.getState().status).toBeNull()
    expect(useSubscriptionStore.getState().paywallOpen).toBe(false)
  })

  it('a membership fetched before a 402 cannot unlock the business again', () => {
    const fetchedBefore = Date.now() - 10_000
    useSubscriptionStore.getState().setStatus('EXPIRED')
    useSubscriptionStore.getState().syncFromMembership(makeMembership({}), fetchedBefore)
    expect(useSubscriptionStore.getState().status).toBe('EXPIRED')
  })

  it('a membership fetched after renewal unlocks the business', () => {
    useSubscriptionStore.getState().setStatus('EXPIRED')
    useSubscriptionStore.getState().syncFromMembership(makeMembership({}), Date.now() + 1)
    expect(useSubscriptionStore.getState().status).toBe('ACTIVE')
  })

  it('opens a single paywall and debounces re-opening right after it is closed', () => {
    vi.useFakeTimers()
    const s = useSubscriptionStore.getState()
    s.openPaywall()
    s.openPaywall()
    expect(useSubscriptionStore.getState().paywallOpen).toBe(true)
    s.closePaywall()
    s.openPaywall()
    expect(useSubscriptionStore.getState().paywallOpen).toBe(false)
    vi.advanceTimersByTime(PAYWALL_COOLDOWN_MS + 1)
    s.openPaywall()
    expect(useSubscriptionStore.getState().paywallOpen).toBe(true)
  })

  it('reset clears status and paywall', () => {
    useSubscriptionStore.getState().setStatus('EXPIRED')
    useSubscriptionStore.getState().openPaywall()
    useSubscriptionStore.getState().reset()
    expect(useSubscriptionStore.getState().status).toBeNull()
    expect(useSubscriptionStore.getState().paywallOpen).toBe(false)
  })
})
