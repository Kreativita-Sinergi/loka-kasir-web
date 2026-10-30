import api from '@/lib/axios'
import type { ApiResponse, ProfitabilityReport } from '@/types'

/**
 * [range] terisi = rentang kustom (tanggal jam toko, inklusif); server lalu
 * mengabaikan `period` dan memprorata biaya operasional sepanjang rentang itu.
 * Tanpa [range], `period` 7d/30d/90d seperti dulu.
 */
export const getProfitabilityReport = (period: string, range?: { start_date: string; end_date: string }) =>
  api.get<ApiResponse<ProfitabilityReport>>('/profitability/report', { params: range ? { period, ...range } : { period } })
