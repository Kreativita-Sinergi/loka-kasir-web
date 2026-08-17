import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, Business } from '@/types'

export const getBusinesses = (params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<Business>>('/business', { params })

export const updateBusinessInfo = (data: { business_name: string; owner_name: string }) =>
  api.patch<ApiResponse<Business>>('/business/info', data)

export const getUserProfile = () =>
  api.get<ApiResponse<{ id: string; name: string | null; email: string | null; phone_number: string; is_verified: boolean; is_email_verified: boolean; role: { id: number; name: string; code?: string }; business: Business }>>('/user/profile')

/**
 * Mengganti mata uang yang DIBUKUKAN bisnis.
 *
 * Endpoint ini hanya menukar kodenya — nominal yang sudah tersimpan TIDAK
 * dikonversi. Produk seharga 15000 tetap 15000; yang berubah hanya cara angka
 * itu dibaca dan ditulis. Karena itu pemanggilnya wajib memastikan pemilik
 * memahami akibatnya lebih dulu, dan server membatasinya untuk peran Owner.
 */
export const updateBusinessCurrency = (currencyCode: string) =>
  api.patch<ApiResponse<Business>>('/business/currency', { currency_code: currencyCode })

/**
 * Mengganti bahasa BISNIS — bukan bahasa tampilan.
 *
 * Bahasa tampilan tersimpan di peramban masing-masing dan tidak pernah sampai
 * ke server. Yang ini menentukan bahasa hal-hal yang dirakit DI server dan
 * dibaca orang lain: pemberitahuan, email, dan ringkasan harian. Tanpa ini,
 * pemilik yang menyetel dasbornya ke bahasa Jepang tetap menerima pemberitahuan
 * berbahasa Indonesia selamanya, karena kolomnya masih berisi nilai yang diisi
 * saat mendaftar.
 *
 * Dibatasi peran Owner di server: satu kolom untuk seluruh bisnis, jadi kasir
 * yang mengganti bahasa layarnya sendiri tidak boleh ikut mengubahnya.
 */
export const updateBusinessLocale = (locale: string) =>
  api.patch<ApiResponse<Business>>('/business/locale', { locale })
