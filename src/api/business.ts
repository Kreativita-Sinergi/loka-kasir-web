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

export const updateBusinessInfo = (data: { business_name: string; owner_name: string }) =>
  api.patch<ApiResponse<Business>>('/business/info', data)

export const getUserProfile = () =>
  api.get<ApiResponse<{ id: string; name: string | null; email: string | null; phone_number: string; is_verified: boolean; is_email_verified: boolean; role: { id: number; name: string; code?: string }; business: Business }>>('/user/profile')
