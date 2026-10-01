import { describe, expect, it } from 'vitest'
import { materialUnitOptions, parseNumericInput, validNumericInput, convertMaterialQuantity } from './materialUnits'

describe('pembelian bahan dengan satuan berbeda', () => {
  it('500 gram dibeli Rp10.000/kg masuk sebagai 0,5 kg tanpa mengubah total', () => {
    const factor = materialUnitOptions('kg').find(option => option.label === 'gram')!.factor
    const quantity = convertMaterialQuantity(500, factor)
    const pricePerGram = 10
    expect(quantity).toBe(0.5)
    expect(pricePerGram / factor).toBe(10_000)
    expect(quantity * (pricePerGram / factor)).toBe(5000)
  })
  it('2,5 kg masuk sebagai 2500 gram dan harga tetap per gram', () => {
    const factor = materialUnitOptions('gram').find(option => option.label === 'kg')!.factor
    expect(convertMaterialQuantity(parseNumericInput('2,5'), factor)).toBe(2500)
    expect(20_000 / factor).toBe(20)
  })
  it('ons Indonesia setara 100 gram dan mendukung nama panjang satuan', () => {
    expect(materialUnitOptions('Kilogram').find(option => option.label === 'ons')!.factor).toBe(0.1)
    expect(materialUnitOptions('gr').find(option => option.label === 'ons')!.factor).toBe(100)
  })
  it('volume dikonversi tanpa mencampurkan massa dan volume', () => {
    expect(materialUnitOptions('liter').map(option => option.label)).toEqual(['L', 'mL'])
    expect(convertMaterialQuantity(250, materialUnitOptions('liter')[1].factor)).toBe(0.25)
    expect(materialUnitOptions('mL')[0].factor).toBe(1000)
  })
  it('satuan kemasan bebas dipertahankan tanpa menebak isi kemasan', () => {
    expect(materialUnitOptions('karung')).toEqual([{ label: 'karung', factor: 1 }])
    expect(materialUnitOptions('pcs')).toEqual([{ label: 'pcs', factor: 1 }])
  })
  it('penggantian satuan mempertahankan jumlah dan total pembelian', () => {
    const oldFactor = 1
    const newFactor = 0.1
    const quantity = convertMaterialQuantity(2.5, oldFactor / newFactor)
    const cost = convertMaterialQuantity(20_000, newFactor / oldFactor)
    expect(quantity).toBe(25)
    expect(cost).toBe(2000)
    expect(quantity * cost).toBe(50_000)
    expect(convertMaterialQuantity(quantity, newFactor)).toBe(2.5)
  })
})

describe('draft angka', () => {
  it.each(['', ' ', '-', '.', '1.2.3', '12abc', 'Infinity', '1e9'])('menolak isian tidak valid %j', value => {
    expect(validNumericInput(value)).toBe(false)
  })
  it('menerima koma/titik, nol yang eksplisit, dan desimal kecil', () => {
    expect(parseNumericInput('0,125')).toBe(0.125)
    expect(parseNumericInput('2.')).toBe(2)
    expect(validNumericInput('0')).toBe(true)
    expect(validNumericInput('0', 0, true)).toBe(false)
    expect(validNumericInput('-1')).toBe(false)
    expect(convertMaterialQuantity(0.1, 0.1)).toBe(0.01)
  })
})
