import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, Terminal } from '@/types'

export const getTerminalsByBusiness = (_businessId: string, params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<Terminal>>('/lib/terminal', { params })

export const createTerminal = (data: {
  business_id: string
  outlet_id?: string | null
  name: string
  location?: string | null
  is_active: boolean
}) => api.post<ApiResponse<Terminal>>('/lib/terminal', data)

export const updateTerminal = (id: string, data: {
  outlet_id?: string | null
  name: string
  location?: string | null
  is_active: boolean
}) => api.put<ApiResponse<Terminal>>(`/lib/terminal/${id}`, data)

export const deleteTerminal = (id: string) =>
  api.delete(`/lib/terminal/${id}`)
