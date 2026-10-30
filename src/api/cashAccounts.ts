import api from '@/lib/axios'
import type { ApiResponse } from '@/types'

// ─── Kas & Rekening ──────────────────────────────────────────────────────────
// Akun kas/rekening milik usaha + buku mutasi per akun. Kas laci shift BUKAN
// akun: ia tetap dicatat per shift (lihat ShiftCashFlow di bawah).

export type CashAccountKind = 'cash' | 'bank'

export interface CashAccount {
  id: string
  kind: CashAccountKind
  name: string
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
  opening_balance: number
  is_active: boolean
  sort_order: number
  /** null bila pemanggil tidak memegang finance.cash_book. */
  balance: number | null
  created_at: string
}

export interface CashAccountPayload {
  kind: CashAccountKind
  name: string
  bank_name?: string | null
  account_number?: string | null
  account_holder?: string | null
  opening_balance?: number
  is_active?: boolean
}

export type LedgerSource = 'manual' | 'transfer' | 'shift' | 'sale'
export type CashFlowType = 'IN' | 'OUT'
/** Kategori yang boleh dipilih saat mencatat masuk/keluar secara manual. */
export type ManualEntryCategory = 'income' | 'expense' | 'capital' | 'withdrawal' | 'other'
export type LedgerCategory = ManualEntryCategory | 'transfer' | 'shift_deposit' | 'sale'

export interface LedgerEntry {
  id: string
  source: LedgerSource
  type: CashFlowType
  amount: number
  category: LedgerCategory
  description: string | null
  /** Nota (sale), akun lawan (transfer), atau shift (shift). */
  reference: string | null
  /** Nomor bukti transfer — terisi pada baris transfer. */
  number?: string | null
  transaction_id: string | null
  shift_id: string | null
  occurred_at: string
  /** null untuk baris batal. */
  balance_after: number | null
  created_by_name: string | null
  voided: boolean
  voided_at: string | null
  void_reason: string | null
  voided_by_name: string | null
  /** Hanya manual & transfer yang belum batal. */
  voidable: boolean
}

export interface CashLedgerPage {
  account: CashAccount
  /** Saldo pada awal start_date. */
  opening_balance: number
  /** Tidak termasuk baris batal. */
  total_in: number
  total_out: number
  /** Saldo pada akhir end_date. */
  closing_balance: number
  /** Terbaru dulu. */
  entries: LedgerEntry[]
  pagination: { page: number; limit: number; total: number }
}

export interface CashLedgerParams {
  start_date?: string
  end_date?: string
  page?: number
  limit?: number
}

export interface CashEntryPayload {
  type: CashFlowType
  amount: number
  category: ManualEntryCategory
  description?: string | null
  occurred_at?: string
}

export interface CashTransferPayload {
  from_account_id: string
  to_account_id: string
  amount: number
  description?: string | null
  occurred_at?: string
  /** Kosong → server membuat nomor otomatis `TRF/YYMM/NNNN`. */
  number?: string
}

export interface CashTransferResult {
  transfer_id: string
  number: string
  /** Saldo kedua akun setelah transfer. */
  from_balance: number
  to_balance: number
}

/** Header idempotensi: kunci yang sama untuk percobaan ulang formulir yang sama. */
const idempotent = (key?: string) => (key ? { headers: { 'Idempotency-Key': key } } : undefined)

export const getCashAccounts = (params?: { include_inactive?: boolean }) =>
  api.get<ApiResponse<CashAccount[]>>('/finance/cash-accounts', { params })

export const createCashAccount = (data: CashAccountPayload) =>
  api.post<ApiResponse<CashAccount>>('/finance/cash-accounts', data)

export const updateCashAccount = (id: string, data: CashAccountPayload) =>
  api.put<ApiResponse<CashAccount>>(`/finance/cash-accounts/${id}`, data)

export const deleteCashAccount = (id: string) =>
  api.delete<ApiResponse<null>>(`/finance/cash-accounts/${id}`)

export const getCashLedger = (id: string, params: CashLedgerParams) =>
  api.get<ApiResponse<CashLedgerPage>>(`/finance/cash-accounts/${id}/ledger`, { params })

export const createCashEntry = (accountId: string, data: CashEntryPayload, idempotencyKey?: string) =>
  api.post<ApiResponse<LedgerEntry>>(`/finance/cash-accounts/${accountId}/entries`, data, idempotent(idempotencyKey))

export const createCashTransfer = (data: CashTransferPayload, idempotencyKey?: string) =>
  api.post<ApiResponse<CashTransferResult>>('/finance/cash-transfers', data, idempotent(idempotencyKey))

/** Transfer: kedua sisi ikut batal. Baris shift ditolak server. */
export const voidCashEntry = (entryId: string, reason: string) =>
  api.post<ApiResponse<LedgerEntry>>(`/finance/cash-entries/${entryId}/void`, { reason })

// ─── Kas masuk/keluar shift ──────────────────────────────────────────────────

export interface ShiftCashFlow {
  id: string
  type: CashFlowType
  source: 'manual' | 'settlement' | 'deposit'
  amount: number
  description: string | null
  created_at: string
  created_by_name: string | null
  cash_account_id: string | null
  cash_account_name: string | null
  voided: boolean
  voided_at: string | null
  void_reason: string | null
  voided_by_name: string | null
  /** manual & belum batal & (shift open ATAU pemanggil punya pos.supervisor_override). */
  voidable: boolean
}

/** Lama → baru. */
export const getShiftCashFlows = (shiftId: string) =>
  api.get<ApiResponse<ShiftCashFlow[]>>(`/shift/${shiftId}/cash-flows`)

export const voidShiftCashFlow = (shiftId: string, flowId: string, reason: string) =>
  api.post<ApiResponse<ShiftCashFlow>>(`/shift/${shiftId}/cash-flow/${flowId}/void`, { reason })
