import api from '@/lib/axios'
import type { ApiResponse } from '@/types'

// ─── Akuntansi (pembukuan berpasangan) ───────────────────────────────────────
// Jurnal otomatis DITURUNKAN saat dibaca dari data Loka (nota, PO, Kas &
// Rekening, shift, stok, …) — tidak ada tombol posting dan tidak bisa diubah.
// Yang ditulis pengguna hanya Daftar Perkiraan, Pemetaan, dan Jurnal Umum.
// Kontrak: scratchpad accounting-contract.md / controller/accounting_controller.go.

export const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'cogs', 'expense', 'other_income', 'other_expense'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]
export type NormalBalance = 'debit' | 'credit'

export interface AccAccount {
  id: string
  code: string
  name: string
  type: AccountType
  normal_balance: NormalBalance
  parent_id: string | null
  /** Perkiraan induk: tidak bisa dijurnal, berisi subtotal di laporan. */
  is_group: boolean
  /** Bawaan template / kembaran akun kas: tidak bisa dinonaktifkan, jenis tetap. */
  is_system: boolean
  is_active: boolean
  /** Terisi = kembaran akun Kas & Rekening (nama ikut akun kasnya). */
  cash_account_id: string | null
  system_key: string | null
  description: string | null
  /** Boleh dipilih di jurnal umum. */
  postable: boolean
  /** Hanya bila with_balance=true; bertanda saldo normal. null untuk induk. */
  balance: number | null
  created_at: string
}

export interface AccAccountPayload {
  code: string
  name: string
  type: AccountType
  parent_id?: string | null
  is_group?: boolean
  normal_balance?: NormalBalance
  description?: string | null
}

export interface AccMapping {
  role: string
  label: string
  description: string
  /** Kosong = jenis apa pun. */
  allowed_types: AccountType[]
  account_id: string
  account_code: string
  account_name: string
}

export const JOURNAL_SOURCES = [
  'sale', 'receivable_payment', 'refund', 'purchase', 'supplier_payment', 'cash_book', 'cash_transfer',
  'opening_balance', 'shift_cash', 'shift_discrepancy', 'customer_deposit', 'stock_adjustment', 'production', 'manual',
] as const
export type JournalSource = (typeof JOURNAL_SOURCES)[number]
export type JournalKind = 'general' | 'adjustment' | 'opening'

export interface AccJournalLine {
  account_id: string
  account_code: string
  account_name: string
  debit: number
  credit: number
  /** Hanya baris jurnal manual. */
  memo: string | null
}

export interface AccJournalEntry {
  /** Unik per entri — dipakai sebagai key daftar. */
  key: string
  /** Tanggal lokal usaha YYYY-MM-DD. */
  date: string
  occurred_at: string
  source: string
  source_label: string
  ref_type: string
  ref_id: string | null
  ref_no: string | null
  description: string
  /** Hanya jurnal manual yang bisa true. */
  voided: boolean
  journal_id: string | null
  kind: JournalKind | null
  reference: string | null
  created_by_name: string | null
  voided_at: string | null
  void_reason: string | null
  voided_by_name: string | null
  total_debit: number
  total_credit: number
  lines: AccJournalLine[]
}

export interface AccPagination { page: number; limit: number; total: number }

export interface AccJournalPage {
  start_date: string
  end_date: string
  /** Seluruh entri rentang+saringan, tanpa jurnal batal. */
  total_debit: number
  total_credit: number
  /** Terbaru dulu. */
  entries: AccJournalEntry[]
  pagination: AccPagination
}

export interface JournalParams {
  start_date?: string
  end_date?: string
  source?: string
  page?: number
  limit?: number
  /** 1 = semua entri rentang itu (maks 10.000) untuk CSV. */
  export?: 1
}

export interface JournalLinePayload {
  account_id: string
  debit: number
  credit: number
  memo?: string | null
}

export interface JournalPayload {
  date?: string
  kind?: JournalKind
  description: string
  reference?: string | null
  lines: JournalLinePayload[]
}

export interface AccLedgerLine {
  entry_key: string
  date: string
  occurred_at: string
  source: string
  source_label: string
  ref_type: string
  ref_id: string | null
  ref_no: string | null
  description: string
  memo: string | null
  debit: number
  credit: number
  /** Saldo berjalan setelah baris ini (bertanda saldo normal). */
  balance: number
}

export interface AccLedger {
  account: AccAccount
  start_date: string
  end_date: string
  opening_balance: number
  total_debit: number
  total_credit: number
  closing_balance: number
  /** Kronologis (terlama dulu). */
  lines: AccLedgerLine[]
  pagination: AccPagination
}

export interface LedgerParams {
  account_id: string
  start_date?: string
  end_date?: string
  page?: number
  limit?: number
  export?: 1
}

export interface AccTrialBalanceAmounts {
  opening_debit: number
  opening_credit: number
  debit: number
  credit: number
  closing_debit: number
  closing_credit: number
}

export interface AccTrialBalanceRow extends AccTrialBalanceAmounts {
  account_id: string
  code: string
  name: string
  type: AccountType
  normal_balance: NormalBalance
  parent_id: string | null
}

export interface AccTrialBalance {
  start_date: string
  end_date: string
  fiscal_year_start: string
  rows: AccTrialBalanceRow[]
  totals: AccTrialBalanceAmounts
  balanced: boolean
}

export interface AccReportRow {
  /** null untuk baris hitungan (Laba Tahun Berjalan). */
  account_id: string | null
  code: string
  name: string
  parent_id: string | null
  is_group: boolean
  level: number
  computed: boolean
  amount: number
  compare_amount: number | null
}

export interface AccReportSection {
  type: AccountType
  label: string
  total: number
  compare_total: number | null
  rows: AccReportRow[]
}

export interface AccProfitLossSummary {
  total_revenue: number
  total_cogs: number
  gross_profit: number
  total_expense: number
  operating_income: number
  total_other_income: number
  total_other_expense: number
  net_income: number
}

export type ProfitLossCompare = 'previous_period' | 'previous_year'

export interface AccProfitLoss {
  start_date: string
  end_date: string
  compare: ProfitLossCompare | null
  compare_start_date: string | null
  compare_end_date: string | null
  sections: AccReportSection[]
  summary: AccProfitLossSummary
  compare_summary: AccProfitLossSummary | null
}

export interface AccBalanceSheet {
  as_of: string
  fiscal_year_start: string
  sections: AccReportSection[]
  total_assets: number
  total_liabilities: number
  total_equity: number
  total_liabilities_and_equity: number
  retained_earnings: number
  current_year_earnings: number
  balanced: boolean
}

export interface RangeParams { start_date?: string; end_date?: string }

const idempotent = (key?: string) => (key ? { headers: { 'Idempotency-Key': key } } : undefined)

// ─── Daftar Perkiraan ────────────────────────────────────────────────────────
export const getAccAccounts = (params?: { include_inactive?: boolean; with_balance?: boolean }) =>
  api.get<ApiResponse<AccAccount[]>>('/accounting/accounts', { params })

export const createAccAccount = (data: AccAccountPayload) =>
  api.post<ApiResponse<AccAccount>>('/accounting/accounts', data)

export const updateAccAccount = (id: string, data: AccAccountPayload) =>
  api.put<ApiResponse<AccAccount>>(`/accounting/accounts/${id}`, data)

export const deactivateAccAccount = (id: string) =>
  api.post<ApiResponse<AccAccount>>(`/accounting/accounts/${id}/deactivate`)

export const activateAccAccount = (id: string) =>
  api.post<ApiResponse<AccAccount>>(`/accounting/accounts/${id}/activate`)

// ─── Pemetaan ────────────────────────────────────────────────────────────────
export const getAccMappings = () =>
  api.get<ApiResponse<AccMapping[]>>('/accounting/mappings')

export const updateAccMappings = (mappings: { role: string; account_id: string }[]) =>
  api.put<ApiResponse<AccMapping[]>>('/accounting/mappings', { mappings })

// ─── Jurnal ──────────────────────────────────────────────────────────────────
export const getAccJournal = (params: JournalParams) =>
  api.get<ApiResponse<AccJournalPage>>('/accounting/journal', { params })

export const getAccJournalById = (id: string) =>
  api.get<ApiResponse<AccJournalEntry>>(`/accounting/journals/${id}`)

export const createAccJournal = (data: JournalPayload, idempotencyKey?: string) =>
  api.post<ApiResponse<AccJournalEntry>>('/accounting/journals', data, idempotent(idempotencyKey))

export const voidAccJournal = (id: string, reason: string) =>
  api.post<ApiResponse<AccJournalEntry>>(`/accounting/journals/${id}/void`, { reason })

// ─── Laporan ─────────────────────────────────────────────────────────────────
export const getAccLedger = (params: LedgerParams) =>
  api.get<ApiResponse<AccLedger>>('/accounting/ledger', { params })

export const getAccTrialBalance = (params: RangeParams & { include_zero?: boolean }) =>
  api.get<ApiResponse<AccTrialBalance>>('/accounting/trial-balance', { params })

export const getAccProfitLoss = (params: RangeParams & { compare?: ProfitLossCompare }) =>
  api.get<ApiResponse<AccProfitLoss>>('/accounting/profit-loss', { params })

export const getAccBalanceSheet = (params: { as_of?: string }) =>
  api.get<ApiResponse<AccBalanceSheet>>('/accounting/balance-sheet', { params })
