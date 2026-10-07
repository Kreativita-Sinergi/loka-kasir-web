import { describe, expect, it } from 'vitest'
import { rowsToTiers, tierRowsError, tiersToRows } from './priceTiers'

describe('baris harga grosir di form produk', () => {
  it('barang biasa apa adanya', () => {
    const rows = tiersToRows([{ min_qty: 3, price: 9000 }])
    expect(rows).toEqual([{ min_qty: '3', price: '9000' }])
    expect(rowsToTiers(rows)).toEqual([{ min_qty: 3, price: 9000 }])
  })

  it('kiloan dalam ons: tampil per ons, terkirim per kg', () => {
    const rows = tiersToRows([{ min_qty: 0.5, price: 13000 }], 'ons')
    expect(rows).toEqual([{ min_qty: '5', price: '1300' }])
    expect(rowsToTiers(rows, 'ons')).toEqual([{ min_qty: 0.5, price: 13000 }])
  })

  it('menolak tingkat yang tidak masuk akal', () => {
    expect(tierRowsError([{ min_qty: '1', price: '9000' }], '10000', false)).toBe('priceTierErrMinPcs')
    expect(tierRowsError([{ min_qty: '3', price: '10000' }], '10000', false)).toBe('priceTierErrCheaper')
    expect(tierRowsError([{ min_qty: '3', price: '' }], '10000', false)).toBe('priceTierErrPrice')
    expect(tierRowsError([{ min_qty: '3', price: '9000' }, { min_qty: '3', price: '8000' }], '10000', false))
      .toBe('priceTierErrDuplicate')
    expect(tierRowsError([{ min_qty: '0.5', price: '9000' }], '10000', true)).toBeNull()
    expect(tierRowsError([{ min_qty: '', price: '' }], '10000', false)).toBeNull()
  })
})
