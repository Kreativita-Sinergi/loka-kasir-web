import api from '@/lib/axios'
import type { ApiResponse, PaymentOrder, PaymentOrderType } from '@/types'

export interface CreatePaymentOrderPayload {
  business_id: string
  type: PaymentOrderType
  reference_id?: string
  plan?: string
  /** Email customer untuk notifikasi pembayaran Duitku. */
  email?: string
}

export const createPaymentOrder = (data: CreatePaymentOrderPayload) =>
  api.post<ApiResponse<PaymentOrder>>('/payment-order', data)

export const getPaymentOrder = (id: string) =>
  api.get<ApiResponse<PaymentOrder>>(`/payment-order/${id}`)
