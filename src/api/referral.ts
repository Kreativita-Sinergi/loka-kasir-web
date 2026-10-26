import api from '@/lib/axios'
import type { ApiResponse, PaymentOrder } from '@/types'
export interface ReferralSummary {
  first_purchase: boolean
  enabled: boolean
  code: string
  applied_code: string
  /** Program kode yang diterapkan; server lama tidak mengirimnya. */
  applied_program?: 'customer' | 'sales' | ''
  /** Persen diskon tagihan pertama untuk kode sales (0 = nominal tetap). */
  discount_percent?: number
  can_apply: boolean
  balance: number
  reserved: number
  pending_reward: number
  history: { amount: number; status: 'pending' | 'available' | 'cancelled'; available_at: string }[]
  open_orders: PaymentOrder[]
}
export const getReferral = () => api.get<ApiResponse<ReferralSummary>>('/referral')
export const applyReferral = (code: string) => api.post('/referral/apply', { code })
export const reconcileReferral = () => api.post('/referral/reconcile')
/** Kode pelanggan (LK + 12) atau kode sales (4–12 huruf/angka, bukan LK…). */
export const isReferralCode = (code: string) => /^LK[A-Z0-9]{12}$/.test(code) || (/^[A-Z0-9]{4,12}$/.test(code) && !code.startsWith('LK'))
