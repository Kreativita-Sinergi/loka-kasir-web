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
  initial_stock?: number
  outlet_id?: string
  image?: string
  is_active?: boolean
  is_available?: boolean
}

export const createProduct = (data: CreateProductPayload) =>
  api.post<ApiResponse<Product>>('/product', data)

export const bulkCreateProducts = (items: CreateProductPayload[]) =>
  Promise.allSettled(items.map((item) => createProduct(item)))

export interface UpdateProductPayload {
  name: string
  sku?: string | null
  description?: string | null
  base_price?: number | null
  sell_price?: number | null
  category_id?: string | null
  brand_id?: string | null
  unit_id?: string | null
  tax_id?: string | null
  track_stock?: boolean
  stock?: number | null
  is_active?: boolean
  is_available?: boolean
  image?: string | null
}

export const updateProduct = (id: string, data: UpdateProductPayload) =>
  api.put<ApiResponse<Product>>(`/product/${id}`, data)

export const deleteProduct = (id: string) =>
  api.delete(`/product/${id}`)

// ── Product Attribute (Modifier) ───────────────────────────────────────────

export interface ProductAttributePayload {
  name: string
  price: number
  image?: string | null
  is_available?: boolean
  is_active?: boolean
}

export const createProductAttribute = (productId: string, data: ProductAttributePayload) =>
  api.post(`/product/${productId}/attribute`, data)

export const updateProductAttribute = (attributeId: string, data: ProductAttributePayload) =>
  api.put(`/product/attribute/${attributeId}`, data)

export const deleteProductAttribute = (attributeId: string) =>
  api.delete(`/product/attribute/${attributeId}`)
