import { describe, it, expect, beforeEach } from 'vitest'
import { deriveStatus, useSubscriptionStore } from './subscriptionStore'
import type { Membership } from '@/types'

const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
const pastDate   = new Date(Date.now() - 1000).toISOString()

function makeMembership(overrides: Partial<Membership>): Membership {
  return {
    id: 'mem-1',
    business_id: 'biz-1',
    tier: 'lite',
    type: 'lite',
    is_active: true,
    start_date: new Date().toISOString(),
    end_date: futureDate,
    days_remaining: 30,
    scheduled_downgrade_to: null,
    ...overrides,
  } as Membership
}

describe('deriveStatus', () => {
  it('returns EXPIRED for null membership', () => {
    expect(deriveStatus(null)).toBe('EXPIRED')
  })

  it('returns EXPIRED for undefined membership', () => {
    expect(deriveStatus(undefined)).toBe('EXPIRED')
  })

  it('returns FREE for free tier', () => {
    expect(deriveStatus(makeMembership({ tier: 'free', end_date: futureDate }))).toBe('FREE')
  })

  it('returns TRIAL for active trial', () => {
    expect(deriveStatus(makeMembership({ tier: 'trial', end_date: futureDate }))).toBe('TRIAL')
  })

  it('returns ACTIVE for active lite plan', () => {
    expect(deriveStatus(makeMembership({ tier: 'lite', end_date: futureDate }))).toBe('ACTIVE')
  })

  it('returns ACTIVE for active pro plan', () => {
    expect(deriveStatus(makeMembership({ tier: 'pro', end_date: futureDate }))).toBe('ACTIVE')
  })

  it('returns EXPIRED when end_date is in the past (non-free)', () => {
    expect(deriveStatus(makeMembership({ tier: 'lite', end_date: pastDate }))).toBe('EXPIRED')
  })

  it('returns EXPIRED when trial end_date is in the past', () => {
    expect(deriveStatus(makeMembership({ tier: 'trial', end_date: pastDate }))).toBe('EXPIRED')
  })

  it('FREE tier never expires even if end_date is past', () => {
    expect(deriveStatus(makeMembership({ tier: 'free', end_date: pastDate }))).toBe('FREE')
  })

  it('falls back to type field when tier is not present', () => {
    const m = makeMembership({ tier: undefined as unknown as string, type: 'pro', end_date: futureDate })
    expect(deriveStatus(m)).toBe('ACTIVE')
  })
})

describe('useSubscriptionStore', () => {
  beforeEach(() => {
    useSubscriptionStore.setState({ status: null })
  })

  it('initial status is null', () => {
    expect(useSubscriptionStore.getState().status).toBeNull()
  })

  it('setStatus updates status to ACTIVE', () => {
    useSubscriptionStore.getState().setStatus('ACTIVE')
    expect(useSubscriptionStore.getState().status).toBe('ACTIVE')
  })

  it('setStatus updates status to EXPIRED', () => {
    useSubscriptionStore.getState().setStatus('EXPIRED')
    expect(useSubscriptionStore.getState().status).toBe('EXPIRED')
  })

  it('setStatus updates status to FREE', () => {
    useSubscriptionStore.getState().setStatus('FREE')
    expect(useSubscriptionStore.getState().status).toBe('FREE')
  })

  it('setStatus updates status to TRIAL', () => {
    useSubscriptionStore.getState().setStatus('TRIAL')
    expect(useSubscriptionStore.getState().status).toBe('TRIAL')
  })

  it('setStatus can reset back to null', () => {
    useSubscriptionStore.getState().setStatus('ACTIVE')
    useSubscriptionStore.getState().setStatus(null)
    expect(useSubscriptionStore.getState().status).toBeNull()
  })
})
