import api from '@/lib/axios'
import type { PaginatedApiResponse, ApiResponse, Unit, Brand, Category, Discount, Tax } from '@/types'

// ─── Units ──────────────────────────────────────────────────────────────────
export const getUnits = (params?: object) =>
  api.get<PaginatedApiResponse<Unit>>('/unit', { params })

export const createUnit = (data: { name: string; alias: string }) =>
  api.post<ApiResponse<Unit>>('/unit', data)

export const updateUnit = (id: string, data: { name: string; alias: string }) =>
  api.patch<ApiResponse<Unit>>(`/unit/${id}`, data)

export const deleteUnit = (id: string) =>
  api.delete(`/unit/${id}`)

// ─── Brands ─────────────────────────────────────────────────────────────────
export const getBrands = (params?: object) =>
  api.get<PaginatedApiResponse<Brand>>('/brand', { params })

export const createBrand = (data: { name: string }) =>
  api.post<ApiResponse<Brand>>('/brand', data)

export const updateBrand = (id: string, data: { name: string }) =>
  api.patch<ApiResponse<Brand>>(`/brand/${id}`, data)

export const deleteBrand = (id: string) =>
  api.delete(`/brand/${id}`)

// ─── Categories ─────────────────────────────────────────────────────────────
export const getCategories = (params?: object) =>
  api.get<PaginatedApiResponse<Category>>('/category', { params })

export const createCategory = (data: { name: string; parent_id?: string | null }) =>
  api.post<ApiResponse<Category>>('/category', data)

export const updateCategory = (id: string, data: { name: string; parent_id?: string | null }) =>
  api.patch<ApiResponse<Category>>(`/category/${id}`, data)

export const deleteCategory = (id: string) =>
  api.delete(`/category/${id}`)

// ─── Discounts ───────────────────────────────────────────────────────────────
export const getDiscounts = (params?: object) =>
  api.get<PaginatedApiResponse<Discount>>('/discount', { params })

export const createDiscount = (data: {
  name: string
  description?: string
  amount: number
  is_percentage: boolean
  is_global: boolean
  is_multiple: boolean
  is_active: boolean
  start_at?: string | null
  end_at?: string | null
}) => api.post<ApiResponse<Discount>>('/discount', data)

export const updateDiscount = (id: string, data: {
  name: string
  description?: string
  amount: number
  is_percentage: boolean
  is_global: boolean
  is_multiple: boolean
  is_active: boolean
  start_at?: string | null
  end_at?: string | null
}) => api.patch<ApiResponse<Discount>>(`/discount/${id}`, data)

export const deleteDiscount = (id: string) =>
  api.delete(`/discount/${id}`)

// ─── Taxes ───────────────────────────────────────────────────────────────────
export const getTaxes = (params?: object) =>
  api.get<PaginatedApiResponse<Tax>>('/tax', { params })

export const createTax = (data: {
  name: string
  amount: number
  is_percentage: boolean
  is_global: boolean
  is_active: boolean
}) => api.post<ApiResponse<Tax>>('/tax', data)

export const updateTax = (id: string, data: {
  name: string
  amount: number
  is_percentage: boolean
  is_global: boolean
  is_active: boolean
}) => api.patch<ApiResponse<Tax>>(`/tax/${id}`, data)

export const deleteTax = (id: string) =>
  api.delete(`/tax/${id}`)
