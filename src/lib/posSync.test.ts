import { describe, it, expect } from 'vitest'
import { generateIdempotencyKey } from './posSync'

const items = [
  { item_type: 'PRODUCT', reference_id: 'b', quantity: 1 },
  { item_type: 'PRODUCT', reference_id: 'a', quantity: 2 },
]

describe('generateIdempotencyKey', () => {
  it('produces a 64-char SHA-256 hex', async () => {
    const key = await generateIdempotencyKey({ outletId: 'o1', timestampMs: 1000, items })
    expect(key).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic for identical input', async () => {
    const a = await generateIdempotencyKey({ outletId: 'o1', timestampMs: 1000, items })
    const b = await generateIdempotencyKey({ outletId: 'o1', timestampMs: 1000, items })
    expect(a).toBe(b)
  })

  it('is independent of item order (sorted by reference_id)', async () => {
    const a = await generateIdempotencyKey({ outletId: 'o1', timestampMs: 1000, items })
    const b = await generateIdempotencyKey({ outletId: 'o1', timestampMs: 1000, items: [...items].reverse() })
    expect(a).toBe(b)
  })

  it('changes when quantity changes (new sale, not a resend)', async () => {
    const a = await generateIdempotencyKey({ outletId: 'o1', timestampMs: 1000, items })
    const b = await generateIdempotencyKey({
      outletId: 'o1',
      timestampMs: 1000,
      items: [{ item_type: 'PRODUCT', reference_id: 'a', quantity: 3 }, items[0]],
    })
    expect(a).not.toBe(b)
  })

  it('changes with outlet or timestamp', async () => {
    const base = await generateIdempotencyKey({ outletId: 'o1', timestampMs: 1000, items })
    const diffOutlet = await generateIdempotencyKey({ outletId: 'o2', timestampMs: 1000, items })
    const diffTime = await generateIdempotencyKey({ outletId: 'o1', timestampMs: 2000, items })
    expect(base).not.toBe(diffOutlet)
    expect(base).not.toBe(diffTime)
  })
})
