import api from '@/lib/axios'
import type { CursorPaginatedApiResponse, Shift } from '@/types'

export const getShifts = (params?: Record<string, unknown>) =>
  api.get<CursorPaginatedApiResponse<Shift>>('/shift/cursor', { params })
