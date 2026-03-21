import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, Business } from '@/types'

export const getBusinesses = (params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<Business>>('/business', { params })

export const getBusinessById = (id: string) =>
  api.get<ApiResponse<Business>>(`/business/${id}`)
