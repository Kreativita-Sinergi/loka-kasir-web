import api from '@/lib/axios'
import type { ApiResponse, HomeData } from '@/types'

export const getHomeData = () =>
  api.get<ApiResponse<HomeData>>('/home')
