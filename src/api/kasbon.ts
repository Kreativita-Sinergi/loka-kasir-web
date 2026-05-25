import api from '@/lib/axios'

interface KasbonListResponse {
  status: boolean
  message: string
  data: {
    results: import('@/types').Transaction[]
    total: number
    page: number
    limit: number
  }
}

export const getKasbonList = (params?: Record<string, unknown>) =>
  api.get<KasbonListResponse>('/transaction/kasbon', { params })
