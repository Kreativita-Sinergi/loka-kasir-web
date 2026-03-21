import api from '@/lib/axios'
import type { ApiResponse } from '@/types'
import type {
  AnalyticsInsights,
  PeakHour,
  ProductPerformance,
  OutletComparison,
  RevenueTrend,
} from '@/types'

export const getInsights = () =>
  api.get<ApiResponse<AnalyticsInsights>>('/analytics/insights')

export const getPeakHours = () =>
  api.get<ApiResponse<PeakHour[]>>('/analytics/peak-hours')

export const getProductPerformance = (params?: { limit?: number }) =>
  api.get<ApiResponse<ProductPerformance[]>>('/analytics/product-performance', { params })

export const getOutletComparison = () =>
  api.get<ApiResponse<OutletComparison[]>>('/analytics/outlets')

export const getRevenueTrend = (period: 'weekly' | 'monthly' = 'weekly') =>
  api.get<ApiResponse<RevenueTrend[]>>('/analytics/revenue', { params: { period } })
