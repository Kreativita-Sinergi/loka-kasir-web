import { describe, expect, it } from 'vitest'
import { t } from '@/lib/i18n'
import type { PayablesReport, PurchaseReport } from '@/api/purchasePayables'
import { agingTotal, canPay, localISODate, payablesCsvRows, paymentStatusLabel, purchaseCsvRows, supplierLabel } from './purchasePayables'

const report: PurchaseReport = {
  start_date: '2026-10-01',
  end_date: '2026-10-30',
  summary: { total_purchase: 10800, order_count: 1, supplier_count: 1, item_count: 1 },
  by_supplier: [{ supplier_id: null, supplier_name: '', order_count: 1, quantity: 10, total: 10800 }],
  by_item: [{ item_type: 'product', product_id: 'p1', variant_id: 'v1', raw_material_id: null, name: 'Kaos', variant_name: 'M', unit: 'pcs', quantity: 10, total: 10800, average_cost: 1080 }],
  by_order: [{ id: 'po1', po_number: 'PO-1', supplier_id: 's1', supplier_name: 'Agen', outlet_name: null, received_at: new Date(2026, 9, 20, 10).toISOString(),
    total: 10800, received_amount: 10800, paid_amount: 5000, balance: 5800, payment_status: 'partial' }],
}

describe('purchasePayables', () => {
  it('label status, supplier kosong, dan ambang lunas', () => {
    expect(paymentStatusLabel('partial')).toBe(t('htsStatusPartial'))
    expect(paymentStatusLabel(undefined)).toBe(t('htsStatusNone'))
    expect(supplierLabel('')).toBe(t('htsNoSupplier'))
    expect(supplierLabel('Agen')).toBe('Agen')
    expect(canPay(0.004)).toBe(false)
    expect(canPay(1)).toBe(true)
  })

  it('CSV per barang: nama varian, rata-rata sebagai teks agar tidak dijumlah', () => {
    const [row] = purchaseCsvRows(report, 'item')
    expect(row[t('pbrColItem')]).toBe('Kaos — M')
    expect(row[t('pbrColAvg')]).toBe('1080')
    expect(row[t('pbrTotal')]).toBe(10800)
  })

  it('CSV per PO memakai tanggal lokal dan status bayar', () => {
    const [row] = purchaseCsvRows(report, 'order')
    expect(row[t('pbrColReceivedAt')]).toBe('2026-10-20')
    expect(row[t('pbrColStatus')]).toBe(t('htsStatusPartial'))
    expect(purchaseCsvRows(report, 'supplier')[0][t('htsSupplierCount')]).toBe(t('htsNoSupplier'))
    expect(localISODate('bukan tanggal')).toBe('')
  })

  it('CSV hutang memuat lima ember umur', () => {
    const payables: PayablesReport = {
      as_of: '2026-10-30', total_balance: 10000, total_overdue: 10000, supplier_count: 1, open_order_count: 1,
      aging: { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_over_90: 10000 },
      suppliers: [{ supplier_id: 's1', supplier_name: 'Agen', open_order_count: 1, received_amount: 10000, paid_amount: 0, balance: 10000, overdue: 10000,
        oldest_due_date: '2026-07-22', aging: { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_over_90: 10000 } }],
    }
    const [row] = payablesCsvRows(payables)
    expect(row[t('htsAging91')]).toBe(10000)
    expect(row[t('htsAgingCurrent')]).toBe(0)
    expect(row[t('htsOldestDue')]).toBe('2026-07-22')
    expect(agingTotal(payables.aging)).toBe(10000)
  })
})
