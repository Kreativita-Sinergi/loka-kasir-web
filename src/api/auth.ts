import api from '@/lib/axios'
import { publicApi } from '@/lib/axios'
import type { ApiResponse, AuthUser } from '@/types'

export const login = (identifier: string, password: string, captchaToken: string) =>
  api.post<ApiResponse<AuthUser>>('/auth/business', { identifier, password }, {
    headers: { 'X-Captcha-Token': captchaToken },
  })

// Akun baru aktif setelah OTP yang dikirim ke emailnya dimasukkan
// (`IsVerified: false` di `service/registration_service.go`). Sampai saat itu
// login dijawab `AUTH_NOT_VERIFIED`, dan dashboard membuka /verifikasi-email.
// Kode yang benar dijawab server dengan token — itulah login pertamanya.
export const verifyAccountOtp = (identifier: string, token: string) =>
  publicApi.post<ApiResponse<AuthUser>>('/auth/verify-otp', {
    identifier,
    token,
    is_reset_password: false,
  })

export const resendAccountOtp = (identifier: string) =>
  publicApi.post<ApiResponse<null>>('/auth/retry-otp', {
    identifier,
    is_reset_password: false,
    otp_channel: 'email',
  })

// Hanya field yang benar-benar diwajibkan backend (`data/request/registrasi_req.go`).
// Nomor HP dan data lokasi (kota/kecamatan/kelurahan) sengaja tidak diminta saat
// mendaftar — keduanya opsional dan diatur belakangan dari Pengaturan Outlet,
// sama seperti di aplikasi kasir.
export interface RegisterRequest {
  full_name: string
  email: string
  password: string
  business_name: string
  business_type_id: number
  /** Sub-jenis usaha (bengkel, konter HP, laundry) — opsional. */
  business_vertical_id: number | null
  outlet_name: string
  otp_channel: 'email'
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

export const sendEmailVerification = () =>
  api.post<ApiResponse<null>>('/user/send-email-verification')

export const verifyEmailOtp = (email: string, token: string) =>
  api.post<ApiResponse<AuthUser>>('/user/verify-otp', { identifier: email, token })

// Pemulihan password TIDAK lagi dilakukan dari dashboard web — seluruh alurnya
// pindah ke aplikasi, di HP yang sama dengan yang menerima email OTP-nya.
// Endpoint-nya tetap hidup di server dan dipakai aplikasi; pembungkusnya dihapus
// dari sini supaya tidak ada jalan kedua yang diam-diam dihidupkan kembali.
