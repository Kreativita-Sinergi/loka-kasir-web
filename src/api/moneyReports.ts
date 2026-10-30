import api from '@/lib/axios'
import type { ApiResponse } from '@/types'

// ─── Laporan uang pelanggan & ekspor data master ─────────────────────────────
// Umur Piutang (kasbon menurut lewat jatuh temponya), Saldo Deposit (mutasi &
// sisa titipan pelanggan), dan CSV data master. Endpointnya sama dengan
// aplikasi; paket dan izin diputuskan server.

/** Sisa kasbon per kelompok umur. `current` = belum jatuh tempo. */
export interface AgingBuckets {
  current: number
  days_1_30: number
  days_31_60: number
  days_61_90: number
  over_90: number
}

export const AGING_BUCKETS = ['current', 'days_1_30', 'days_31_60', 'days_61_90', 'over_90'] as const
export type AgingBucket = (typeof AGING_BUCKETS)[number]

/** Kelompok untuk [days] hari lewat jatuh tempo — batas yang sama dengan server. */
export function agingBucketOf(days: number): AgingBucket {
  if (days <= 0) return 'current'
  if (days <= 30) return 'days_1_30'
  if (days <= 60) return 'days_31_60'
  if (days <= 90) return 'days_61_90'
  return 'over_90'
}

export interface AgingCustomer extends AgingBuckets {
  /** null = kasbon tanpa pelanggan, dikumpulkan menjadi satu baris. */
  customer_id: string | null
  name: string
  phone: string | null
  count: number
  bill_total: number
  paid_total: number
  outstanding: number
  overdue: number
  oldest_at: string
  max_days_overdue: number
  kasbon_limit: number | null
  due_day: number | null
}

export interface ReceivableAging extends AgingBuckets {
  as_of: string
  outstanding: number
  overdue: number
  count: number
  customer_count: number
  customers: AgingCustomer[]
}

export const getReceivableAging = (params?: { outlet_id?: string; search?: string }) =>
  api.get<ApiResponse<ReceivableAging>>('/reports/receivable-aging', { params })

// ─── Buku bon satu pelanggan ─────────────────────────────────────────────────

export interface KasbonLedgerEntry {
  type: 'bon' | 'payment'
  at: string
  amount: number
  /** Sisa utang sesudah baris ini. */
  balance: number
  transaction_id?: string
  bill_number?: string
  bill_numbers?: string[]
  payment_method?: string
}

export interface KasbonLedger {
  customer_id: string
  opening_balance: number
  closing_balance: number
  total_bon: number
  total_paid: number
  entries: KasbonLedgerEntry[]
}

export const getKasbonLedger = (customerId: string, params?: { start_date?: string; end_date?: string; outlet_id?: string }) =>
  api.get<ApiResponse<KasbonLedger>>(`/transaction/kasbon/customers/${customerId}/ledger`, { params })

// ─── Saldo Deposit ───────────────────────────────────────────────────────────

/** Arti mutasi: server menyimpan topup/use dan memecahnya menurut nota & catatan. */
export type DepositKind = 'top_up' | 'reward' | 'returned' | 'used' | 'withdrawn'

export const depositKindIsIn = (kind: DepositKind) => kind === 'top_up' || kind === 'reward' || kind === 'returned'

export interface DepositMutation {
  id: string
  customer_id: string
  customer_name: string
  customer_phone: string | null
  type: 'topup' | 'use'
  kind: DepositKind
  amount: number
  balance_before: number
  balance_after: number
  notes: string | null
  ref_transaction_id: string | null
  bill_number: string | null
  created_by: string | null
  created_at: string
}

export interface ReportPagination {
  page: number
  limit: number
  total: number
}

export interface DepositMutationReport {
  period_from: string
  period_to: string
  opening_balance: number
  closing_balance: number
  total_in: number
  total_out: number
  top_up: number
  from_rewards: number
  used: number
  withdrawn: number
  returned: number
  entries: DepositMutation[]
  pagination: ReportPagination
}

export interface DepositMutationParams {
  start_date?: string
  end_date?: string
  customer_id?: string
  page?: number
  limit?: number
  /** 1 = seluruh rentang sekaligus (untuk CSV). */
  export?: 1
}

export const getDepositMutations = (params: DepositMutationParams) =>
  api.get<ApiResponse<DepositMutationReport>>('/reports/deposits/mutations', { params })

export interface DepositHolder {
  customer_id: string
  name: string
  phone: string | null
  deposit_balance: number
  last_movement_at: string | null
}

export interface DepositBalanceReport {
  outstanding: number
  holder_count: number
  holders: DepositHolder[]
  pagination: ReportPagination
}

export const getDepositBalances = (params: { search?: string; page?: number; limit?: number; export?: 1 }) =>
  api.get<ApiResponse<DepositBalanceReport>>('/reports/deposits/balances', { params })

// ─── Ekspor data master ──────────────────────────────────────────────────────

/** CSV mentah dari server (`/export/customers`, `/product/export`, …). */
export const downloadMasterCsv = (path: string, params?: Record<string, string>) =>
  api.get<Blob>(path, { params, responseType: 'blob' })
