import api from '@/lib/axios'
import type { ApiResponse, PaymentOrder } from '@/types'
export interface ReferralSummary {
  first_purchase: boolean
  enabled: boolean
  code: string
  applied_code: string
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
