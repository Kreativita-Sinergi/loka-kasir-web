import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, Product } from '@/types'

export const getProducts = (params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<Product>>('/product', { params })

export const getProductById = (id: string) =>
  api.get<ApiResponse<Product>>(`/product/${id}`)

export const setProductActive = (id: string, isActive: boolean) =>
  api.put(`/product/${id}/active`, { is_active: isActive })

export const setProductAvailable = (id: string, isAvailable: boolean) =>
  api.put(`/product/${id}/available`, { is_available: isAvailable })

export interface CreateProductPayload {
  name: string
  sku?: string
  description?: string
  base_price?: number
  sell_price?: number
  category_id?: string
  brand_id?: string
  unit_id?: string
  track_stock?: boolean
  stock?: number
}

export const createProduct = (data: CreateProductPayload) =>
  api.post<ApiResponse<Product>>('/product', data)

export const bulkCreateProducts = (items: CreateProductPayload[]) =>
  Promise.allSettled(items.map((item) => createProduct(item)))
