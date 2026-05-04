import api from '@/lib/axios'
import type { ApiResponse, ProfitabilityReport } from '@/types'

export const getProfitabilityReport = (period: string) =>
  api.get<ApiResponse<ProfitabilityReport>>('/profitability/report', { params: { period } })
