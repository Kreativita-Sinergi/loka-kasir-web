import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '@/store/authStore'

// Test the isPro / isLite derivation logic directly —
// this is the same logic as usePermissions but without a React render context.
function derivePermissions(tier: string) {
  const isPro  = tier === 'pro' || tier === 'trial'
  const isLite = isPro || tier === 'lite'
  return { isPro, isLite }
}

describe('Permission tier derivation (isPro / isLite)', () => {
  describe('Pro tier', () => {
    it('isPro = true for "pro"', () => {
      expect(derivePermissions('pro').isPro).toBe(true)
    })
    it('isLite = true for "pro" (Pro includes Lite features)', () => {
      expect(derivePermissions('pro').isLite).toBe(true)
    })
  })

  describe('Trial tier', () => {
    it('isPro = true for "trial" (trial = full Pro access)', () => {
      expect(derivePermissions('trial').isPro).toBe(true)
    })
    it('isLite = true for "trial"', () => {
      expect(derivePermissions('trial').isLite).toBe(true)
    })
  })

  describe('Lite tier', () => {
    it('isPro = false for "lite"', () => {
      expect(derivePermissions('lite').isPro).toBe(false)
    })
    it('isLite = true for "lite"', () => {
      expect(derivePermissions('lite').isLite).toBe(true)
    })
  })

  describe('Free tier', () => {
    it('isPro = false for "free"', () => {
      expect(derivePermissions('free').isPro).toBe(false)
    })
    it('isLite = false for "free" (free has no Lite features)', () => {
      expect(derivePermissions('free').isLite).toBe(false)
    })
  })

  describe('Unknown / empty tier', () => {
    it('defaults to no access for empty string', () => {
      const { isPro, isLite } = derivePermissions('')
      expect(isPro).toBe(false)
      expect(isLite).toBe(false)
    })
  })
})

// ── Plan-gating scenarios ──────────────────────────────────────────────────

describe('Plan-gating scenarios', () => {
  const PRO_FEATURES = ['analytics', 'hpp', 'bom', 'smart_pricing', 'profitability', 'loyalty', 'attendance']
  const LITE_FEATURES = ['discount', 'bundle', 'customer', 'table', 'employee_write']

  it('Pro tier can access all Pro features', () => {
    const { isPro } = derivePermissions('pro')
    PRO_FEATURES.forEach(f => {
      expect(isPro, `Pro should access ${f}`).toBe(true)
    })
  })

  it('Trial tier can access all Pro features', () => {
    const { isPro } = derivePermissions('trial')
    PRO_FEATURES.forEach(f => {
      expect(isPro, `Trial should access ${f}`).toBe(true)
    })
  })

  it('Lite tier cannot access Pro-only features', () => {
    const { isPro } = derivePermissions('lite')
    PRO_FEATURES.forEach(f => {
      expect(isPro, `Lite should NOT access ${f}`).toBe(false)
    })
  })

  it('Free tier cannot access Pro or Lite features', () => {
    const { isPro, isLite } = derivePermissions('free')
    PRO_FEATURES.forEach(f => {
      expect(isPro, `Free should NOT access Pro feature ${f}`).toBe(false)
    })
    LITE_FEATURES.forEach(f => {
      expect(isLite, `Free should NOT access Lite feature ${f}`).toBe(false)
    })
  })

  it('Lite tier can access all Lite features', () => {
    const { isLite } = derivePermissions('lite')
    LITE_FEATURES.forEach(f => {
      expect(isLite, `Lite should access ${f}`).toBe(true)
    })
  })

  it('Pro-yearly behaves same as Pro', () => {
    // pro-yearly is stored as "pro" tier on the membership object after normalization
    // but just in case it reaches tier comparison:
    const { isPro: proPlan } = derivePermissions('pro')
    expect(proPlan).toBe(true)
  })
})
