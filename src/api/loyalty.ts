import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, LoyaltyConfig, LoyaltyTransaction, CustomerLoyalty } from '@/types'

export interface UpsertLoyaltyConfigPayload {
  points_per_thousand_idr: number
  min_redeem_points: number
  point_value_idr: number
  /**
   * Dihilangkan berarti "jangan ubah status nyala/mati".
   *
   * Halaman tarif menyimpan tanpa field ini supaya memperbaiki angka tidak
   * diam-diam menyalakan kembali program yang sengaja dimatikan; hanya
   * saklarnya yang mengirimkannya.
   */
  is_active?: boolean
}

export interface AdjustPointsPayload {
  points: number
  notes?: string | null
}

export const getLoyaltyConfig = () =>
  api.get<ApiResponse<LoyaltyConfig>>('/loyalty/config')

export const upsertLoyaltyConfig = (data: UpsertLoyaltyConfigPayload) =>
  api.put<ApiResponse<LoyaltyConfig>>('/loyalty/config', data)

export const getCustomerLoyalty = (customerId: string) =>
  api.get<ApiResponse<CustomerLoyalty>>(`/loyalty/customer/${customerId}`)

export const addCustomerPoints = (customerId: string, data: AdjustPointsPayload) =>
  api.post<ApiResponse<LoyaltyTransaction>>(`/loyalty/customer/${customerId}/add-points`, data)

export const redeemCustomerPoints = (customerId: string, data: AdjustPointsPayload) =>
  api.post<ApiResponse<LoyaltyTransaction>>(`/loyalty/customer/${customerId}/redeem`, data)

export const getLoyaltyHistory = (customerId: string, params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<LoyaltyTransaction>>(`/loyalty/customer/${customerId}/history`, { params })

// ─── Mekanika hadiah ─────────────────────────────────────────────────────────
//
// Enam mekanika, satu alat tukar: apa pun asalnya — tingkat, hadiah, stempel,
// bonus, saldo — yang sampai ke kasir berbentuk voucher atau potongan langsung.

export interface Tier {
  id: string
  name: string
  min_lifetime_points: number
  discount_percent: number
  color?: string | null
  is_active: boolean
}

export interface Reward {
  id: string
  name: string
  points_cost: number
  type: 'free_product' | 'discount_amount' | 'discount_percent' | 'deposit'
  product_id?: string | null
  value: number
  valid_days: number
  is_active: boolean
}

export interface StampCard {
  id: string
  name: string
  scope: 'product' | 'category' | 'global'
  ref_id?: string | null
  buy_qty: number
  reward_free_qty: number
  valid_days: number
  is_active: boolean
  collected?: number
}

export interface BonusRule {
  id: string
  name: string
  kind: 'day_of_week' | 'hour_range' | 'birthday' | 'first_purchase'
  day_mask: number
  start_hour: number
  end_hour: number
  multiplier: number
  bonus_points: number
  is_active: boolean
}

export interface Voucher {
  id: string
  customer_id?: string | null
  code: string
  name: string
  source: 'reward' | 'stamp' | 'manual'
  type: 'amount' | 'percent' | 'free_product'
  value: number
  status: 'issued' | 'used' | 'expired'
  expires_at?: string | null
  used_at?: string | null
  created_at: string
}

export interface DepositEntry {
  id: string
  type: 'topup' | 'use' | 'refund'
  amount: number
  balance_before: number
  balance_after: number
  notes?: string | null
  created_at: string
}

export interface CustomerLoyaltyDetail {
  customer_id: string
  customer_name: string
  points_balance: number
  lifetime_points: number
  deposit_balance: number
  tier?: Tier | null
  next_tier?: Tier | null
  stamps: StampCard[]
  vouchers: Voucher[]
  config?: LoyaltyConfig | null
}

export const getTiers = () => api.get<ApiResponse<Tier[]>>('/loyalty/tiers')
export const saveTier = (data: Partial<Tier>) => api.put<ApiResponse<Tier>>('/loyalty/tiers', data)
export const deleteTier = (id: string) => api.delete(`/loyalty/tiers/${id}`)

export const getRewards = () => api.get<ApiResponse<Reward[]>>('/loyalty/rewards')
export const saveReward = (data: Partial<Reward>) => api.put<ApiResponse<Reward>>('/loyalty/rewards', data)
export const deleteReward = (id: string) => api.delete(`/loyalty/rewards/${id}`)

export const getStampCards = () => api.get<ApiResponse<StampCard[]>>('/loyalty/stamp-cards')
export const saveStampCard = (data: Partial<StampCard>) => api.put<ApiResponse<StampCard>>('/loyalty/stamp-cards', data)
export const deleteStampCard = (id: string) => api.delete(`/loyalty/stamp-cards/${id}`)

export const getBonusRules = () => api.get<ApiResponse<BonusRule[]>>('/loyalty/bonus-rules')
export const saveBonusRule = (data: Partial<BonusRule>) => api.put<ApiResponse<BonusRule>>('/loyalty/bonus-rules', data)
export const deleteBonusRule = (id: string) => api.delete(`/loyalty/bonus-rules/${id}`)

export const getVouchers = (params?: Record<string, unknown>) =>
  api.get<ApiResponse<Voucher[]>>('/loyalty/vouchers', { params })
export const issueVoucher = (data: {
  customer_id?: string | null
  name: string
  type: Voucher['type']
  value: number
  product_id?: string | null
  valid_days: number
}) => api.post<ApiResponse<Voucher>>('/loyalty/vouchers', data)

export const getCustomerLoyaltyDetail = (customerId: string) =>
  api.get<ApiResponse<CustomerLoyaltyDetail>>(`/loyalty/customer/${customerId}/detail`)

export const redeemReward = (customerId: string, rewardId: string) =>
  api.post<ApiResponse<Voucher>>(`/loyalty/customer/${customerId}/redeem-reward`, { reward_id: rewardId })

export const adjustDeposit = (customerId: string, data: { type: 'topup' | 'refund'; amount: number; notes?: string }) =>
  api.post<ApiResponse<DepositEntry>>(`/loyalty/customer/${customerId}/deposit`, data)

export const getDepositHistory = (customerId: string, params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<DepositEntry>>(`/loyalty/customer/${customerId}/deposit-history`, { params })
