import { describe, expect, it } from 'vitest'
import { defaultLedgerRange, isValidVoidReason, newIdempotencyKey, occurredAtFor, transferPreview } from './cashBook'

describe('isValidVoidReason', () => {
  it('requires 3..200 characters after trimming', () => {
    expect(isValidVoidReason('  ab ')).toBe(false)
    expect(isValidVoidReason('abc')).toBe(true)
    expect(isValidVoidReason('x'.repeat(200))).toBe(true)
    expect(isValidVoidReason('x'.repeat(201))).toBe(false)
  })
})

describe('newIdempotencyKey', () => {
  it('produces distinct UUID-shaped keys', () => {
    const a = newIdempotencyKey()
    const b = newIdempotencyKey()
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(a).not.toBe(b)
  })
})

describe('occurredAtFor', () => {
  const now = new Date(2026, 9, 30, 14, 25, 10)
  it('lets the server stamp today', () => {
    expect(occurredAtFor('2026-10-30', now)).toBeUndefined()
    expect(occurredAtFor('', now)).toBeUndefined()
  })
  it('keeps the chosen local calendar date with the current time of day', () => {
    const iso = occurredAtFor('2026-10-28', now)!
    const parsed = new Date(iso)
    expect([parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), parsed.getHours(), parsed.getMinutes()]).toEqual([2026, 9, 28, 14, 25])
  })
})

describe('defaultLedgerRange', () => {
  it('spans the start of the month to today', () => {
    expect(defaultLedgerRange(new Date(2026, 9, 30, 1))).toEqual({ start: '2026-10-01', end: '2026-10-30' })
  })
})

describe('transferPreview', () => {
  it('moves the amount between both balances', () => {
    expect(transferPreview(500000, 100000, 200000)).toEqual({ fromAfter: 300000, toAfter: 300000 })
  })
  it('keeps unknown balances unknown and ignores invalid amounts', () => {
    expect(transferPreview(null, 100000, 50000)).toEqual({ fromAfter: null, toAfter: 150000 })
    expect(transferPreview(500000, 0, Number.NaN)).toEqual({ fromAfter: 500000, toAfter: 0 })
  })
})
