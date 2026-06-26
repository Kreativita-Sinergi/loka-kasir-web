import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, RawMaterial } from '@/types'

export interface CreateRawMaterialPayload {
  name: string
  sku?: string | null
  unit_id?: string | null
  min_stock?: number | null
}

export interface StockInPayload {
  quantity: number
  unit_cost: number
  notes?: string | null
}

export interface AdjustStockPayload {
  new_quantity: number
  notes?: string | null
}

export const getRawMaterials = (params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<RawMaterial>>('/raw-material', { params })

export const getLowStockRawMaterials = () =>
  api.get<ApiResponse<RawMaterial[]>>('/raw-material/low-stock')

export interface RawMaterialStats {
  total: number
  out_of_stock: number
  low_stock: number
}

// Ringkasan dihitung di DB (COUNT) — tidak lagi memuat semua baris ke klien.
export const getRawMaterialStats = () =>
  api.get<ApiResponse<RawMaterialStats>>('/raw-material/stats')

export const createRawMaterial = (data: CreateRawMaterialPayload) =>
  api.post<ApiResponse<RawMaterial>>('/raw-material', data)

export const updateRawMaterial = (id: string, data: CreateRawMaterialPayload) =>
  api.put<ApiResponse<RawMaterial>>(`/raw-material/${id}`, data)

export const deleteRawMaterial = (id: string) =>
  api.delete<ApiResponse<null>>(`/raw-material/${id}`)

export const stockInRawMaterial = (id: string, data: StockInPayload) =>
  api.post<ApiResponse<RawMaterial>>(`/raw-material/${id}/stock-in`, data)

export const adjustRawMaterialStock = (id: string, data: AdjustStockPayload) =>
  api.put<ApiResponse<RawMaterial>>(`/raw-material/${id}/adjust`, data)

export interface WastePayload {
  quantity: number
  notes?: string | null
}

export const recordRawMaterialWaste = (id: string, data: WastePayload) =>
  api.post<ApiResponse<RawMaterial>>(`/raw-material/${id}/waste`, data)

export const importRawMaterialsCSV = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<ApiResponse<ImportResult>>('/raw-material/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const downloadRawMaterialTemplate = () =>
  api.get('/raw-material/import/template', { responseType: 'blob' })

export interface ImportResult {
  total: number
  success: number
  failed: number
  errors: { row: number; product: string; message: string }[]
}
