import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, Table } from '@/types'

export const getTablesByOutlet = (outletId: string, params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<Table>>(`/table/outlet/${outletId}`, { params })

export const createTable = (data: {
  outlet_id: string
  number: string
}) => api.post<ApiResponse<Table>>('/table', data)

export const updateTable = (id: string, data: {
  number: string
}) => api.put<ApiResponse<Table>>(`/table/${id}`, data)

export const deleteTable = (id: string) =>
  api.delete(`/table/${id}`)
