import { describe, expect, it } from 'vitest'
import type { POItem } from '@/types'
import {
  costChange,
  defaultReceiveUnit,
  formatPOQuantity,
  poItemName,
  poItemUnitOptions,
  productUnitOptions,
} from './purchaseOrderLines'

const indomie: POItem = {
  id: 'i1',
  item_type: 'product',
  raw_material_id: null,
  product_id: 'p1',
  name: 'Indomie Goreng',
  raw_material_name: 'Indomie Goreng',
  unit_alias: 'pcs',
  unit_name: 'Dus',
  unit_conversion: 40,
  current_cost: 2800,
  quantity_ordered: 80,
  quantity_received: 0,
  unit_cost: 3000,
  subtotal: 240000,
}

describe('baris PO produk', () => {
  it('satuan produk: satuan dasar lalu satuan jual & satuan beli apotek', () => {
    const units = productUnitOptions('pcs', [
      { id: 'u1', name: 'Dus', conversion: 40, is_purchase_unit: false },
      { id: null, name: 'Box', conversion: 10, is_purchase_unit: true },
      { id: 'u2', name: 'Pcs', conversion: 1, is_purchase_unit: false },
    ])
    expect(units.map(unit => unit.factor)).toEqual([1, 40, 10])
    expect(units[1]).toMatchObject({ unitId: 'u1', label: 'Dus (isi 40)' })
    expect(units[2]).toMatchObject({ purchaseUnit: true, unitId: undefined })
  })

  it('terima barang dibuka dalam Dus bila sisanya pas, selain itu pcs', () => {
    expect(defaultReceiveUnit(indomie, 80).factor).toBe(40)
    expect(defaultReceiveUnit(indomie, 30).factor).toBe(1)
  })

  it('produk timbangan & bahan baku memakai satuan berat', () => {
    const gula: POItem = { ...indomie, is_weight_based: true, unit_alias: 'gram', unit_name: null, unit_conversion: 1 }
    expect(poItemUnitOptions(gula).map(unit => unit.label)).toEqual(['kg', 'ons', 'gram', 'mg'])
    const kopi: POItem = { ...indomie, item_type: 'raw_material', unit_alias: 'gr', unit_name: null }
    expect(poItemUnitOptions(kopi).find(unit => unit.label === 'kg')?.factor).toBe(1000)
  })

  it('jumlah ditulis dalam satuan beli bila pas', () => {
    const format = (n: number) => String(n)
    expect(formatPOQuantity(indomie, 80, format)).toBe('2 Dus (80 pcs)')
    expect(formatPOQuantity(indomie, 30, format)).toBe('30 pcs')
  })

  it('nama baris varian lengkap; server lama jatuh ke raw_material_name', () => {
    expect(poItemName({ name: 'Kaos', variant_name: 'M', raw_material_name: 'Kaos — M' })).toBe('Kaos — M')
    expect(poItemName({ raw_material_name: 'Gula' })).toBe('Gula')
  })
})

describe('perubahan harga modal', () => {
  it('naik 7%, turun, sama, dan belum diisi', () => {
    expect(costChange(2800, 3000)).toMatchObject({ kind: 'up', large: false })
    expect(Math.round(costChange(2800, 3000).percent)).toBe(7)
    expect(costChange(3000, 2800).kind).toBe('down')
    expect(costChange(3000, 3000).kind).toBe('same')
    expect(costChange(0, 3000).kind).toBe('first')
    expect(costChange(null, 3000).kind).toBe('first')
  })

  it('lompatan > 50% ditandai — kemungkinan salah ketik', () => {
    expect(costChange(3000, 30000).large).toBe(true)
    expect(costChange(3000, 1000).large).toBe(true)
    expect(costChange(3000, 4400).large).toBe(false)
  })
})
