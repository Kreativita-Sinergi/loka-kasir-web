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
