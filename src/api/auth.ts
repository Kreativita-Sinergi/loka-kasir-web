import api from '@/lib/axios'
import type { ApiResponse, AuthUser } from '@/types'

export const login = (identifier: string, password: string) =>
  api.post<ApiResponse<AuthUser>>('/auth/business', { identifier, password })

export const verifyOtp = (identifier: string, token: string) =>
  api.post<ApiResponse<AuthUser>>('/auth/verify-otp', { identifier, token })

export const retryOtp = (identifier: string) =>
  api.post<ApiResponse<null>>('/auth/retry-otp', { identifier })

export interface RegisterRequest {
  // Step 1 — akun
  full_name: string
  email: string
  phone_number: string
  password: string
  // Step 2 — bisnis
  business_name: string
  business_type_id: number
  city_id: number | null
  district_id: number | null
  village_id: number | null
  outlet_name: string
}

export const registerBusiness = (data: RegisterRequest) =>
  api.post<ApiResponse<null>>('/auth/registration', data)

export const changePassword = (data: { old_password: string; new_password: string }) =>
  api.put<ApiResponse<null>>('/user/change-password', data)
