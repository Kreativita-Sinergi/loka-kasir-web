import api from '@/lib/axios'

export interface AuditLogItem {
  id: string
  business_id: string
  user_id: string | null
  user_name: string
  entity_type: string
  entity_id: string | null
  action: string
  description: string
  metadata: string | null
  ip_address: string | null
  created_at: string
}

interface AuditLogListResponse {
  status: boolean
  message: string
  data: {
    results: AuditLogItem[]
    total: number
    page: number
    limit: number
  }
}

export const getAuditLogs = (params?: Record<string, unknown>) =>
  api.get<AuditLogListResponse>('/audit-log', { params })
