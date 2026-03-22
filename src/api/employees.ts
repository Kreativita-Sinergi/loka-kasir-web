import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, Employee } from '@/types'

export const getEmployees = (params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<Employee>>('/employee', { params })

export const getEmployeeById = (id: string) =>
  api.get<ApiResponse<Employee>>(`/employee/${id}`)

export interface CreateEmployeePayload {
  name: string
  role_id: number
  phone_number?: string | null
  pin: string
  shift_schedule_id?: string | null
}

export const createEmployee = (data: CreateEmployeePayload) =>
  api.post<ApiResponse<Employee>>('/employee/', data)

export interface UpdateEmployeePayload {
  name?: string
  role_id?: number
  phone_number?: string | null
  pin?: string | null
  is_active?: boolean
  shift_schedule_id?: string | null
}

export const updateEmployee = (id: string, data: UpdateEmployeePayload) =>
  api.put<ApiResponse<Employee>>(`/employee/${id}`, data)

export const deleteEmployee = (id: string) =>
  api.delete(`/employee/${id}`)
