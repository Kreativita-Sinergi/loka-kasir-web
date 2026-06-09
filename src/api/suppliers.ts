import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, Supplier } from '@/types'

export interface SupplierPayload {
  name: string
  code?: string | null
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}

export const getSuppliers = (params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<Supplier>>('/supplier', { params })

export const createSupplier = (data: SupplierPayload) =>
  api.post<ApiResponse<Supplier>>('/supplier', data)

export const updateSupplier = (id: string, data: SupplierPayload) =>
  api.put<ApiResponse<Supplier>>(`/supplier/${id}`, data)

export const deleteSupplier = (id: string) =>
  api.delete<ApiResponse<null>>(`/supplier/${id}`)
