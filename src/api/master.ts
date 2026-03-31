import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, BusinessType, PaymentMethod, Role, OrderType } from '@/types'

// Business Types
export const getBusinessTypes = () =>
  api.get<ApiResponse<BusinessType[]>>('/business-type')

export const createBusinessType = (data: { code: string; name: string; description: string; order_archetype: string }) =>
  api.post<ApiResponse<BusinessType>>('/business-type', data)

export const updateBusinessType = (id: number, data: Partial<{ code: string; name: string; description: string; order_archetype: string }>) =>
  api.patch<ApiResponse<BusinessType>>(`/business-type/${id}`, data)

export const deleteBusinessType = (id: number) =>
  api.delete(`/business-type/${id}`)

// Payment Methods
export const getPaymentMethods = (params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<PaymentMethod>>('/payment-method', { params })

export const createPaymentMethod = (data: { code: string; name: string }) =>
  api.post<ApiResponse<PaymentMethod>>('/payment-method', data)

export const updatePaymentMethod = (id: number, data: Partial<{ code: string; name: string }>) =>
  api.patch<ApiResponse<PaymentMethod>>(`/payment-method/${id}`, data)

export const deletePaymentMethod = (id: number) =>
  api.delete(`/payment-method/${id}`)

// Roles
export const getRoles = () =>
  api.get<ApiResponse<Role[]>>('/role')

export const createRole = (data: { name: string }) =>
  api.post<ApiResponse<Role>>('/role', data)

export const updateRole = (id: number, data: { name: string }) =>
  api.patch<ApiResponse<Role>>(`/role/${id}`, data)

export const deleteRole = (id: number) =>
  api.delete(`/role/${id}`)

// Permissions
export interface Permission {
  id: number
  code: string
  name: string
  description: string
  module: string
}

export const getAllPermissions = () =>
  api.get<ApiResponse<Permission[]>>('/role/permissions/all')

export const getRolePermissions = (roleId: number) =>
  api.get<ApiResponse<number[]>>(`/role/${roleId}/permissions`)

export const updateRolePermissions = (roleId: number, permissionIds: number[]) =>
  api.put(`/role/${roleId}/permissions`, { permission_ids: permissionIds })

// Order Types
export const getOrderTypes = (params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<OrderType>>('/order-type', { params })

export const createOrderType = (data: { code: string; name: string }) =>
  api.post<ApiResponse<OrderType>>('/order-type', data)

export const updateOrderType = (id: number, data: Partial<{ code: string; name: string }>) =>
  api.put<ApiResponse<OrderType>>(`/order-type/${id}`, data)

export const deleteOrderType = (id: number) =>
  api.delete(`/order-type/${id}`)
