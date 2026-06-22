import { publicApi } from '@/lib/axios'
import type { ApiResponse, Product } from '@/types'

// ─── QR Scan-to-Order (public, no auth) ──────────────────────────────────────

export interface PublicMenuCategory {
  id: string | null
  name: string
  products: Product[]
}

export interface PublicMenu {
  business_name: string
  business_logo: string | null
  outlet_name: string
  outlet_id: string
  table_number: string
  categories: PublicMenuCategory[]
}

export interface SelfOrderItem {
  item_type: 'PRODUCT' | 'VARIANT' | 'BUNDLE'
  reference_id: string
  quantity: number
  attributes?: { product_attribute_id: string; additional_price: number }[]
}

export interface SelfOrderPayload {
  customer_name?: string | null
  notes?: string | null
  items: SelfOrderItem[]
}

export interface PublicOrderResult {
  transaction_id: string
  bill_number?: string
  queue_number?: string | null
  fulfillment_status?: string | null
  payment_status?: string
  final_price?: number
}

export const getPublicMenu = (token: string) =>
  publicApi.get<ApiResponse<PublicMenu>>(`/public/menu/${token}`)

export const createPublicOrder = (token: string, payload: SelfOrderPayload) =>
  publicApi.post<ApiResponse<PublicOrderResult>>(`/public/order/${token}`, payload)

export const getPublicOrderStatus = (orderId: string) =>
  publicApi.get<ApiResponse<PublicOrderResult>>(`/public/order/${orderId}`)
