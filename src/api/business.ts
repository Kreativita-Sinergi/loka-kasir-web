import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, Business } from '@/types'

export const getBusinesses = (params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<Business>>('/business', { params })

export const getBusinessById = (id: string) =>
  api.get<ApiResponse<Business>>(`/business/${id}`)

export const updateBusinessLogo = (base64Image: string) =>
  api.put<ApiResponse<Business>>('/business/logo', { image: base64Image })

export const removeBusinessLogo = () =>
  api.delete<ApiResponse<Business>>('/business/logo')
