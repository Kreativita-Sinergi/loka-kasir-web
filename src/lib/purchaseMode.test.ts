import { describe, expect, it } from 'vitest'
import { directPurchasePayment, purchaseOrdersEnabled } from './purchaseMode'

describe('purchaseOrdersEnabled', () => {
  it('hanya false yang mematikan — sesi lama/server lama tetap alur PO', () => {
    expect(purchaseOrdersEnabled(undefined)).toBe(true)
    expect(purchaseOrdersEnabled({})).toBe(true)
    expect(purchaseOrdersEnabled({ purchase_orders_enabled: true })).toBe(true)
    expect(purchaseOrdersEnabled({ purchase_orders_enabled: false })).toBe(false)
  })
})

describe('directPurchasePayment', () => {
  const base = { payNow: true, amount: 240000, total: 240000, method: 'cash' as const }
  it('bayar nanti: payment null (seluruhnya hutang)', () => {
    expect(directPurchasePayment({ ...base, payNow: false, amount: 0 })).toEqual({ payment: null })
  })
  it('lunas dari akun kas: akun ikut, metode tetap terkirim', () => {
    expect(directPurchasePayment({ ...base, accountId: 'a1' })).toEqual({
      payment: { amount: 240000, method: 'cash', cash_account_id: 'a1' },
    })
  })
  it('sebagian tanpa akun: cash_account_id null', () => {
    expect(directPurchasePayment({ ...base, amount: 100000, method: 'transfer' })).toEqual({
      payment: { amount: 100000, method: 'transfer', cash_account_id: null },
    })
  })
  it('nol atau melebihi total ditolak sebelum ke server', () => {
    expect(directPurchasePayment({ ...base, amount: 0 })).toEqual({ error: 'dpurPayAmountRequired' })
    expect(directPurchasePayment({ ...base, amount: Number.NaN })).toEqual({ error: 'dpurPayAmountRequired' })
    expect(directPurchasePayment({ ...base, amount: 240001 })).toEqual({ error: 'dpurPayExceeds' })
  })
})
