import api from '@/lib/axios'
import type { PaginatedApiResponse, Attendance, AttendanceFilterParams } from '@/types'

export const getAttendances = (params?: AttendanceFilterParams) =>
  api.get<PaginatedApiResponse<Attendance>>('/attendance', { params })
