import api from '@/lib/axios'
import type { ApiResponse, ProfitSummary, SoldProduct, Transaction } from '@/types'

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

/**
 * Refund satu transaksi.
 *
 * Badannya memakai kunci `reason`, bukan `refund_reason`.
 * TransactionRefundRequest di server hanya mengenal `reason`, sehingga
 * `refund_reason` diterima dengan status 200 lalu DIBUANG diam-diam — di
 * produksi 17 dari 29 refund tersimpan tanpa alasan sama sekali, dan alasan
 * itulah yang pertama dicari saat sebuah refund dipertanyakan.
 *
 * Server juga akan menolak refund (403) bila outletnya menyalakan
 * "wajib PIN untuk void" dan tidak ada otorisasi supervisor yang menyertai.
 */
export const refundTransaction = (id: string, reason: string) =>
  api.put<ApiResponse<Transaction>>(`/transaction/refund/${id}`, { reason })

/** Sama seperti [refundTransaction]: kuncinya `reason`, bukan `canceled_reason`. */
export const cancelTransaction = (id: string, reason: string) =>
  api.put<ApiResponse<Transaction>>(`/transaction/canceled/${id}`, { reason })

/**
 * Menghapus transaksi PERMANEN — tidak ada pembatalan, tidak ada tong sampah.
 *
 * Berbeda dari refund dan pembatalan, stok, rekap shift, dan poin loyalti TIDAK
 * ikut dibalik: yang ingin mengembalikan barang dan uang memakai refund.
 */
export const deleteTransaction = (id: string, reason?: string) =>
  api.delete<ApiResponse<null>>(`/transaction/${id}`, { data: { reason: reason ?? '' } })

/**
 * Menghapus beberapa transaksi PERMANEN dalam satu permintaan.
 *
 * Server mengerjakannya utuh-atau-batal: satu nota yang gagal membatalkan
 * seluruh permintaan, jadi rekap tidak pernah berubah separuh. Maksimal 100 id.
 */
export const bulkDeleteTransactions = (ids: string[], reason?: string) =>
  api.delete<ApiResponse<{ deleted: number }>>('/transaction/bulk', { data: { ids, reason: reason ?? '' } })

/** Laba kotor untuk seluruh transaksi yang lolos filter — bukan hanya halaman ini. */
export const getProfitSummary = (params?: Record<string, unknown>) =>
  api.get<ApiResponse<ProfitSummary>>('/transaction/profit-summary', { params })

/** Pesanan QR Scan-to-Order yang menunggu konfirmasi kasir (outlet aktif via header X-Outlet-Id). */
export const getPendingSelfOrders = () =>
  api.get<ApiResponse<Transaction[]>>('/transaction/self-orders/pending')

/** Ubah status fulfillment pesanan (mis. terima self-order: pending → confirmed). */
export const updateOrderStatus = (id: string, fulfillment_status: string, changed_by?: string) =>
  api.put<ApiResponse<Transaction>>(`/transaction/order-status/${id}`, { fulfillment_status, changed_by })
