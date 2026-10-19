import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, Table } from '@/types'

export const getTablesByOutlet = (outletId: string, params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<Table>>(`/table/outlet/${outletId}`, { params })

export const createTable = (data: {
  outlet_id: string
  number: string
  kind?: 'DINE' | 'RENTAL'
  rental_product_id?: string | null
  rental_product_ids?: string[]
}) => api.post<ApiResponse<Table>>('/table', data)

export const updateTable = (id: string, data: {
  number: string
  /** Hanya status manual; "occupied" dihitung server dari tagihan terbuka. */
  status?: 'available' | 'reserved'
  kind?: 'DINE' | 'RENTAL'
  rental_product_id?: string | null
  rental_product_ids?: string[]
}) => api.put<ApiResponse<Table>>(`/table/${id}`, data)

/**
 * Tandai dipesan / kosongkan tanda — cukup izin Kelola Meja, tanpa menyentuh
 * nomor, jenis, atau QR meja. Server lama belum punya rute status; jalur
 * lamanya tetap menerima permintaan yang hanya mengganti status.
 */
export const setTableStatus = async (table: { id: string; number: string }, status: 'available' | 'reserved') => {
  try {
    return await api.put<ApiResponse<Table>>(`/table/${table.id}/status`, { status })
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status !== 404) throw err
    return api.put<ApiResponse<Table>>(`/table/${table.id}`, { number: table.number, status })
  }
}

/**
 * Server menghapus lunak dan menyimpan token QR: menambah lagi meja bernomor
 * sama di outlet yang sama menghidupkan QR lamanya.
 */
export const deleteTable = (id: string) =>
  api.delete(`/table/${id}`)

/** Buat ulang QR token meja (mencabut QR lama yang sudah dicetak). */
export const regenerateTableQr = (id: string) =>
  api.post<ApiResponse<Table>>(`/table/${id}/regenerate-qr`)

/** Kosongkan meja: tamu pergi, meja kembali tersedia. Ditolak bila tagihan belum lunas. */
export const clearTable = (id: string) =>
  api.post<ApiResponse<{ cleared: number }>>(`/table/${id}/clear`)

export interface RentalPromo {
  name: string
  start_minute: number
  end_minute: number
  days: number[]
  /** Pilihan sewa pada periode ini; kosong = pilihan bawaan meja. */
  product_ids: string[]
  promo_prices?: Record<string, number>
  enabled: boolean
}
export interface RentalPromoConfig { timezone: string; promos: RentalPromo[] }
export const getRentalPromos = (id: string) => api.get<ApiResponse<RentalPromoConfig>>(`/table/${id}/rental-promos`)
export const saveRentalPromos = (id: string, config: RentalPromoConfig) => api.put<ApiResponse<RentalPromoConfig>>(`/table/${id}/rental-promos`, config)

/** Meja gratis hari ini (sesi pertama) — pemilik/admin. */
export const setTableFreeToday = (id: string, free: boolean) =>
  api.put<ApiResponse<Table>>(`/table/${id}/free-today`, { free })
/** Pilih acak satu meja rental kosong di outlet dan gratiskan hari ini. */
export const randomFreeTableToday = (outletId: string) =>
  api.post<ApiResponse<Table>>(`/table/outlet/${outletId}/random-free-today`)
