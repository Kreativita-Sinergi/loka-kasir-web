import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, Outlet, OutletStock, UserOutlet } from '@/types'

export const getMyOutlets = () =>
  api.get<ApiResponse<Outlet[]>>('/outlet/mine')

export const createOutlet = (data: {
  business_id: string
  name: string
  address?: string | null
  phone?: string | null
  is_active: boolean
}) => api.post<ApiResponse<Outlet>>('/outlet', data)

export const updateOutlet = (id: string, data: {
  name: string
  address?: string | null
  phone?: string | null
  is_active: boolean
}) => api.put<ApiResponse<Outlet>>(`/outlet/${id}`, data)

export const deleteOutlet = (id: string) =>
  api.delete(`/outlet/${id}`)

export const getOutletById = (id: string) =>
  api.get<ApiResponse<Outlet>>(`/outlet/${id}`)

export const getOutletsByBusiness = (businessId: string, params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<Outlet>>(`/outlet/business/${businessId}`, { params })

export const upsertOutletStock = (outletId: string, data: { product_id: string; quantity: number }) =>
  api.put<ApiResponse<OutletStock>>(`/outlet/${outletId}/stock`, data)

export const getOutletStocks = (outletId: string) =>
  api.get<ApiResponse<OutletStock[]>>(`/outlet/${outletId}/stock`)

export const assignUserToOutlet = (outletId: string, userId: string) =>
  api.post<ApiResponse<UserOutlet>>(`/outlet/${outletId}/user`, { user_id: userId })

export const unassignUserFromOutlet = (outletId: string, userId: string) =>
  api.delete(`/outlet/${outletId}/user/${userId}`)

export const getOutletUsers = (outletId: string) =>
  api.get<ApiResponse<UserOutlet[]>>(`/outlet/${outletId}/user`)
