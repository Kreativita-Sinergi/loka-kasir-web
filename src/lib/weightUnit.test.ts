import { describe, expect, it } from 'vitest'
import {
  formatStockQuantity, normalizeWeightUnit, pricePerWeightUnit, weightUnitLabel, weightUnitScale,
} from './money'

// Server menyimpan stok dalam GRAM dan harga per KILOGRAM apa pun satuan jual
// produknya. Satuan hanya mengubah cara angka dibaca; kalau skalanya meleset,
// bawang Rp5.000/ons terbaca Rp500/ons atau Rp50.000/ons tanpa satu pun galat.
describe('satuan jual barang terukur', () => {
  it('produk lama tanpa satuan dibaca sebagai kg', () => {
    expect(normalizeWeightUnit(undefined)).toBe('kg')
    expect(normalizeWeightUnit('')).toBe('kg')
    expect(normalizeWeightUnit('g')).toBe('gram')
  })

  it('skala tiap satuan dalam gram', () => {
    expect(weightUnitScale('kg')).toBe(1000)
    expect(weightUnitScale('ons')).toBe(100)
    expect(weightUnitScale('gram')).toBe(1)
  })

  it('harga per kg diubah ke harga per satuan jual', () => {
    expect(pricePerWeightUnit(50000, 'ons')).toBe(5000)
    expect(pricePerWeightUnit(50000, 'gram')).toBe(50)
    expect(pricePerWeightUnit(50000, 'kg')).toBe(50000)
  })

  it('stok gram dicetak dalam satuan jual', () => {
    expect(formatStockQuantity(200, true, null, 'ons')).toBe('2 ons')
    expect(formatStockQuantity(250, true, null, 'gram')).toBe('250 gram')
    expect(formatStockQuantity(12, false, null, 'ons')).toBe('12')
  })

  it('satuan volume dibaca liter', () => {
    expect(weightUnitLabel('kg', 'Liter')).toBe('L')
    expect(weightUnitLabel('gram', 'Liter')).toBe('mL')
  })
})
