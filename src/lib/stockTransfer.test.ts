import { describe, expect, it } from 'vitest'
import { stockTransferQuantity } from './stockTransfer'

describe('jumlah transfer stok', () => {
  it('mengonversi kg dan ons ke gram sebelum membandingkan stok tersedia', () => {
    expect(stockTransferQuantity('1,25', 1250, true, 'kg')).toBe(1250)
    expect(stockTransferQuantity('2.5', 250, true, 'ons')).toBe(250)
    expect(stockTransferQuantity('1.251', 1250, true, 'kg')).toBeNull()
  })
  it('menolak produk yang belum tersedia di outlet asal dan stok berlebih', () => {
    expect(stockTransferQuantity(1, undefined, false)).toBeNull()
    expect(stockTransferQuantity(6, 5, false)).toBeNull()
    expect(stockTransferQuantity(5, 5, false)).toBe(5)
  })
  it('menolak kosong, negatif, pecahan pcs, serta jumlah yang membulat ke nol', () => {
    for (const value of ['', '-1', '1.5', '9007199254740992']) {
      expect(stockTransferQuantity(value, 1e18, false)).toBeNull()
    }
    expect(stockTransferQuantity('0.0001', 10, true, 'kg')).toBeNull()
  })
})
