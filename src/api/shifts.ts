import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, Shift, ShiftSchedule } from '@/types'

interface ShiftListResponse {
  status: boolean
  message: string
  data: {
    limit: number
    page: number
    results: Shift[]
    total: number
    totalPages: number
  }
  pagination: {
    page: number
    limit: number
    total: number
    order_by: string
    sort_order: string
  }
}

export const getShifts = (params?: Record<string, unknown>) =>
  api.get<ShiftListResponse>('/shift', { params })

// ─── ShiftSchedule ───────────────────────────────────────────────────────────

export const getShiftSchedules = (params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<ShiftSchedule>>('/shift-schedule', { params })

export interface ShiftSchedulePayload {
  name: string
  start_hour: number
  start_minute: number
  end_hour: number
  end_minute: number
  is_next_day: boolean
}

export const createShiftSchedule = (data: ShiftSchedulePayload) =>
  api.post<ApiResponse<ShiftSchedule>>('/shift-schedule', data)

export const updateShiftSchedule = (id: string, data: Partial<ShiftSchedulePayload> & { is_active?: boolean }) =>
  api.put<ApiResponse<ShiftSchedule>>(`/shift-schedule/${id}`, data)

export const deleteShiftSchedule = (id: string) =>
  api.delete(`/shift-schedule/${id}`)
