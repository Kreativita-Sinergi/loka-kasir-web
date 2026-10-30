// Tes render halaman yang baru ditambahkan: menjaga agar halaman tidak crash
// saat runtime dengan respons kosong berbentuk sama seperti dari server Go.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('lottie-react', () => ({ default: () => null }))
vi.mock('@/lib/axios', () => {
  // Bentuk respons mengikuti controller Go: daftar produk/karyawan/slip
  // berpaginasi, komponen gaji dan tahapan berupa objek, sisanya array.
  const paginated = { status: true, message: '!OK', data: [], pagination: { page: 1, limit: 20, total: 0, order_by: 'asc', sort_by: 'id' } }
  const byUrl = (url: string) => {
    // Produksi lebih dulu: '/production' juga cocok dengan pola '/product' di bawah.
    if (url.startsWith('/production/orders') || url.startsWith('/production/report')) {
      const order = { id: 'pr1', number: 'PRD/2610/0001', outlet_id: 'o1', outlet_name: 'Pusat', product_id: 'p1', variant_id: null,
        product_name: 'Roti Tawar', variant_name: null, qty_output: 20, unit_cost: 4425, total_cost: 88500, notes: null, status: 'done',
        produced_at: '2026-10-30T01:00:00Z', cost_before: 3000, cost_after: 3950, created_by_name: 'Budi', created_at: '2026-10-30T01:00:00Z',
        voided_at: null, voided_by_name: null, void_reason: null, item_count: 2 }
      const voided = { ...order, id: 'pr2', number: 'PRD/2610/0002', status: 'voided', void_reason: 'Salah jumlah', voided_at: '2026-10-30T02:00:00Z', voided_by_name: 'Rina' }
      const summary = { orders: 1, voided: 1, qty_output: 20, total_cost: 88500 }
      if (url.startsWith('/production/report')) return { status: true, data: {
        from: '2026-10-01', to: '2026-10-31', summary, orders: [order, voided],
        products: [{ product_id: 'p1', variant_id: null, product_name: 'Roti Tawar', variant_name: null, orders: 1, qty_output: 20, total_cost: 88500, avg_cost: 4425 }],
        components: [{ component_type: 'raw_material', raw_material_id: 'rm1', product_id: null, variant_id: null, name: 'Tepung Terigu', unit_name: 'kg', qty: 5, total_cost: 60000, avg_cost: 12000 }],
      } }
      return { status: true, data: { from: '2026-10-01', to: '2026-10-31', summary, orders: [order, voided], pagination: { page: 1, limit: 20, total: 2 } } }
    }
    if (url.startsWith('/production/products')) return { status: true, data: [
      { id: 'p1', name: 'Roti Tawar', sku: null, stock_mode: 'produced', has_variant: false, is_weight_based: false, component_count: 2, unit_name: 'pcs', variants: [] },
    ] }
    if (url.startsWith('/production/preview')) return { status: true, data: {
      product_id: 'p1', variant_id: null, product_name: 'Roti Tawar', variant_name: null, unit_name: 'pcs', stock_mode: 'produced', has_recipe: true,
      qty_output: 1, current_stock: 10, current_cost: 3000, total_cost: 4500, unit_cost: 4500, shortages: 1, can_save: false, problem: null,
      components: [{ component_type: 'raw_material', raw_material_id: 'rm1', product_id: null, variant_id: null, name: 'Tepung Terigu', unit_name: 'kg',
        qty_per_unit: 0.25, qty: 0.25, available: 0.1, unit_cost: 12000, total_cost: 3000, sufficient: false, tracked: true }],
    } }
    if (/^\/(product|employee|payroll\/slips|payroll\/my-slips)/.test(url)) return paginated
    if (url.startsWith('/payroll/components')) return { status: true, data: { components: [], legacy: {}, max_components: 10 } }
    if (url.startsWith('/payroll/stage-settings')) return { status: true, data: { payroll_stage_count: 1, payroll_stage_gap_days: 0, payroll_stage_shares: [100], is_equal_split: true, min_stage_count: 1, max_stage_count: 4, max_gap_days: 30 } }
    if (url.startsWith('/outlet/')) return { status: true, data: null }
    if (/^\/finance\/cash-accounts\/[^/]+\/ledger/.test(url)) return { status: true, data: {
      account: { id: 'a1', kind: 'cash', name: 'Kas Besar', balance: 1250000, is_active: true },
      opening_balance: 1000000, total_in: 500000, total_out: 250000, closing_balance: 1250000,
      entries: [
        { id: 'l1', source: 'transfer', type: 'OUT', amount: 250000, category: 'transfer', description: null, reference: 'BCA', number: 'TRF/2610/0001',
          transaction_id: null, shift_id: null, occurred_at: '2026-10-30T03:00:00Z', balance_after: 1250000, created_by_name: 'Budi',
          voided: false, voided_at: null, void_reason: null, voided_by_name: null, voidable: true },
        { id: 'l2', source: 'manual', type: 'OUT', amount: 50000, category: 'expense', description: 'Bayar listrik', reference: null, number: null,
          transaction_id: null, shift_id: null, occurred_at: '2026-10-29T03:00:00Z', balance_after: null, created_by_name: 'Budi',
          voided: true, voided_at: '2026-10-29T04:00:00Z', void_reason: 'Tercatat dua kali', voided_by_name: 'Rina', voidable: false },
      ],
      pagination: { page: 1, limit: 50, total: 2 },
    } }
    if (url.startsWith('/finance/cash-accounts')) return { status: true, data: [
      { id: 'a1', kind: 'cash', name: 'Kas Besar', bank_name: null, account_number: null, account_holder: null, opening_balance: 0, is_active: true, sort_order: 0, balance: 1250000, created_at: '2026-10-01T00:00:00Z' },
      { id: 'a2', kind: 'bank', name: 'BCA', bank_name: 'BCA', account_number: '1234567890', account_holder: 'Toko Uji', opening_balance: 0, is_active: true, sort_order: 1, balance: 250000, created_at: '2026-10-01T00:00:00Z' },
    ] }
    if (url.startsWith('/profitability/receipts')) return { status: true, data: {
      start_date: '2026-10-01', end_date: '2026-10-30',
      summary: { transaction_count: 2, revenue: 150000, cogs: 60000, gross_profit: 90000, gross_margin: 60, missing_cost_count: 1, costs_complete: false },
      cashiers: [{ id: 'c1', name: 'Rina' }],
      items: [
        { transaction_id: 't1', bill_number: 'INV/2610/0007', created_at: '2026-10-30T03:00:00Z', customer_name: 'Pak Joko', cashier_name: 'Rina', outlet_name: 'Pusat',
          revenue: 100000, cogs: 60000, gross_profit: 40000, gross_margin: 40, missing_cost: false },
        { transaction_id: 't2', bill_number: 'INV/2610/0006', created_at: '2026-10-29T03:00:00Z', customer_name: '', cashier_name: 'Rina', outlet_name: 'Pusat',
          revenue: 50000, cogs: 0, gross_profit: 50000, gross_margin: 100, missing_cost: true },
      ],
      pagination: { page: 1, limit: 50, total: 2 },
    } }
    if (url.startsWith('/sales-report/summary')) return { status: true, data: {
      group_by: 'cashier', start_date: '2026-10-01', end_date: '2026-10-30',
      totals: { transaction_count: 3, qty: 7, revenue: 300000, discount: 10000, tax: 30000, total: 330000 },
      rows: [
        { key: 'c1', label: 'Rina', detail: '', transaction_count: 2, qty: 5, revenue: 200000, discount: 10000, tax: 20000, total: 220000, share: 66.7 },
        { key: 'none', label: '', detail: '', transaction_count: 1, qty: 2, revenue: 100000, discount: 0, tax: 10000, total: 110000, share: 33.3 },
      ],
      overlapping_counts: false,
    } }
    if (url.startsWith('/staff-commission/report')) return { status: true, data: {
      rows: [
        { employee_id: 'e1', employee_name: 'Budi', lines: 2, quantity: 3, sales: 3000000, commission: 60000 },
        { employee_id: null, employee_name: '', lines: 1, quantity: 1, sales: 500000, commission: 10000 },
      ],
      total_sales: 3500000, total_commission: 70000,
    } }
    if (url.startsWith('/inventory-report/valuation')) return { status: true, data: {
      outlet_id: null, generated_at: '2026-10-30T03:00:00Z',
      summary: { total_value: 112500, product_value: 75000, raw_material_value: 37500, item_count: 3, raw_material_count: 1,
        missing_cost_count: 1, negative_stock_count: 0, consignment_count: 1, consignment_value: 24000 },
      categories: [
        { category_id: 'c1', category_name: 'Minuman', item_count: 1, value: 45000 },
        { category_id: null, category_name: '', item_count: 2, value: 30000 },
      ],
      items: [
        { product_id: 'p1', variant_id: null, name: 'Teh Botol', variant_name: '', sku: 'TB1', category_id: 'c1', category_name: 'Minuman',
          quantity: 15, is_weight_based: false, weight_unit: 'kg', unit_cost: 3000, cost_source: 'product', value: 45000,
          negative_stock: false, is_consignment: false, consignor_name: '' },
        { product_id: 'p2', variant_id: null, name: 'Beras', variant_name: '', sku: '', category_id: null, category_name: '',
          quantity: 2500, is_weight_based: true, weight_unit: 'kg', unit_cost: 12000, cost_source: 'product', value: 30000,
          negative_stock: false, is_consignment: false, consignor_name: '' },
        { product_id: 'p3', variant_id: 'v1', name: 'Kaos', variant_name: 'M', sku: 'K-M', category_id: null, category_name: '',
          quantity: 2, is_weight_based: false, weight_unit: 'kg', unit_cost: 0, cost_source: 'none', value: 0,
          negative_stock: false, is_consignment: false, consignor_name: '' },
        { product_id: 'p4', variant_id: null, name: 'Kue Titipan', variant_name: '', sku: '', category_id: null, category_name: '',
          quantity: 6, is_weight_based: false, weight_unit: 'kg', unit_cost: 4000, cost_source: 'consignment', value: 24000,
          negative_stock: false, is_consignment: true, consignor_name: 'Bu Sari' },
      ],
      raw_materials: [{ id: 'r1', name: 'Gula Pasir', sku: 'G1', unit: 'kg', quantity: 2.5, unit_cost: 15000, value: 37500, missing_cost: false, negative_stock: false }],
    } }
    if (url.startsWith('/inventory-report/stock-card')) return { status: true, data: {
      kind: 'product', product_id: 'p1', variant_id: null, raw_material_id: null, name: 'Teh Botol', variant_name: '', sku: 'TB1', unit: '',
      is_weight_based: false, weight_unit: 'kg', outlet_id: null, from: '2026-10-01T00:00:00+07:00', to: '2026-10-31T00:00:00+07:00',
      opening_qty: 30, total_in: 3, total_out: 10, closing_qty: 23, current_qty: 23, untracked_difference: 20,
      entries: [
        { id: 'm1', occurred_at: '2026-10-05T03:00:00Z', type: 'SALE', reference: 'INV-001', outlet_id: 'o1', outlet_name: 'Pusat', actor_name: '', notes: '', in: 0, out: 4, balance: 26 },
        { id: 'm2', occurred_at: '2026-10-06T03:00:00Z', type: 'OPNAME', reference: 'OPN-01', outlet_id: 'o1', outlet_name: 'Pusat', actor_name: 'Budi', notes: '', in: 3, out: 0, balance: 29 },
        { id: 'm3', occurred_at: '2026-10-08T03:00:00Z', type: 'MIXING', reference: '', outlet_id: 'o1', outlet_name: 'Pusat', actor_name: '', notes: '', in: 0, out: 6, balance: 23 },
      ],
      page: 1, limit: 100, total: 3,
    } }
    if (url.startsWith('/reports/receivable-aging')) return { status: true, data: {
      as_of: '2026-10-30', current: 26000, days_1_30: 10000, days_31_60: 30000, days_61_90: 8000, over_90: 5000,
      outstanding: 79000, overdue: 53000, count: 7, customer_count: 2,
      customers: [
        { customer_id: 'c1', name: 'bu ima', phone: '0812', count: 3, bill_total: 22000, paid_total: 2000, outstanding: 20000,
          current: 5000, days_1_30: 10000, days_31_60: 0, days_61_90: 0, over_90: 5000, overdue: 15000,
          oldest_at: '2026-06-01T03:00:00Z', max_days_overdue: 127, kasbon_limit: 100000, due_day: 25 },
        { customer_id: null, name: '', phone: null, count: 1, bill_total: 1000, paid_total: 0, outstanding: 1000,
          current: 1000, days_1_30: 0, days_31_60: 0, days_61_90: 0, over_90: 0, overdue: 0,
          oldest_at: '2026-10-30T03:00:00Z', max_days_overdue: 0, kasbon_limit: null, due_day: null },
      ],
    } }
    if (/^\/transaction\/kasbon\/customers\/[^/]+\/ledger/.test(url)) return { status: true, data: {
      customer_id: 'c1', opening_balance: 0, closing_balance: 20000, total_bon: 22000, total_paid: 2000,
      entries: [
        { type: 'bon', at: '2026-06-01T03:00:00Z', amount: 7000, balance: 7000, bill_number: 'B-1' },
        { type: 'payment', at: '2026-06-02T03:00:00Z', amount: 2000, balance: 5000, bill_numbers: ['B-1'], payment_method: 'Tunai' },
      ],
    } }
    if (url.startsWith('/reports/deposits/mutations')) return { status: true, data: {
      period_from: '2026-10-01T00:00:00+07:00', period_to: '2026-11-01T00:00:00+07:00',
      opening_balance: 60000, closing_balance: 85000, total_in: 115000, total_out: 90000,
      top_up: 100000, from_rewards: 5000, used: 30000, withdrawn: 60000, returned: 10000,
      entries: [
        { id: 'd1', customer_id: 'c2', customer_name: 'Bayu', customer_phone: null, type: 'topup', kind: 'reward', amount: 5000,
          balance_before: 10000, balance_after: 15000, notes: 'Tukar hadiah: Voucher', ref_transaction_id: null, bill_number: null,
          created_by: 'Kasir Sari', created_at: '2026-10-12T05:00:00Z' },
        { id: 'd2', customer_id: 'c1', customer_name: 'Ani', customer_phone: '0811', type: 'use', kind: 'used', amount: 30000,
          balance_before: 150000, balance_after: 120000, notes: null, ref_transaction_id: 't1', bill_number: 'INV-9',
          created_by: null, created_at: '2026-10-05T05:00:00Z' },
      ],
      pagination: { page: 1, limit: 50, total: 2 },
    } }
    if (url.startsWith('/reports/deposits/balances')) return { status: true, data: {
      outstanding: 85000, holder_count: 2,
      holders: [{ customer_id: 'c1', name: 'Ani', phone: '0811', deposit_balance: 70000, last_movement_at: '2026-10-09T05:00:00Z' }],
      pagination: { page: 1, limit: 50, total: 1 },
    } }
    if (/^\/purchase-order\/[^/]+\/payments/.test(url)) return { status: true, data: {
      purchase_order_id: 'po1', received_amount: 10800, paid_amount: 5000, balance: 5800, payment_status: 'partial',
      due_date: '2026-09-15', effective_due_date: '2026-09-15', first_received_at: '2026-09-10T03:00:00Z', days_overdue: 45,
      payments: [
        { id: 'pp1', purchase_order_id: 'po1', amount: 5000, paid_at: '2026-10-01T03:00:00Z', method: 'cash', cash_account_id: 'a1', cash_account_name: 'Kas Besar',
          note: 'DP', created_by_name: 'Budi', created_at: '2026-10-01T03:00:00Z', voided: false, voided_at: null, void_reason: null, voided_by_name: null },
        { id: 'pp2', purchase_order_id: 'po1', amount: 1000, paid_at: '2026-10-02T03:00:00Z', method: 'transfer', cash_account_id: null, cash_account_name: null,
          note: null, created_by_name: 'Budi', created_at: '2026-10-02T03:00:00Z', voided: true, voided_at: '2026-10-02T04:00:00Z', void_reason: 'salah nominal', voided_by_name: 'Rina' },
      ],
    } }
    if (url.startsWith('/purchase-report/payables/supplier')) return { status: true, data: {
      as_of: '2026-10-30', supplier_id: 's1', supplier_name: 'Agen Sembako', balance: 5800, overdue: 5800,
      aging: { current: 0, days_1_30: 0, days_31_60: 5800, days_61_90: 0, days_over_90: 0 },
      orders: [{ id: 'po1', po_number: 'PO-001', status: 'received', outlet_name: 'Pusat', order_date: '2026-09-01', first_received_at: '2026-09-10T03:00:00Z',
        due_date: '2026-09-15', effective_due_date: '2026-09-15', days_overdue: 45, received_amount: 10800, paid_amount: 5000, balance: 5800, payment_status: 'partial' }],
      entries: [
        { date: '2026-09-10T03:00:00Z', kind: 'receipt', purchase_order_id: 'po1', po_number: 'PO-001', amount: 10800, balance: 10800, note: null },
        { date: '2026-10-01T03:00:00Z', kind: 'payment', purchase_order_id: 'po1', po_number: 'PO-001', amount: 5000, balance: 5800, note: 'DP' },
      ],
    } }
    if (url.startsWith('/purchase-report/payables')) return { status: true, data: {
      as_of: '2026-10-30', total_balance: 15800, total_overdue: 15800, supplier_count: 2, open_order_count: 2,
      aging: { current: 0, days_1_30: 0, days_31_60: 5800, days_61_90: 0, days_over_90: 10000 },
      suppliers: [
        { supplier_id: null, supplier_name: '', open_order_count: 1, received_amount: 10000, paid_amount: 0, balance: 10000, overdue: 10000,
          oldest_due_date: '2026-07-22', aging: { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_over_90: 10000 } },
        { supplier_id: 's1', supplier_name: 'Agen Sembako', open_order_count: 1, received_amount: 10800, paid_amount: 5000, balance: 5800, overdue: 5800,
          oldest_due_date: '2026-09-15', aging: { current: 0, days_1_30: 0, days_31_60: 5800, days_61_90: 0, days_over_90: 0 } },
      ],
    } }
    if (url.startsWith('/purchase-report/purchases')) return { status: true, data: {
      start_date: '2026-10-01', end_date: '2026-10-30',
      summary: { total_purchase: 10800, order_count: 1, supplier_count: 1, item_count: 1 },
      by_supplier: [{ supplier_id: 's1', supplier_name: 'Agen Sembako', order_count: 1, quantity: 10, total: 10800 }],
      by_item: [{ item_type: 'product', product_id: 'p1', variant_id: null, raw_material_id: null, name: 'Indomie Goreng', variant_name: null, unit: 'bks', quantity: 10, total: 10800, average_cost: 1080 }],
      by_order: [{ id: 'po1', po_number: 'PO-001', supplier_id: 's1', supplier_name: 'Agen Sembako', outlet_name: 'Pusat', received_at: '2026-10-20T03:00:00Z',
        total: 10800, received_amount: 10800, paid_amount: 5000, balance: 5800, payment_status: 'partial' }],
    } }
    // ─── Akuntansi ───
    if (url.startsWith('/accounting/accounts')) return { status: true, data: [
      { id: 'g1', code: '1-1000', name: 'Kas & Bank', type: 'asset', normal_balance: 'debit', parent_id: null, is_group: true, is_system: true, is_active: true,
        cash_account_id: null, system_key: null, description: null, postable: false, balance: null, created_at: '2026-10-01T00:00:00Z' },
      { id: 'a1', code: '1-1100', name: 'Kas Laci (Kasir)', type: 'asset', normal_balance: 'debit', parent_id: 'g1', is_group: false, is_system: true, is_active: true,
        cash_account_id: null, system_key: 'cash_drawer', description: null, postable: true, balance: 4200000, created_at: '2026-10-01T00:00:00Z' },
      { id: 'a2', code: '1-1201', name: 'BCA Usaha', type: 'asset', normal_balance: 'debit', parent_id: 'g1', is_group: false, is_system: true, is_active: true,
        cash_account_id: 'ca1', system_key: null, description: null, postable: false, balance: 250000, created_at: '2026-10-01T00:00:00Z' },
      { id: 'e1', code: '6-1100', name: 'Beban Gaji', type: 'expense', normal_balance: 'debit', parent_id: null, is_group: false, is_system: false, is_active: true,
        cash_account_id: null, system_key: null, description: 'Gaji karyawan', postable: true, balance: 1000000, created_at: '2026-10-01T00:00:00Z' },
      { id: 'e2', code: '6-9900', name: 'Beban Lama', type: 'expense', normal_balance: 'debit', parent_id: null, is_group: false, is_system: false, is_active: false,
        cash_account_id: null, system_key: null, description: null, postable: false, balance: 0, created_at: '2026-10-01T00:00:00Z' },
    ] }
    if (url.startsWith('/accounting/mappings')) return { status: true, data: [
      { role: 'cash_drawer', label: 'Kas laci kasir', description: 'Penjualan & refund tunai', allowed_types: ['asset'], account_id: 'a1', account_code: '1-1100', account_name: 'Kas Laci (Kasir)' },
      { role: 'noncash_qris', label: 'Penerimaan QRIS', description: '', allowed_types: ['asset'], account_id: 'a2', account_code: '1-1201', account_name: 'BCA Usaha' },
    ] }
    const accManual = {
      key: 'manual:j1', date: '2026-10-12', occurred_at: '2026-10-12T03:00:00Z', source: 'manual', source_label: 'Jurnal umum', ref_type: 'journal', ref_id: 'j1',
      ref_no: 'JU/2610/0001', description: 'Gaji Oktober', voided: true, journal_id: 'j1', kind: 'general', reference: 'BKK-1', created_by_name: 'Budi',
      voided_at: '2026-10-13T03:00:00Z', void_reason: 'Salah nominal', voided_by_name: 'Rina', total_debit: 1000000, total_credit: 1000000,
      lines: [
        { account_id: 'e1', account_code: '6-1100', account_name: 'Beban Gaji', debit: 1000000, credit: 0, memo: 'Okt' },
        { account_id: 'a1', account_code: '1-1100', account_name: 'Kas Laci (Kasir)', debit: 0, credit: 1000000, memo: null },
      ],
    }
    if (url.startsWith('/accounting/journals/')) return { status: true, data: accManual }
    if (url.startsWith('/accounting/journal')) return { status: true, data: {
      start_date: '2026-10-01', end_date: '2026-10-30', total_debit: 21000, total_credit: 21000,
      entries: [
        { key: 'sale:t1', date: '2026-10-05', occurred_at: '2026-10-05T03:00:00Z', source: 'sale', source_label: 'Penjualan', ref_type: 'transaction', ref_id: 't1',
          ref_no: 'INV-001', description: 'Penjualan INV-001', voided: false, journal_id: null, kind: null, reference: null, created_by_name: null,
          voided_at: null, void_reason: null, voided_by_name: null, total_debit: 21000, total_credit: 21000,
          lines: [
            { account_id: 'a1', account_code: '1-1100', account_name: 'Kas Laci (Kasir)', debit: 21000, credit: 0, memo: null },
            { account_id: 'r1', account_code: '4-1100', account_name: 'Penjualan', debit: 0, credit: 21000, memo: null },
          ] },
        accManual,
      ],
      pagination: { page: 1, limit: 20, total: 2 },
    } }
    if (url.startsWith('/accounting/ledger')) return { status: true, data: {
      account: { id: 'a1', code: '1-1100', name: 'Kas Laci (Kasir)', type: 'asset', normal_balance: 'debit', parent_id: 'g1', is_group: false, is_system: true,
        is_active: true, cash_account_id: null, system_key: 'cash_drawer', description: null, postable: true, balance: null, created_at: '2026-10-01T00:00:00Z' },
      start_date: '2026-10-01', end_date: '2026-10-30', opening_balance: 4179000, total_debit: 21000, total_credit: 0, closing_balance: 4200000,
      lines: [{ entry_key: 'sale:t1', date: '2026-10-05', occurred_at: '2026-10-05T03:00:00Z', source: 'sale', source_label: 'Penjualan', ref_type: 'transaction',
        ref_id: 't1', ref_no: 'INV-001', description: 'Penjualan INV-001', memo: null, debit: 21000, credit: 0, balance: 4200000 }],
      pagination: { page: 1, limit: 50, total: 1 },
    } }
    if (url.startsWith('/accounting/trial-balance')) return { status: true, data: {
      start_date: '2026-10-01', end_date: '2026-10-30', fiscal_year_start: '2026-01-01', balanced: true,
      rows: [
        { account_id: 'a1', code: '1-1100', name: 'Kas Laci (Kasir)', type: 'asset', normal_balance: 'debit', parent_id: 'g1',
          opening_debit: 4179000, opening_credit: 0, debit: 21000, credit: 0, closing_debit: 4200000, closing_credit: 0 },
        { account_id: 'r1', code: '4-1100', name: 'Penjualan', type: 'revenue', normal_balance: 'credit', parent_id: null,
          opening_debit: 0, opening_credit: 4179000, debit: 0, credit: 21000, closing_debit: 0, closing_credit: 4200000 },
      ],
      totals: { opening_debit: 4179000, opening_credit: 4179000, debit: 21000, credit: 21000, closing_debit: 4200000, closing_credit: 4200000 },
    } }
    const accRow = (id: string, code: string, name: string, amount: number, extra: Record<string, unknown> = {}) =>
      ({ account_id: id, code, name, parent_id: null, is_group: false, level: 0, computed: false, amount, compare_amount: null, ...extra })
    if (url.startsWith('/accounting/profit-loss')) return { status: true, data: {
      start_date: '2026-10-01', end_date: '2026-10-30', compare: null, compare_start_date: null, compare_end_date: null,
      sections: [
        { type: 'revenue', label: 'Pendapatan', total: 51018000, compare_total: null, rows: [
          accRow('rg', '4-0000', 'Pendapatan', 51018000, { account_id: 'rg', is_group: true }),
          accRow('r1', '4-1100', 'Penjualan', 52000000, { level: 1, parent_id: 'rg' }),
          accRow('r2', '4-1200', 'Potongan Penjualan', -982000, { level: 1, parent_id: 'rg' }),
        ] },
        { type: 'cogs', label: 'Harga Pokok Penjualan', total: 20000000, compare_total: null, rows: [accRow('c1', '5-1100', 'Harga Pokok Penjualan', 20000000)] },
        { type: 'expense', label: 'Beban Operasional', total: 1000000, compare_total: null, rows: [accRow('e1', '6-1100', 'Beban Gaji', 1000000)] },
        { type: 'other_income', label: 'Pendapatan Lain-lain', total: 0, compare_total: null, rows: [] },
        { type: 'other_expense', label: 'Beban Lain-lain', total: 0, compare_total: null, rows: [] },
      ],
      summary: { total_revenue: 51018000, total_cogs: 20000000, gross_profit: 31018000, total_expense: 1000000, operating_income: 30018000,
        total_other_income: 0, total_other_expense: 0, net_income: 30018000 },
      compare_summary: null,
    } }
    if (url.startsWith('/accounting/balance-sheet')) return { status: true, data: {
      as_of: '2026-10-30', fiscal_year_start: '2026-01-01',
      sections: [
        { type: 'asset', label: 'Aset', total: 4450000, compare_total: null, rows: [accRow('a1', '1-1100', 'Kas Laci (Kasir)', 4200000), accRow('a2', '1-1201', 'BCA Usaha', 250000)] },
        { type: 'liability', label: 'Kewajiban', total: 0, compare_total: null, rows: [] },
        { type: 'equity', label: 'Ekuitas', total: 4450000, compare_total: null, rows: [
          accRow('q1', '3-1100', 'Prive', -50000),
          accRow('q2', '3-9000', 'Laba Ditahan', 3000, { computed: false }),
          accRow('', '3-9100', 'Laba Tahun Berjalan', 4497000, { account_id: null, computed: true }),
        ] },
      ],
      total_assets: 4450000, total_liabilities: 0, total_equity: 4450000, total_liabilities_and_equity: 4450000,
      retained_earnings: 3000, current_year_earnings: 4497000, balanced: true,
    } }
    return { status: true, data: [] }
  }
  const call = (url: string) => Promise.resolve({ data: byUrl(url) })
  return { default: { get: call, post: call, put: call, patch: call, delete: call, interceptors: { request: { use() {} }, response: { use() {} } } } }
})

import { useAuthStore } from '@/store/authStore'
import { useOutletStore } from '@/store/outletStore'
import BasePricesPage from './products/BasePricesPage'
import PayrollPage from './payroll/PayrollPage'
import MyPayrollPage from './payroll/MyPayrollPage'
import ConsignmentPage from './inventory/ConsignmentPage'
import OutletFormModal from '@/components/outlets/OutletFormModal'
import BundlesPage from './products/BundlesPage'
import BundleFormModal from '@/components/products/BundleFormModal'
import StaffCommissionPage from './reports/StaffCommissionPage'
import CashAccountsPage from './finance/CashAccountsPage'
import ReceiptProfitPage from './reports/ReceiptProfitPage'
import SalesSummaryPage from './reports/SalesSummaryPage'
import InventoryValuationPage from './reports/InventoryValuationPage'
import StockCardPage from './reports/StockCardPage'
import StockShrinkagePage from './reports/StockShrinkagePage'
import ReceivableAgingPage from './reports/ReceivableAgingPage'
import DepositReportPage from './reports/DepositReportPage'
import MasterExportPage from './reports/MasterExportPage'
import PurchaseReportPage from './reports/PurchaseReportPage'
import SupplierPayablesPage from './reports/SupplierPayablesPage'
import ProductionPage from './inventory/ProductionPage'
import ProductionReportPage from './reports/ProductionReportPage'
import ProductionFormModal from '@/components/production/ProductionFormModal'
import POPaymentSection from '@/components/purchasing/POPaymentSection'
import ChartOfAccountsPage from './accounting/ChartOfAccountsPage'
import AccountMappingPage from './accounting/AccountMappingPage'
import JournalPage from './accounting/JournalPage'
import GeneralLedgerPage from './accounting/GeneralLedgerPage'
import TrialBalancePage from './accounting/TrialBalancePage'
import ProfitLossPage from './accounting/ProfitLossPage'
import BalanceSheetPage from './accounting/BalanceSheetPage'
import JournalFormModal from '@/components/accounting/JournalFormModal'
import { t } from '@/lib/i18n'
import { formatStockQuantity } from '@/lib/money'

let host: HTMLDivElement
let root: Root
const errors: string[] = []
beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  useAuthStore.setState({
    token: 'x',
    user: { id: 'u', role: { code: 'OWNER', name: 'Owner' }, business: { business_name: 'Toko Uji', owner_name: 'Uji' }, permissions: [] } as never,
  })
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ')) })
})
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks() })

async function render(el: React.ReactElement, path?: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await act(async () => { root.render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={path ? [path] : undefined}>{el}</MemoryRouter></QueryClientProvider>) })
  await act(async () => { await new Promise(r => setTimeout(r, 50)) })
  const fatal = errors.filter(e => !/act\(|Warning:/.test(e))
  expect(fatal, fatal.join('\n')).toEqual([])
  expect(document.body.textContent?.length ?? 0).toBeGreaterThan(0)
}

describe('smoke halaman baru', () => {
  it('BasePricesPage', () => render(<BasePricesPage />))
  it('PayrollPage', () => render(<PayrollPage />))
  it('MyPayrollPage', () => render(<MyPayrollPage />))
  it('ConsignmentPage', () => render(<ConsignmentPage />))
  it('BundlesPage', () => render(<BundlesPage />))
  it('BundleFormModal', () => render(<BundleFormModal bundle={null} initialProductIds={['p1', 'p2']} onClose={() => {}} />))
  it('StaffCommissionPage', async () => {
    await render(<StaffCommissionPage />)
    expect(document.body.textContent).toContain('Budi')
    expect(document.body.textContent).toContain(t('scmNoEmployee'))
  })
  it('CashAccountsPage', async () => {
    await render(<CashAccountsPage />)
    const text = document.body.textContent ?? ''
    expect(text).toContain(t('cashAccLedgerTitle', { name: 'Kas Besar' }))
    expect(text).toContain('1234567890')
    expect(text).toContain('TRF/2610/0001')
    expect(text).toContain(t('cashAccRefTo', { name: 'BCA' }))
    expect(text).toContain(t('cashAccVoided'))
    expect(text).toContain('Tercatat dua kali')
    // Hanya baris yang masih bisa dibatalkan yang punya tombol Batalkan.
    expect(Array.from(document.querySelectorAll('button')).filter(b => b.textContent === t('cashAccVoidAction'))).toHaveLength(1)
  })
  it('ReceiptProfitPage', async () => {
    await render(<ReceiptProfitPage />)
    const text = document.body.textContent ?? ''
    expect(text).toContain('INV/2610/0007')
    expect(text).toContain('Pak Joko')
    expect(text).toContain(t('rcpWalkIn'))
    expect(text).toContain(t('rcpCostMissingBadge'))
    expect(text).toContain(t('rcpCostIncomplete', { count: 1 }))
  })
  it('InventoryValuationPage', async () => {
    await render(<InventoryValuationPage />)
    const text = document.body.textContent ?? ''
    expect(text).toContain('Teh Botol')
    // Barang terukur: 2500 gram dicetak dalam kilogram, bukan "2.500".
    expect(text).toContain(formatStockQuantity(2500, true, null, 'kg'))
    expect(text).toContain('Gula Pasir')
    expect(text).toContain(t('ivrMissingCostWarn', { count: 1 }))
    expect(text).toContain(t('ivrBadgeConsignment'))
  })
  it('StockCardPage tanpa barang menampilkan ajakan memilih', async () => {
    await render(<StockCardPage />)
    expect(document.body.textContent ?? '').toContain(t('ivrCardEmptyPickTitle'))
  })
  it('StockCardPage dari tautan barang: saldo dan jenis mutasi', async () => {
    await render(<StockCardPage />, '/reports/stock-card?product_id=p1&name=Teh%20Botol')
    const text = document.body.textContent ?? ''
    expect(text).toContain('INV-001')
    expect(text).toContain(t('ivrTypeOpname'))
    // Jenis yang belum dikenal tetap tampil dengan kodenya.
    expect(text).toContain('MIXING')
    expect(text).toContain(t('ivrCardUntracked', { qty: '20' }))
  })
  it('StockShrinkagePage', () => render(<StockShrinkagePage />))
  it('PurchaseReportPage: ringkasan, tab per barang, dan status bayar per PO', async () => {
    await render(<PurchaseReportPage />)
    let text = document.body.textContent ?? ''
    expect(text).toContain('Agen Sembako')
    const tab = (label: string) => Array.from(document.querySelectorAll('button[role="tab"]')).find(b => b.textContent === label) as HTMLButtonElement
    await act(async () => { tab(t('pbrTabItem')).click() })
    text = document.body.textContent ?? ''
    expect(text).toContain('Indomie Goreng')
    await act(async () => { tab(t('pbrTabOrder')).click() })
    text = document.body.textContent ?? ''
    expect(text).toContain('PO-001')
    expect(text).toContain(t('htsStatusPartial'))
  })
  it('SupplierPayablesPage: umur hutang, tanpa supplier, dan kartu hutang', async () => {
    await render(<SupplierPayablesPage />)
    let text = document.body.textContent ?? ''
    expect(text).toContain(t('htsNoSupplier'))
    expect(text).toContain(t('htsAging91'))
    const row = Array.from(document.querySelectorAll('tr')).find(tr => tr.textContent?.includes('Agen Sembako'))
    await act(async () => { row?.click() })
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    text = document.body.textContent ?? ''
    expect(text).toContain(t('htsCardPayment', { po: 'PO-001' }))
    expect(text).toContain(t('htsOverdueDays', { days: 45 }))
  })
  it('POPaymentSection: sisa hutang, riwayat batal, dan tombol Bayar', async () => {
    await render(<POPaymentSection po={{ id: 'po1', po_number: 'PO-001', status: 'received', order_date: '2026-09-01', total_amount: 10800, items: [], created_at: '2026-09-01T00:00:00Z' }} />)
    const text = document.body.textContent ?? ''
    expect(text).toContain('Kas Besar')
    expect(text).toContain(t('htsVoidedReason', { reason: 'salah nominal' }))
    expect(text).toContain(t('htsOverdueDays', { days: 45 }))
    const buttons = Array.from(document.querySelectorAll('button'))
    // Hanya pembayaran hidup yang bisa dibatalkan.
    expect(buttons.filter(b => b.textContent === t('htsVoid'))).toHaveLength(1)
    expect(buttons.some(b => b.textContent?.includes(t('htsPay')))).toBe(true)
  })
  it('SalesSummaryPage', async () => {
    await render(<SalesSummaryPage />)
    const text = document.body.textContent ?? ''
    expect(text).toContain('Rina')
    // Baris tanpa kasir berlabel kosong dari server dan dilokalkan di klien.
    expect(text).toContain(t('ssmNoneCashier'))
    expect(text).toContain(t('ssmGroupPayment'))
  })
  it('ReceivableAgingPage: kelompok umur, baris tanpa pelanggan, dan buku bon', async () => {
    await render(<ReceivableAgingPage />)
    let text = document.body.textContent ?? ''
    expect(text).toContain('Bu Ima')
    expect(text).toContain(t('ragNoCustomer'))
    expect(text).toContain(t('ragOverdueDays', { days: 127 }))
    expect(text).toContain(t('ragBucketOver90'))
    // Klik pelanggan membuka buku bonnya.
    const row = Array.from(document.querySelectorAll('tr')).find(tr => tr.textContent?.includes('Bu Ima'))
    await act(async () => { row?.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    text = document.body.textContent ?? ''
    expect(text).toContain(t('ragLedgerTitle', { name: 'Bu Ima' }))
    expect(text).toContain(t('ragLedgerBill', { bill: 'B-1' }))
  })
  it('DepositReportPage: mutasi dan saldo per pelanggan', async () => {
    await render(<DepositReportPage />)
    let text = document.body.textContent ?? ''
    expect(text).toContain('Bayu')
    expect(text).toContain(t('dprKindReward'))
    expect(text).toContain('#INV-9')
    const balancesTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent === t('dprTabBalances'))
    await act(async () => { balancesTab?.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    text = document.body.textContent ?? ''
    expect(text).toContain(t('dprHolderCount'))
    expect(text).toContain('0811')
  })
  it('MasterExportPage: pemilik melihat semua data master', async () => {
    await render(<MasterExportPage />)
    const text = document.body.textContent ?? ''
    for (const key of ['mexProducts', 'mexStock', 'mexCustomers', 'mexSuppliers', 'mexRawMaterials', 'mexEmployees'] as const) {
      expect(text).toContain(t(key))
    }
  })
  it('ProductionPage: ringkasan, baris batal, dan tombol Catat produksi', async () => {
    await render(<ProductionPage />)
    const text = document.body.textContent ?? ''
    expect(text).toContain('PRD/2610/0001')
    expect(text).toContain('Roti Tawar')
    expect(text).toContain(t('pdnVoidedBadge'))
    expect(text).toContain(t('pdnCreate'))
  })
  it('ProductionReportPage: per barang jadi dan komponen terpakai', async () => {
    await render(<ProductionReportPage />)
    const text = document.body.textContent ?? ''
    expect(text).toContain(t('pdnReportByProduct'))
    expect(text).toContain('Tepung Terigu')
    expect(text).toContain('PRD/2610/0002')
  })
  it('ProductionFormModal: komponen dari resep dan stok kurang', async () => {
    useOutletStore.setState({ selected: { id: 'o1', name: 'Pusat' } as never })
    await render(<ProductionFormModal open initialProductId="p1" onClose={() => {}} />)
    await act(async () => { await new Promise(r => setTimeout(r, 450)) })
    await act(async () => { await new Promise(r => setTimeout(r, 450)) })
    await act(async () => { await new Promise(r => setTimeout(r, 100)) })
    const text = document.body.textContent ?? ''
    expect(text).toContain('Tepung Terigu')
    expect(text).toContain(t('pdnShortages'))
  })
  it('ChartOfAccountsPage: pohon per jenis, saldo, dan perkiraan bawaan tanpa tombol nonaktif', async () => {
    await render(<ChartOfAccountsPage />)
    const text = document.body.textContent ?? ''
    expect(text).toContain(t('accTypeAsset'))
    expect(text).toContain(t('accTypeExpense'))
    expect(text).toContain('Kas Laci (Kasir)')
    expect(text).toContain(t('accBadgeCashTwin'))
    expect(text).not.toContain('Beban Lama')
    // Hanya Beban Gaji (bukan bawaan, aktif) yang bisa dinonaktifkan.
    expect(Array.from(document.querySelectorAll('button')).filter(b => b.textContent === t('accDeactivate'))).toHaveLength(1)
  })
  it('AccountMappingPage', async () => {
    await render(<AccountMappingPage />)
    const text = document.body.textContent ?? ''
    expect(text).toContain('Kas laci kasir')
    expect(text).toContain('1-1201 · BCA Usaha')
  })
  it('JournalPage: entri otomatis & jurnal umum batal, baris D/K bisa dibuka', async () => {
    await render(<JournalPage />)
    let text = document.body.textContent ?? ''
    expect(text).toContain('INV-001')
    expect(text).toContain('JU/2610/0001')
    expect(text).toContain(t('accVoidedReason', { reason: 'Salah nominal' }))
    expect(text).not.toContain('Beban Gaji')
    const expand = Array.from(document.querySelectorAll('button')).find(b => b.textContent === t('accExpandAll'))
    await act(async () => { expand?.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    text = document.body.textContent ?? ''
    expect(text).toContain('Beban Gaji')
    expect(text).toContain('4-1100')
  })
  it('JournalFormModal: simpan nonaktif sampai seimbang', async () => {
    await render(<JournalFormModal onClose={() => {}} />)
    const save = Array.from(document.querySelectorAll('button')).find(b => b.textContent === t('accJournalSave')) as HTMLButtonElement
    expect(save.disabled).toBe(true)
    expect(document.body.textContent).toContain(t('accJournalIssueEmpty'))
  })
  it('GeneralLedgerPage tanpa perkiraan menampilkan ajakan memilih', async () => {
    await render(<GeneralLedgerPage />)
    expect(document.body.textContent ?? '').toContain(t('accLedgerPickTitle'))
  })
  it('GeneralLedgerPage: saldo awal, mutasi, saldo akhir', async () => {
    await render(<GeneralLedgerPage />, '/accounting/ledger?account_id=a1')
    const text = document.body.textContent ?? ''
    expect(text).toContain('INV-001')
    expect(text).toContain(t('accOpeningBalance'))
    expect(text).toContain(t('accClosingBalance'))
  })
  it('TrialBalancePage: subtotal per jenis', async () => {
    await render(<TrialBalancePage />)
    const text = document.body.textContent ?? ''
    expect(text).toContain('Kas Laci (Kasir)')
    expect(text).toContain(t('accTotalOf', { label: t('accTypeRevenue') }))
    expect(text).not.toContain(t('accNotBalancedWarn'))
  })
  it('ProfitLossPage: laba kotor, laba usaha, laba bersih', async () => {
    await render(<ProfitLossPage />)
    const text = document.body.textContent ?? ''
    expect(text).toContain('Potongan Penjualan')
    expect(text).toContain(t('accGrossProfit'))
    expect(text).toContain(t('accOperatingIncome'))
    expect(text).toContain(t('accNetIncome'))
  })
  it('BalanceSheetPage: cek Aset = Kewajiban + Ekuitas', async () => {
    await render(<BalanceSheetPage />)
    const text = document.body.textContent ?? ''
    expect(text).toContain(t('accBalancedCheck'))
    expect(text).toContain('Laba Tahun Berjalan')
    expect(text).toContain(t('accTotalLiabilitiesEquity'))
  })
  it('OutletFormModal', () => render(<OutletFormModal open businessId="b" onClose={() => {}} onSuccess={() => {}} outlet={null} />))
})
