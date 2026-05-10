import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, LoyaltyConfig, LoyaltyTransaction, CustomerLoyalty } from '@/types'

export interface UpsertLoyaltyConfigPayload {
  points_per_thousand_idr: number
  min_redeem_points: number
  point_value_idr: number
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
