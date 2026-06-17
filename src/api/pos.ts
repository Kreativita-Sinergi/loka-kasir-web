import api from '@/lib/axios'
import type { ApiResponse, PaymentOrder, Product, Shift, Transaction } from '@/types'
import type {
  CreateTransactionPayload,
  PaymentPayload,
} from '@/pages/pos/types'

// ─── Master-data delta sync (offline-first catalog) ──────────────────────────
// Reuses the same endpoint the Flutter POS uses: GET /sync/products.
// Returns products changed since `lastSync` (RFC3339). Soft-deleted products
// carry a non-null `deleted_at` so the caller can evict them from cache.

export type SyncedProduct = Product & { deleted_at?: string | null }

export const syncProducts = (outletId: string, lastSync?: string | null) =>
  api.get<ApiResponse<SyncedProduct[]>>('/sync/products', {
    params: { outlet_id: outletId, last_sync: lastSync || undefined },
  })

// ─── Online transaction flow ─────────────────────────────────────────────────
// Mirrors the app: create an (unpaid) transaction, then settle payment.

export const createTransaction = (data: CreateTransactionPayload) =>
  api.post<ApiResponse<Transaction>>('/transaction', data)

export const payTransaction = (transactionId: string, data: PaymentPayload) =>
  api.put<ApiResponse<Transaction>>(`/transaction/payment/${transactionId}`, data)

// ─── Offline batch sync ──────────────────────────────────────────────────────

export type SyncItemStatus = 'SUCCESS' | 'DUPLICATE' | 'CONFLICT'

export interface SyncItemResult {
  local_id: string
  status: SyncItemStatus
  server_transaction_id?: string
  existing_tx_id?: string
  reason?: string
}

export interface SyncBatchResponse {
  results: SyncItemResult[]
  success_count: number
  duplicate_count: number
  conflict_count: number
}

/** One transaction in the offline batch (matches backend SyncTransactionItem). */
export interface SyncBatchItem {
  local_id: string
  idempotency_key: string
  created_at_ms: number
  customer_name?: string | null
  customer_id?: string | null
  customer_phone?: string | null
  notes?: string | null
  service_type: number
  table?: string | null
  items: CreateTransactionPayload['items']
}

export const syncTransactions = (transactions: SyncBatchItem[]) =>
  api.post<ApiResponse<SyncBatchResponse>>('/transaction/sync', { transactions })

// ─── Shift (cashier session) ─────────────────────────────────────────────────

export interface OpenShiftPayload {
  terminal_id: string
  outlet_id?: string | null
  shift_schedule_id?: string | null
  opening_cash: number
  notes?: string | null
  pin: string
  /** Open the shift FOR this cashier (employee). Owner/manager flow. Falls back to JWT user. */
  cashier_id?: string | null
}

export const openShift = (data: OpenShiftPayload) =>
  api.post<ApiResponse<Shift>>('/shift', data)

export const closeShift = (id: string, data: { closing_cash: number; notes?: string | null }) =>
  api.put<ApiResponse<Shift>>(`/shift/${id}`, data)

/** Active shift for the logged-in cashier (cashier id taken from JWT). */
export const getActiveShift = () =>
  api.get<ApiResponse<Shift | null>>('/shift/active/me')

/** Active shift for a specific cashier (employee) — used to open/continue a shift. */
export const getActiveShiftForCashier = (cashierId: string) =>
  api.get<ApiResponse<Shift | null>>(`/shift/active/cashier/${cashierId}`)

/** Active shift open on a specific terminal — dipakai memulihkan terminal sesi
 *  yang tak cocok saat checkout (lihat useCheckout). */
export const getActiveShiftByTerminal = (terminalId: string) =>
  api.get<ApiResponse<Shift | null>>(`/shift/active/${terminalId}`)

// ─── QRIS dinamis (Duitku milik merchant) ────────────────────────────────────
// Tagih satu transaksi POS via QRIS dinamis pakai akun Duitku merchant. Backend
// balas payment_url (di-render sebagai QR). Status dipantau via getPaymentOrder
// dan di-settle otomatis oleh callback Duitku.

export const createPosQrisCharge = (transactionId: string, email?: string) =>
  api.post<ApiResponse<PaymentOrder>>('/payment-order/pos-qris', {
    transaction_id: transactionId,
    email,
  })

export const getPaymentOrder = (id: string) =>
  api.get<ApiResponse<PaymentOrder>>(`/payment-order/${id}`)
