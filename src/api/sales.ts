import axios from 'axios'
import type { ApiResponse } from '@/types'

/**
 * Portal sales (/mitra) — program referral sales.
 *
 * Instans axios sendiri dengan token sendiri: sesi sales bukan sesi kasir, dan
 * 401 di sini harus kembali ke /mitra/login, bukan menghapus sesi pemilik toko
 * yang mungkin terbuka di tab lain.
 */
const SALES_TOKEN_KEY = 'sales-token'

export const salesToken = {
  get: () => { try { return localStorage.getItem(SALES_TOKEN_KEY) } catch { return null } },
  set: (token: string) => { try { localStorage.setItem(SALES_TOKEN_KEY, token) } catch { /* mode privat */ } },
  clear: () => { try { localStorage.removeItem(SALES_TOKEN_KEY) } catch { /* mode privat */ } },
}

const salesApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 15000,
})

salesApi.interceptors.request.use((config) => {
  const token = salesToken.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

salesApi.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 401 && !error.config?.url?.endsWith('/sales/login')) {
    salesToken.clear()
    if (!window.location.pathname.startsWith('/mitra/login')) window.location.href = '/mitra/login'
  }
  return Promise.reject(error)
})

export type SalesStatus = 'pending' | 'active' | 'suspended' | 'terminated'

export interface SalesProfile {
  id: string
  code: string
  name: string
  email: string
  phone: string
  status: SalesStatus
  kyc_complete: boolean
  bank_name: string
  bank_account_masked: string
  bank_account_name: string
  terms_version: string
  terms_accepted_at: string | null
  current_terms_version: string
}

export interface SalesSummary {
  this_month: number
  held: number
  available: number
  processing: number
  total_paid: number
  projection_30d: number
  customers: number
  active_customers: number
  payout_minimum: number
  hold_days: number
  discount_percent: number
  first_year_rate_percent: number
  later_rate_percent: number
}

export type SalesCustomerStatus = 'unpaid' | 'active' | 'due_soon' | 'overdue' | 'stopped'

export interface SalesCustomer {
  business_id: string
  name: string
  city: string
  owner_phone_masked: string
  plan: string
  status: SalesCustomerStatus
  end_date: string | null
  joined_at: string
  commission_start_at: string | null
  rate_change_at: string | null
  current_rate_percent: number
  total_commission: number
}

export type SalesCommissionStatus = 'held' | 'available' | 'processing' | 'paid' | 'cancelled'

export interface SalesCommission {
  id: string
  order_id: string
  business_name: string
  plan: string
  kind: 'commission' | 'reversal' | 'adjustment'
  paid_amount: number
  gateway_fee: number
  fee_estimated: boolean
  payment_code: string
  net_amount: number
  rate_percent: number
  amount: number
  status: SalesCommissionStatus
  available_at: string
  reason: string
  created_at: string
}

export interface SalesPayout {
  id: string
  amount: number
  status: 'draft' | 'paid' | 'cancelled'
  bank_name: string
  bank_account_no: string
  bank_account_name: string
  transfer_ref: string
  proof_url: string
  paid_at: string | null
  created_at: string
}

export const loginSales = (email: string, password: string) =>
  salesApi.post<ApiResponse<{ token: string; expires_at: string }>>('/sales/login', { email, password })
export const getSalesProfile = () => salesApi.get<ApiResponse<SalesProfile>>('/sales/me')
export const acceptSalesTerms = () => salesApi.post('/sales/terms')
export const changeSalesPassword = (current_password: string, new_password: string) =>
  salesApi.post<ApiResponse<{ token: string; expires_at: string }>>('/sales/password', { current_password, new_password })
export const getSalesSummary = () => salesApi.get<ApiResponse<SalesSummary>>('/sales/summary')
export const getSalesCustomers = () => salesApi.get<ApiResponse<SalesCustomer[]>>('/sales/customers')
/** Kursor halaman berikutnya: baris terakhir halaman sebelumnya. */
export const getSalesCommissions = (after?: Pick<SalesCommission, 'created_at' | 'id'>) =>
  salesApi.get<ApiResponse<SalesCommission[]>>('/sales/commissions', { params: { limit: 50, ...(after ? { before: after.created_at, before_id: after.id } : {}) } })
export const getSalesPayouts = () => salesApi.get<ApiResponse<SalesPayout[]>>('/sales/payouts')

export const PLAN_LABEL: Record<string, string> = { pro: 'Pro Bulanan', 'pro-yearly': 'Pro Tahunan', 'pro-3year': 'Pro 3 Tahun' }
