import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, RawMaterial, RawMaterialMovement } from '@/types'

export interface CreateRawMaterialPayload {
  name: string
  sku?: string | null
  unit_id?: string | null
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

export const getRawMaterialById = (id: string) =>
  api.get<ApiResponse<RawMaterial>>(`/raw-material/${id}`)

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

export const getRawMaterialMovements = (id: string, params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<RawMaterialMovement>>(`/raw-material/${id}/movements`, { params })
