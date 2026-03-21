import api from '@/lib/axios'
import type { ApiResponse, AuthUser } from '@/types'

export const login = (identifier: string, password: string) =>
  api.post<ApiResponse<AuthUser>>('/auth/business', { identifier, password })

export const verifyOtp = (identifier: string, token: string) =>
  api.post<ApiResponse<AuthUser>>('/auth/verify-otp', { identifier, token })

export const retryOtp = (identifier: string) =>
  api.post<ApiResponse<null>>('/auth/retry-otp', { identifier })
