import api from '@/lib/axios'
import { publicApi } from '@/lib/axios'
import type { ApiResponse, AuthUser } from '@/types'

export const login = (identifier: string, password: string) =>
  api.post<ApiResponse<AuthUser>>('/auth/business', { identifier, password })

export const verifyOtp = (identifier: string, token: string) =>
  api.post<ApiResponse<AuthUser>>('/auth/verify-otp', { identifier, token })

export const retryOtp = (identifier: string) =>
  api.post<ApiResponse<null>>('/auth/retry-otp', { identifier })

// Pre-registration WA-bot flow:
//   initRegister()       → GET  code + bot_phone, user sends code to WA
//   verifyRegisterOtp()  → POST code + OTP → returns verified phone_number
export const initRegister = () =>
  publicApi.post<ApiResponse<{ code: string; bot_phone: string }>>('/auth/send-register-otp')

export const verifyRegisterOtp = (code: string, otp: string) =>
  publicApi.post<ApiResponse<{ phone_number: string }>>('/auth/verify-register-otp', { code, otp })

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

export const changeEmail = (email: string, password: string) =>
  api.put<ApiResponse<null>>('/user/change-email', { email, password })

export const changePhone = (phone_number: string, password: string) =>
  api.put<ApiResponse<null>>('/user/change-phone', { phone_number, password })

export const verifyChangePhone = (otp: string) =>
  api.post<ApiResponse<null>>('/user/verify-change-phone', { otp })

export const sendEmailVerification = () =>
  api.post<ApiResponse<null>>('/user/send-email-verification')

export const verifyEmailOtp = (email: string, token: string) =>
  api.post<ApiResponse<AuthUser>>('/user/verify-otp', { identifier: email, token })

export const requestForgotPassword = (identifier: string) =>
  publicApi.post<ApiResponse<null>>('/auth/request-forgot-password', { identifier })

export const verifyForgotPasswordOtp = (identifier: string, token: string) =>
  publicApi.post<ApiResponse<null>>('/auth/verify-otp', { identifier, token, is_reset_password: true })

export const resetPassword = (identifier: string, password: string) =>
  publicApi.post<ApiResponse<null>>('/auth/reset-password', { identifier, password })
