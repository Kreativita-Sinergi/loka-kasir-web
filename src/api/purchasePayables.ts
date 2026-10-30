import api from '@/lib/axios'
import type { ApiResponse } from '@/types'

// ─── Hutang supplier & laporan pembelian ─────────────────────────────────────
// Hutang PO = nilai barang yang SUDAH diterima dikurangi pembayaran yang tidak
// dibatalkan; barang yang baru dipesan belum menjadi hutang.

export type POPaymentStatus = 'none' | 'unpaid' | 'partial' | 'paid'
export type POPaymentMethod = 'cash' | 'transfer' | 'other'

export interface POPayment {
  id: string
  purchase_order_id: string
  amount: number
  paid_at: string
  method: POPaymentMethod
  cash_account_id: string | null
  cash_account_name: string | null
  note: string | null
  created_by_name: string | null
  created_at: string
  voided: boolean
  voided_at: string | null
  void_reason: string | null
  voided_by_name: string | null
}

export interface POPaymentSummary {
  purchase_order_id: string
  received_amount: number
  paid_amount: number
  balance: number
  payment_status: POPaymentStatus
  /** YYYY-MM-DD; null = bayar saat barang datang. */
  due_date: string | null
  /** Jatuh tempo, atau tanggal terima pertama bila PO tanpa tempo. */
  effective_due_date: string | null
  first_received_at: string | null
  days_overdue: number
  payments: POPayment[]
}

export interface POPaymentPayload {
  amount: number
  /** RFC3339; kosong = sekarang. */
  paid_at?: string
  method?: POPaymentMethod
  /** Diisi = uang keluar dari akun Kas & Rekening ini (butuh finance.cash_book). */
  cash_account_id?: string | null
  note?: string | null
}

export interface PayableAging {
  current: number
  days_1_30: number
  days_31_60: number
  days_61_90: number
  days_over_90: number
}

export interface SupplierPayable {
  /** null = PO tanpa supplier. */
  supplier_id: string | null
  supplier_name: string
  open_order_count: number
  received_amount: number
  paid_amount: number
  balance: number
  overdue: number
  oldest_due_date: string | null
  aging: PayableAging
}

export interface PayablesReport {
  as_of: string
  total_balance: number
  total_overdue: number
  supplier_count: number
  open_order_count: number
  aging: PayableAging
  suppliers: SupplierPayable[]
}

export interface PayableOrder {
  id: string
  po_number: string
  status: string
  outlet_name: string | null
  order_date: string
  first_received_at: string | null
  due_date: string | null
  effective_due_date: string | null
  days_overdue: number
  received_amount: number
  paid_amount: number
  balance: number
  payment_status: POPaymentStatus
}

export interface PayableCardEntry {
  date: string
  kind: 'receipt' | 'payment'
  purchase_order_id: string
  po_number: string
  amount: number
  balance: number
  note: string | null
}

export interface SupplierPayableDetail {
  as_of: string
  supplier_id: string | null
  supplier_name: string
  balance: number
  overdue: number
  aging: PayableAging
  orders: PayableOrder[]
  entries: PayableCardEntry[]
}

export interface PurchaseReport {
  start_date: string
  end_date: string
  summary: { total_purchase: number; order_count: number; supplier_count: number; item_count: number }
  by_supplier: { supplier_id: string | null; supplier_name: string; order_count: number; quantity: number; total: number }[]
  by_item: {
    item_type: 'product' | 'raw_material'
    product_id: string | null
    variant_id: string | null
    raw_material_id: string | null
    name: string
    variant_name: string | null
    unit: string
    quantity: number
    total: number
    average_cost: number
  }[]
  by_order: {
    id: string
    po_number: string
    supplier_id: string | null
    supplier_name: string
    outlet_name: string | null
    received_at: string
    total: number
    received_amount: number
    paid_amount: number
    balance: number
    payment_status: POPaymentStatus
  }[]
}

export const getPOPayments = (poId: string) =>
  api.get<ApiResponse<POPaymentSummary>>(`/purchase-order/${poId}/payments`)

/** [idempotencyKey] satu per formulir: Bayar yang terkirim ulang tidak mencatat dua kali. */
export const addPOPayment = (poId: string, data: POPaymentPayload, idempotencyKey?: string) =>
  api.post<ApiResponse<POPaymentSummary>>(`/purchase-order/${poId}/payments`, data,
    idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined)

export const voidPOPayment = (poId: string, paymentId: string, reason: string) =>
  api.post<ApiResponse<POPaymentSummary>>(`/purchase-order/${poId}/payments/${paymentId}/void`, { reason })

/** due_date null menghapus jatuh tempo. */
export const setPODueDate = (poId: string, dueDate: string | null) =>
  api.patch<ApiResponse<POPaymentSummary>>(`/purchase-order/${poId}/due-date`, { due_date: dueDate })

export const getPayablesReport = () =>
  api.get<ApiResponse<PayablesReport>>('/purchase-report/payables')

/** supplier_id = id supplier, atau "none" untuk PO tanpa supplier. */
export const getSupplierPayable = (supplierId: string) =>
  api.get<ApiResponse<SupplierPayableDetail>>('/purchase-report/payables/supplier', { params: { supplier_id: supplierId } })

export const getPurchaseReport = (params: { start_date: string; end_date: string; outlet_id?: string }) =>
  api.get<ApiResponse<PurchaseReport>>('/purchase-report/purchases', { params })
