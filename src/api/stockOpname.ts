import api from '@/lib/axios'
import type { ApiResponse, StockOpname, StockOpnameItem } from '@/types'

interface ListResponse<T> {
  status: boolean
  message: string
  data: T[]
  pagination: { page: number; limit: number; total: number }
}

export const getStockOpnamesByBusiness = (businessId: string, params?: Record<string, unknown>) =>
  api.get<ListResponse<StockOpname>>(`/stock-opname/business/${businessId}`, { params })

export const getStockOpname = (id: string) =>
  api.get<ApiResponse<StockOpname>>(`/stock-opname/${id}`)

export const getStockOpnameItems = (id: string, params?: Record<string, unknown>) =>
  api.get<ListResponse<StockOpnameItem>>(`/stock-opname/${id}/items`, { params })

/**
 * Hanya baris yang selisihnya bukan nol.
 *
 * Ini yang dibuka pemilik sebelum menyetujui posting: dari sepuluh ribu baris
 * yang dihitung, yang perlu ia putuskan biasanya belasan.
 */
export const getStockOpnameVariance = (id: string, params?: Record<string, unknown>) =>
  api.get<ListResponse<StockOpnameItem>>(`/stock-opname/${id}/variance`, { params })

export const createStockOpname = (data: {
  business_id: string
  outlet_id: string
  scope_type: 'ALL' | 'CATEGORY'
  scope_ref_id?: string | null
  notes?: string | null
}) => api.post<ApiResponse<StockOpname>>('/stock-opname', data)

export const recordStockOpnameCounts = (
  id: string,
  entries: { item_id: string; counted_quantity: number; note?: string | null }[],
) => api.put<ApiResponse<StockOpname>>(`/stock-opname/${id}/count`, { entries })

/** Menerapkan seluruh selisih sesi. Tidak bisa dibatalkan setelah berhasil. */
export const postStockOpname = (id: string) =>
  api.post<ApiResponse<StockOpname>>(`/stock-opname/${id}/post`)

export const cancelStockOpname = (id: string) =>
  api.put<ApiResponse<StockOpname>>(`/stock-opname/${id}/cancel`)
