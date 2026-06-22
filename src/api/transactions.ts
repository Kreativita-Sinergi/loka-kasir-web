import api from '@/lib/axios'
import type { ApiResponse, SoldProduct, Transaction } from '@/types'

interface TransactionListResponse {
  status: boolean
  message: string
  data: {
    limit: number
    page: number
    results: Transaction[]
    total: number
    totalPages: number
  }
  pagination: {
    page: number
    limit: number
    total: number
    order_by: string
    sort_by: string
  }
}

export const getTransactions = (params?: Record<string, unknown>) =>
  api.get<TransactionListResponse>('/transaction', { params })

export const getTransactionById = (id: string) =>
  api.get<ApiResponse<Transaction>>(`/transaction/${id}`)

/** Agregasi produk terjual (qty + nominal) untuk rentang tanggal & outlet. */
export const getSoldProducts = (params?: Record<string, unknown>) =>
  api.get<ApiResponse<SoldProduct[]>>('/transaction/sold-products', { params })

export const refundTransaction = (id: string, reason: string) =>
  api.put<ApiResponse<Transaction>>(`/transaction/refund/${id}`, { refund_reason: reason })

export const cancelTransaction = (id: string, reason: string) =>
  api.put<ApiResponse<Transaction>>(`/transaction/canceled/${id}`, { canceled_reason: reason })

/** Pesanan QR Scan-to-Order yang menunggu konfirmasi kasir (outlet aktif via header X-Outlet-Id). */
export const getPendingSelfOrders = () =>
  api.get<ApiResponse<Transaction[]>>('/transaction/self-orders/pending')

/** Ubah status fulfillment pesanan (mis. terima self-order: pending → confirmed). */
export const updateOrderStatus = (id: string, fulfillment_status: string, changed_by?: string) =>
  api.put<ApiResponse<Transaction>>(`/transaction/order-status/${id}`, { fulfillment_status, changed_by })
