import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, Employee } from '@/types'

export const getEmployees = (params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<Employee>>('/employee', { params })

export const getEmployeeById = (id: string) =>
  api.get<ApiResponse<Employee>>(`/employee/${id}`)

export const deleteEmployee = (id: string) =>
  api.delete(`/employee/${id}`)
