import api from '@/lib/axios'
import { publicApi } from '@/lib/axios'
import type { ApiResponse, AuthUser } from '@/types'

export const login = (identifier: string, password: string, captchaToken: string) =>
  api.post<ApiResponse<AuthUser>>('/auth/business', { identifier, password }, {
    headers: { 'X-Captcha-Token': captchaToken },
  })

export const verifyOtp = (identifier: string, token: string) =>
  api.post<ApiResponse<AuthUser>>('/auth/verify-otp', { identifier, token })

export const retryOtp = (identifier: string) =>
  api.post<ApiResponse<null>>('/auth/retry-otp', { identifier })

export interface RegisterRequest {
  full_name: string
  email: string
  phone_number: string | null
  password: string
  business_name: string
  business_type_id: number
  city_id: number | null
  district_id: number | null
  village_id: number | null
  outlet_name: string
}

export const registerBusiness = (data: RegisterRequest, captchaToken: string) =>
  publicApi.post<ApiResponse<null>>('/auth/registration', data, {
    headers: { 'X-Captcha-Token': captchaToken },
  })

export const changePassword = (data: { old_password: string; new_password: string }) =>
  api.put<ApiResponse<null>>('/user/change-password', data)

export const requestChangePasswordOTP = (channel: 'whatsapp' | 'email') =>
  api.post<ApiResponse<null>>('/user/request-change-password-otp', { channel })

export const changePasswordWithOTP = (data: { otp: string; new_password: string }) =>
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

// Pemulihan password TIDAK lagi dilakukan dari dashboard web — seluruh alurnya
// pindah ke aplikasi, di HP yang sama dengan yang menerima email OTP-nya.
// Endpoint-nya tetap hidup di server dan dipakai aplikasi; pembungkusnya dihapus
// dari sini supaya tidak ada jalan kedua yang diam-diam dihidupkan kembali.
