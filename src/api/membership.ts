import api from '@/lib/axios'
import type { ApiResponse, Membership } from '@/types'

export const getActiveMembership = () =>
  api.get<ApiResponse<Membership>>('/membership')

export const upgradeMembership = (type: 'lite' | 'pro') =>
  api.post<ApiResponse<Membership>>('/membership/upgrade', { type })

export const sendReceiptViaWA = (transactionId: string, phone: string) =>
  api.post<ApiResponse<null>>(`/transaction/send-receipt-wa/${transactionId}`, { phone })
