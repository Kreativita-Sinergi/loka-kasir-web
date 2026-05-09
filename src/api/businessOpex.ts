import api from '@/lib/axios'
import type { ApiResponse, BusinessOpex } from '@/types'

export interface UpsertOpexPayload {
  monthly_fixed_costs: number
  target_sales_volume: number
  default_margin: number
}

export const getBusinessOpex = () =>
  api.get<ApiResponse<BusinessOpex>>('/finance/opex')

export const upsertBusinessOpex = (data: UpsertOpexPayload) =>
  api.put<ApiResponse<BusinessOpex>>('/finance/opex', data)
