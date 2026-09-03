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

/**
 * Menutup shift kasir lain dari dasbor.
 *
 * Tidak mengirim closing_cash: yang menutup dari sini tidak sedang berdiri di
 * depan laci uang, dan server memakai kas seharusnya supaya selisihnya nol —
 * pengakuan bahwa kasnya tidak dihitung, bukan klaim bahwa kasnya cocok.
 */
export const forceCloseShift = (id: string, reason: string) =>
  api.put<ApiResponse<null>>(`/shift/${id}/force-close`, { reason })

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

// ─── Laporan selisih kas per kasir ───────────────────────────────────────────

export interface CashierDiscrepancyRow {
  cashier_id: string
  cashier_name: string
  outlet_name: string
  total_shifts: number
  balanced_count: number
  short_count: number
  over_count: number
  /** Selalu positif — besarnya uang yang kurang, bukan angka negatif. */
  total_short: number
  total_over: number
  net_discrepancy: number
  total_sales: number
  short_rate: number
  worst_short: number
  last_shift_at: string | null
  first_shift_at: string | null
}

export interface CashDiscrepancyReport {
  from: string
  to: string
  rows: CashierDiscrepancyRow[]
  summary: {
    total_shifts: number
    short_count: number
    over_count: number
    total_short: number
    total_over: number
    average_short_rate: number
  }
}

/**
 * Rekap selisih kas per kasir.
 *
 * `from`/`to` berformat YYYY-MM-DD dan boleh dikosongkan — server memakai 30
 * hari terakhir. Server juga MENGABAIKAN tanggal yang tidak terbaca alih-alih
 * menolak permintaan, jadi halaman ini tidak perlu memvalidasi ulang isian
 * tanggalnya sebelum mengirim.
 */
export const getCashDiscrepancyReport = (params?: { from?: string; to?: string; outlet_id?: string }) =>
  api.get<ApiResponse<CashDiscrepancyReport>>('/shift/cash-discrepancy', { params })
