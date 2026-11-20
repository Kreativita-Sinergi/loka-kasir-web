import api from '@/lib/axios'
import type { ApiResponse } from '@/types'

export interface AccountingConnection {
  accounting_name: string
  pos_business_name: string
  sync_from: string
  paused_at: string | null
  last_synced_at: string | null
  waiting: number
  failed: number
}

const path = '/business/accounting-connection'

export async function getAccountingConnection() {
  const response = await api.get<ApiResponse<AccountingConnection | null>>(path)
  return response.data.data ?? null
}

export async function connectAccounting(code: string, startDate: string) {
  await api.post(path, { code, start_date: startDate })
}

export async function pauseAccounting() {
  await api.post(path + '/pause')
}

export async function retryAccountingDelivery() {
  await api.post(path + '/retry')
}
