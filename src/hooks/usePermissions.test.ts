import { describe, expect, it } from 'vitest'

function hasProAccess(tier: string) {
  return tier === 'pro' || tier === 'trial'
}

describe('paid feature access', () => {
  it('unlocks all paid features for Pro', () => {
    expect(hasProAccess('pro')).toBe(true)
  })

  it('unlocks all paid features during trial', () => {
    expect(hasProAccess('trial')).toBe(true)
  })

  it('keeps the permanent free plan limited', () => {
    expect(hasProAccess('free')).toBe(false)
  })

  it('does not grant access to unknown tiers', () => {
    expect(hasProAccess('')).toBe(false)
  })
})
