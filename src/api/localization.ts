import api from '@/lib/axios'
import type { ApiResponse } from '@/types'

/** Satu negara yang boleh dipilih saat registrasi. */
export interface Country {
  code: string
  currency: string
  locale: string
  timezone: string
  decimal_digits: number
  cash_rounding: number
}

/**
 * Harga satu plan untuk sebuah negara.
 *
 * Dua nominal, dan perbedaannya penting:
 *
 * - `charge_amount` — yang BENAR-BENAR ditagih, selalu IDR. Duitku hanya
 *   memproses rupiah; kartu Visa terbitan luar negeri tetap dibukukan dalam IDR
 *   dan bank penerbitnya yang mengonversi.
 * - `display_amount` — yang DILIHAT pemilik toko, dalam satuan TERKECIL mata
 *   uangnya (1480 untuk ¥1.480, 2500 untuk RM25,00). Pakai `minorToMajor` dari
 *   `lib/money` sebelum menampilkannya.
 *
 * `is_local_price` false berarti negara itu belum punya harga sendiri dan yang
 * tampil sebenarnya rupiah — dipakai untuk memutuskan apakah perlu menjelaskan
 * mata uang penagihan.
 */
export interface SubscriptionPrice {
  plan: string
  charge_amount: number
  display_currency: string
  display_amount: number
  decimal_digits: number
  is_local_price: boolean
}

export const getCountries = () => api.get<ApiResponse<Country[]>>('/countries')

/**
 * Harga langganan untuk sebuah negara.
 *
 * Sumber tunggal untuk dasbor, aplikasi kasir, dan halaman pemasaran. Sebelum
 * endpoint ini ada, ketiganya menanam angkanya sendiri — dan halaman harga sempat
 * berbeda dari yang benar-benar ditagih.
 */
export const getSubscriptionPrices = (countryCode?: string) =>
  api.get<ApiResponse<SubscriptionPrice[]>>('/subscription-prices', {
    params: countryCode ? { country: countryCode } : undefined,
  })
