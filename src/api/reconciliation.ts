import api from '@/lib/axios'
import type { ApiResponse } from '@/types'

const endpoint = '/finance/reconciliation'
export interface BankImportRow {
  date: string
  amount: string
  reference: string
  description: string
}
export interface BankRow {
  currency_code: string
  decimal_digits: number
  id: string
  import_name: string
  date: string
  amount_minor: number
  reference: string
  description: string
  matched: boolean
}
export interface PosPayment {
  id: string
  transaction_id: string
  bill_number: string
  method_code: string
  amount_minor: number
  paid_at: string
  reference: string
  account_id: string | null
}
export interface BankMatch {
  currency_code: string
  decimal_digits: number
  bank_date: string
  bank_reference: string
  created_by: string
  cancelled_by: string | null
  id: string
  row_id: string
  gross_minor: number
  fee_minor: number
  received_minor: number
  difference_minor: number
  note: string
  created_at: string
  cancelled_at: string | null
  cancel_reason: string
  stale: boolean
  payments: PosPayment[]
}
export interface ReconciliationWorkspace {
  currency_code: string
  decimal_digits: number
  rows: BankRow[]
  rows_total: number
  payments: PosPayment[]
  payments_total: number
  matches: BankMatch[]
  matches_total: number
}
export interface ReconciliationFilter {
  account_id: string
  from: string
  to: string
  row_page: number
  payment_page: number
  match_page: number
  include_matched: boolean
}
export const getReconciliation = (params: ReconciliationFilter) =>
  api.get<ApiResponse<ReconciliationWorkspace>>(endpoint, { params }).then((r) => r.data.data)
export const importBankRows = (account_id: string, name: string, rows: BankImportRow[]) =>
  api
    .post<
      ApiResponse<{ id: string; inserted: number; duplicates: number }>
    >(`${endpoint}/imports`, { account_id, name, rows })
    .then((r) => r.data.data)
export const createBankMatch = (input: { row_id: string; payment_ids: string[]; fee: string; note: string }) =>
  api.post(`${endpoint}/matches`, input)
export const cancelBankMatch = (id: string, reason: string) =>
  api.post(`${endpoint}/matches/${id}/cancel`, { reason })
