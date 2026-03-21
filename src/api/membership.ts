import api from '@/lib/axios'
import type { ApiResponse, Membership } from '@/types'

export const getActiveMembership = () =>
  api.get<ApiResponse<Membership>>('/membership')

export const upgradeMembership = (type: 'monthly' | 'yearly') =>
  api.post<ApiResponse<Membership>>('/membership/upgrade', { type })
