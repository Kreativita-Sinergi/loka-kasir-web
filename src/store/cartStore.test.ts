import { describe, it, expect } from 'vitest'
import { computeTotals } from './cartStore'
import type { CartItem } from '@/pages/pos/types'

function item(over: Partial<CartItem> = {}): CartItem {
  return {
    lineId: 'l1',
    itemType: 'PRODUCT',
    referenceId: 'p1',
    productId: 'p1',
    variantId: null,
    name: 'Kopi',
    image: null,
    unitPrice: 10000,
    quantity: 1,
    modifiers: [],
    isTaxable: false,
    taxPercent: 0,
    discountPerUnit: 0,
    notes: null,
    ...over,
  }
}

describe('computeTotals', () => {
  it('empty cart → all zero', () => {
    expect(computeTotals([])).toEqual({ subtotal: 0, discount: 0, tax: 0, total: 0, itemCount: 0 })
  })

  it('qty × unit price', () => {
    const t = computeTotals([item({ unitPrice: 10000, quantity: 2 })])
    expect(t.subtotal).toBe(20000)
    expect(t.total).toBe(20000)
    expect(t.itemCount).toBe(2)
  })

  it('adds modifier price per unit', () => {
    const t = computeTotals([
      item({
        unitPrice: 10000,
        quantity: 2,
        modifiers: [{ id: 'm1', name: 'Extra', price: 5000, image: null, is_available: true, is_active: true }],
      }),
    ])
    expect(t.subtotal).toBe(30000) // (10000+5000) × 2
  })

  it('applies percentage tax on net (after discount)', () => {
    const t = computeTotals([
      item({ unitPrice: 10000, quantity: 2, isTaxable: true, taxPercent: 10, discountPerUnit: 1000 }),
    ])
    // gross 20000, discount 2000, net 18000, tax 1800
    expect(t.discount).toBe(2000)
    expect(t.tax).toBe(1800)
    expect(t.total).toBe(19800)
  })

  it('discount never exceeds line gross', () => {
    const t = computeTotals([item({ unitPrice: 1000, quantity: 1, discountPerUnit: 5000 })])
    expect(t.discount).toBe(1000)
    expect(t.total).toBe(0)
  })

  it('skips tax for non-taxable items', () => {
    const t = computeTotals([item({ unitPrice: 10000, quantity: 1, isTaxable: false, taxPercent: 10 })])
    expect(t.tax).toBe(0)
  })
})
