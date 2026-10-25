import { describe, expect, it } from 'vitest'
import type { Product, ProductVariant } from '@/types'
import { memberPerks, memberPriceBelow } from './publicMenuPrice'

const product = (p: Partial<Product>) => ({ has_variant: false, ...p }) as Product
const variant = (v: Partial<ProductVariant>) => ({ is_available: true, is_active: true, ...v }) as ProductVariant

describe('memberPriceBelow', () => {
  it('hanya harga member yang lebih murah', () => {
    expect(memberPriceBelow(12000, 15000)).toBe(12000)
    expect(memberPriceBelow(15000, 15000)).toBeNull()
    expect(memberPriceBelow(0, 15000)).toBeNull()
    expect(memberPriceBelow(null, 15000)).toBeNull()
  })
})

describe('memberPerks', () => {
  it('menghitung menu berharga member dan hemat terbesar per item', () => {
    const perks = memberPerks([
      product({ sell_price: 15000, member_price: 12000 }),
      product({ sell_price: 8000, member_price: 8000 }),
      product({ sell_price: 10000 }),
      product({
        has_variant: true,
        variants: [
          variant({ sell_price: 20000, member_price: 16000 }),
          variant({ sell_price: 25000, member_price: 24000 }),
          // Varian yang tidak dijual tidak dijanjikan.
          variant({ sell_price: 50000, member_price: 10000, is_available: false }),
        ],
      }),
    ])
    expect(perks).toEqual({ count: 2, maxSaving: 4000 })
  })

  it('produk harga-dari-ekstra tidak dihitung', () => {
    expect(memberPerks([product({ price_from_extras: true, sell_price: 0, member_price: 5000 })]).count).toBe(0)
  })
})
