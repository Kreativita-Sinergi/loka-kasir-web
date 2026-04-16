import api from '@/lib/axios'
import type { PaginatedApiResponse, ApiResponse, Unit, Brand, Category, Discount, Tax } from '@/types'

// ─── Units ──────────────────────────────────────────────────────────────────
export const getUnits = (params?: object) =>
  api.get<PaginatedApiResponse<Unit>>('/lib/unit', { params })

export const createUnit = (data: { name: string; alias: string }) =>
  api.post<ApiResponse<Unit>>('/lib/unit', data)

export const updateUnit = (id: string, data: { name: string; alias: string }) =>
  api.put<ApiResponse<Unit>>(`/lib/unit/${id}`, data)

export const deleteUnit = (id: string) =>
  api.delete(`/lib/unit/${id}`)

// ─── Brands ─────────────────────────────────────────────────────────────────
export const getBrands = (params?: object) =>
  api.get<PaginatedApiResponse<Brand>>('/lib/brand', { params })

export const createBrand = (data: { name: string }) =>
  api.post<ApiResponse<Brand>>('/lib/brand', data)

export const updateBrand = (id: string, data: { name: string }) =>
  api.put<ApiResponse<Brand>>(`/lib/brand/${id}`, data)

export const deleteBrand = (id: string) =>
  api.delete(`/lib/brand/${id}`)

// ─── Categories ─────────────────────────────────────────────────────────────
export const getCategories = (params?: object) =>
  api.get<PaginatedApiResponse<Category>>('/lib/category', { params })

export const createCategory = (data: { name: string; parent_id?: string | null; is_cookable?: boolean }) =>
  api.post<ApiResponse<Category>>('/lib/category', data)

export const updateCategory = (id: string, data: { name: string; parent_id?: string | null; is_cookable?: boolean }) =>
  api.put<ApiResponse<Category>>(`/lib/category/${id}`, data)

export const deleteCategory = (id: string) =>
  api.delete(`/lib/category/${id}`)

// ─── Discounts ───────────────────────────────────────────────────────────────
export const getDiscounts = (params?: object) =>
  api.get<PaginatedApiResponse<Discount>>('/lib/discount', { params })

export const createDiscount = (data: {
  name: string
  description?: string
  amount: number
  is_percentage: boolean
  scope?: string | null
  ref_id?: string | null
  is_global: boolean
  is_multiple: boolean
  is_active: boolean
  start_at?: string | null
  end_at?: string | null
}) => api.post<ApiResponse<Discount>>('/lib/discount', data)

export const updateDiscount = (id: string, data: {
  name: string
  description?: string
  amount: number
  is_percentage: boolean
  scope?: string | null
  ref_id?: string | null
  is_global: boolean
  is_multiple: boolean
  is_active: boolean
  start_at?: string | null
  end_at?: string | null
}) => api.put<ApiResponse<Discount>>(`/lib/discount/${id}`, data)

export const deleteDiscount = (id: string) =>
  api.delete(`/lib/discount/${id}`)

// ─── Taxes ───────────────────────────────────────────────────────────────────
export const getTaxes = (params?: object) =>
  api.get<PaginatedApiResponse<Tax>>('/lib/tax', { params })

export const createTax = (data: {
  name: string
  amount: number
  is_percentage: boolean
  is_global: boolean
  is_active: boolean
}) => api.post<ApiResponse<Tax>>('/lib/tax', data)

export const updateTax = (id: string, data: {
  name: string
  amount: number
  is_percentage: boolean
  is_global: boolean
  is_active: boolean
}) => api.put<ApiResponse<Tax>>(`/lib/tax/${id}`, data)

export const deleteTax = (id: string) =>
  api.delete(`/lib/tax/${id}`)
