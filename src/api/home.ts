import api from '@/lib/axios'
import type { ApiResponse, HomeData } from '@/types'

export const getHomeData = (params?: { outlet_id?: string }) =>
  api.get<ApiResponse<HomeData>>('/home', { params })
