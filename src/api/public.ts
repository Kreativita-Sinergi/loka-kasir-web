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
  /** Outlet siap menerima pembayaran QRIS langsung dari meja. */
  self_payment_enabled: boolean
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

/** Tagihan QRIS untuk satu pesanan meja. Nominal sudah tertanam di payload. */
export interface PublicPaymentOrder {
  id: string
  amount: number
  status: string
  qris_payload: string | null
  expired_at: string
}

/**
 * Terbitkan tagihan QRIS untuk pesanan meja.
 *
 * Ditolak (409) selama kasir belum menerima pesanannya — halaman hanya
 * memanggil ini setelah status pesanan melewati "pending".
 */
export const payPublicOrder = (orderId: string) =>
  publicApi.post<ApiResponse<PublicPaymentOrder>>(`/public/pay/${orderId}`)
