import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyReferral } from '@/api/referral'
import { applyPendingReferral, capturePendingReferral, pendingReferralCode } from './pendingReferral'

vi.mock('@/api/referral', () => ({ applyReferral: vi.fn(), isReferralCode: (code: string) => /^[A-Z0-9]{4,12}$/.test(code) }))

describe('referral signup and OTP handover', () => {
  beforeEach(() => { sessionStorage.clear(); vi.resetAllMocks() })
  it('normalizes and applies the 12-character sales code before clearing it', async () => {
    expect(capturePendingReferral(' saleabcdefgh ')).toBe('SALEABCDEFGH')
    vi.mocked(applyReferral).mockResolvedValue({ data: { status: true } } as never)
    expect(await applyPendingReferral()).toBe(true)
    expect(applyReferral).toHaveBeenCalledWith('SALEABCDEFGH')
    expect(pendingReferralCode()).toBe(null)
  })
  it('keeps the code when apply fails and retries after OTP or membership recovery', async () => {
    capturePendingReferral('SALEABCDEFGH')
    vi.mocked(applyReferral).mockRejectedValueOnce(new Error('offline'))
    await expect(applyPendingReferral()).rejects.toThrow('offline')
    expect(pendingReferralCode()).toBe('SALEABCDEFGH')
    vi.mocked(applyReferral).mockResolvedValue({ data: { status: true } } as never)
    await expect(applyPendingReferral('SALEABCDEFGH')).resolves.toBe(true)
    expect(pendingReferralCode()).toBe(null)
  })
  it('does not lose the code on an unsuccessful API envelope', async () => {
    capturePendingReferral('SALEABCDEFGH')
    vi.mocked(applyReferral).mockResolvedValue({ data: { status: false } } as never)
    await expect(applyPendingReferral()).rejects.toThrow()
    expect(pendingReferralCode()).toBe('SALEABCDEFGH')
  })
  it('accepts OTP navigation state even when session storage did not survive', async () => {
    vi.mocked(applyReferral).mockResolvedValue({ data: { status: true } } as never)
    await expect(applyPendingReferral('saleabcdefgh')).resolves.toBe(true)
    expect(applyReferral).toHaveBeenCalledWith('SALEABCDEFGH')
  })
})
