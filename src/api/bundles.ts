import api from '@/lib/axios'
import type { ApiResponse, Bundle, CursorPaginatedApiResponse } from '@/types'

/**
 * Semua paket usaha ini, terbaru dulu. Satu halaman 100 sudah jauh di atas
 * jumlah paket warung mana pun — tanpa paginasi di layar.
 */
export const getBundles = () =>
  api.get<CursorPaginatedApiResponse<Bundle>>('/bundle/cursor', {
    params: { limit: 100, sort_by: 'created_at', order_by: 'desc' },
  })

export interface BundlePayload {
  name: string
  description?: string
  /** Wajib > 0. base_price sengaja tidak dikirim: server menghitung modal
   *  paket dari modal isinya × jumlah. */
  sell_price: number
  /** variant_id wajib untuk produk bervarian, dihilangkan untuk yang lain. */
  items: { product_id: string; variant_id?: string; quantity: number }[]
  /** base64 = foto baru, URL = foto lama dibiarkan, "" = foto dihapus,
   *  dihilangkan = tidak diubah. */
  image?: string
}

export const createBundle = (data: BundlePayload) =>
  api.post<ApiResponse<Bundle>>('/bundle', data)

export const updateBundle = (id: string, data: BundlePayload) =>
  api.put<ApiResponse<Bundle>>(`/bundle/${id}`, data)

export const deleteBundle = (id: string) =>
  api.delete<ApiResponse<unknown>>(`/bundle/${id}`)

/** Sembunyikan/tampilkan paket di kasir tanpa menghapusnya. */
export const setBundleActive = (id: string, isActive: boolean) =>
  api.put<ApiResponse<unknown>>(`/bundle/${id}/active`, { is_active: isActive })
