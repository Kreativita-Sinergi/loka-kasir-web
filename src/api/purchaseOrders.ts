import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, PurchaseOrder } from '@/types'

export interface POItemPayload {
  raw_material_id: string
  quantity_ordered: number
  unit_cost: number
}

export interface CreatePOPayload {
  supplier_id?: string | null
  po_number: string
  order_date: string // YYYY-MM-DD
  expected_date?: string | null
  notes?: string | null
  items: POItemPayload[]
}

export interface ReceiveItemPayload {
  item_id: string
  quantity_received: number
  unit_cost: number
}

export interface ReceivePOPayload {
  items: ReceiveItemPayload[]
}

export const getPurchaseOrders = (params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<PurchaseOrder>>('/purchase-order', { params })

export const getPurchaseOrderById = (id: string) =>
  api.get<ApiResponse<PurchaseOrder>>(`/purchase-order/${id}`)

export const createPurchaseOrder = (data: CreatePOPayload) =>
  api.post<ApiResponse<PurchaseOrder>>('/purchase-order', data)

export const receivePurchaseOrder = (id: string, data: ReceivePOPayload) =>
  api.post<ApiResponse<PurchaseOrder>>(`/purchase-order/${id}/receive`, data)

export const cancelPurchaseOrder = (id: string) =>
  api.patch<ApiResponse<PurchaseOrder>>(`/purchase-order/${id}/cancel`)

export const deletePurchaseOrder = (id: string) =>
  api.delete<ApiResponse<null>>(`/purchase-order/${id}`)
