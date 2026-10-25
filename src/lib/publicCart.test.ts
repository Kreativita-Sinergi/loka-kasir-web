import { describe, expect, it } from 'vitest'
import { lineTotal, lineUnitPrice, lineUsesMemberPrice, orderItemsFromCart, tierUnitPrice } from './publicCart'

describe('orderItemsFromCart', () => {
  it('mengirim jumlah dari keranjang, bukan quantity awal payload', () => {
    const items = orderItemsFromCart([
      { qty: 3, payload: { item_type: 'PRODUCT', reference_id: 'teh', quantity: 1, attributes: [] } },
      {
        qty: 2,
        payload: {
          item_type: 'VARIANT',
          reference_id: 'kopi-besar',
          quantity: 1,
          attributes: [{ product_attribute_id: 'gula', additional_price: 0 }],
        },
      },
    ])
    expect(items).toEqual([
      { item_type: 'PRODUCT', reference_id: 'teh', quantity: 3, attributes: [] },
      {
        item_type: 'VARIANT',
        reference_id: 'kopi-besar',
        quantity: 2,
        attributes: [{ product_attribute_id: 'gula', additional_price: 0 }],
      },
    ])
  })

  it('tidak mengubah payload yang tersimpan di keranjang', () => {
    const payload = { item_type: 'PRODUCT' as const, reference_id: 'teh', quantity: 1, attributes: [] }
    orderItemsFromCart([{ qty: 4, payload }])
    expect(payload.quantity).toBe(1)
  })

  it('baris tanpa jumlah tidak ikut dipesan', () => {
    expect(
      orderItemsFromCart([{ qty: 0, payload: { item_type: 'PRODUCT', reference_id: 'x', quantity: 1 } }]),
    ).toEqual([])
  })
})

describe('harga grosir di keranjang menu publik', () => {
  const tiers = [{ min_qty: 12, price: 8000 }, { min_qty: 3, price: 9000 }]
  const line = (qty: number, addon = 0) => ({ qty, unitPrice: 10000 + addon, basePrice: 10000, tiers })

  it('tingkat tertinggi yang tercapai, sama dengan server', () => {
    expect(lineTotal(line(2))).toBe(20000)
    expect(lineTotal(line(3))).toBe(27000)
    expect(lineTotal(line(12))).toBe(96000)
  })

  it('add-on tetap ditambahkan di atas harga grosir', () => {
    expect(lineUnitPrice(line(3, 2000))).toBe(11000)
  })

  it('tingkat yang tidak lebih murah diabaikan', () => {
    expect(tierUnitPrice([{ min_qty: 3, price: 12000 }], 5, 10000)).toBe(10000)
    expect(tierUnitPrice(undefined, 5, 10000)).toBe(10000)
  })
})

describe('harga member di keranjang menu publik', () => {
  const esJeruk = { qty: 2, unitPrice: 8000, basePrice: 8000, memberPrice: 6500 }

  it('member membayar harga member, bukan member membayar harga biasa', () => {
    expect(lineTotal(esJeruk)).toBe(16000)
    expect(lineTotal(esJeruk, true)).toBe(13000)
    expect(lineUsesMemberPrice(esJeruk, true)).toBe(true)
    expect(lineUsesMemberPrice(esJeruk, false)).toBe(false)
  })

  it('add-on tetap ditambahkan di atas harga member', () => {
    expect(lineUnitPrice({ ...esJeruk, unitPrice: 10000 }, true)).toBe(8500)
  })

  it('grosir yang lebih murah mengalahkan harga member, sama dengan server', () => {
    const line = { qty: 10, unitPrice: 25000, basePrice: 25000, memberPrice: 22000, tiers: [{ min_qty: 10, price: 20000 }] }
    expect(lineUnitPrice(line, true)).toBe(20000)
    expect(lineUsesMemberPrice(line, true)).toBe(false)
  })
})
