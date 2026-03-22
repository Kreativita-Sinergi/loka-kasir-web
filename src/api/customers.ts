import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, Customer } from '@/types'

export const getCustomersByBusiness = (_businessId: string, params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<Customer>>('/customer', { params })

export const getCustomerById = (id: string) =>
  api.get<ApiResponse<Customer>>(`/customer/${id}`)

export const createCustomer = (data: {
  business_id: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}) => api.post<ApiResponse<Customer>>('/customer', data)

export const updateCustomer = (id: string, data: {
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}) => api.put<ApiResponse<Customer>>(`/customer/${id}`, data)

export const deleteCustomer = (id: string) =>
  api.delete(`/customer/${id}`)
