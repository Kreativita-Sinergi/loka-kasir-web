import { describe, expect, it } from 'vitest'
import { costAverages, stockEntryUnitCost, weightedCost, type ProductCostBasis } from './productCost'

// Pratinjau harus sama persis dengan hitungan server
// (repository.WeightedProductCost) — kasusnya sama dengan product_cost_test.go.
const basis = (b: Partial<ProductCostBasis>): ProductCostBasis => ({
  cost: null, stock: 0, track_stock: true, is_weight_based: false, ...b,
})

describe('weightedCost', () => {
  it('rata-rata tertimbang stok lama dan barang masuk', () => {
    // Contoh pelanggan: 3 AC @3,44 jt + 2 @3,6 jt.
    expect(weightedCost(basis({ cost: 3440000, stock: 3 }), 2, 3600000)).toBe(3504000)
    expect(weightedCost(basis({ cost: 2800, stock: 10 }), 80, 3000)).toBe(2977.78)
  })

  it('tanpa nilai lama, harga beli dipakai apa adanya', () => {
    for (const b of [basis({ stock: 5 }), basis({ cost: 0, stock: 5 }), basis({ cost: 3440000 }), basis({ cost: 3440000, stock: -4 })]) {
      expect(costAverages(b)).toBe(false)
      expect(weightedCost(b, 2, 3600000)).toBe(3600000)
    }
  })

  it('timbangan: stok gram, modal per kg', () => {
    expect(weightedCost(basis({ cost: 15000, stock: 1000, is_weight_based: true }), 3000, 16000)).toBe(15750)
  })

  it('harga beli nol atau jumlah kosong tidak mengubah modal', () => {
    const ac = basis({ cost: 3440000, stock: 3 })
    expect(weightedCost(ac, 2, 0)).toBeNull()
    expect(weightedCost(ac, 0, 3600000)).toBeNull()
  })
})

describe('stockEntryUnitCost', () => {
  it('harga per satuan ketik → per satuan harga modal', () => {
    expect(stockEntryUnitCost('3600000', false)).toBe(3600000)
    expect(stockEntryUnitCost('1600', true, 'ons')).toBe(16000) // per ons → per kg
    expect(stockEntryUnitCost('16000', true, 'kg')).toBe(16000)
    expect(stockEntryUnitCost('', false)).toBeUndefined()
    expect(stockEntryUnitCost('0', false)).toBeUndefined()
  })
})
