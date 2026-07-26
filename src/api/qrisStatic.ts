import api from '@/lib/axios'
import type {
  ApiResponse, QrisStaticNotification, QrisNotificationStatus, PendingQrisBill,
} from '@/types'

// QRIS statis dengan konfirmasi otomatis: notifikasi dana masuk yang dibaca
// aplikasi kasir dari HP merchant, beserta hasil pencocokannya ke transaksi.
// Teks asli notifikasi ikut disimpan sebagai bukti dana benar-benar diterima.

export const getQrisNotifications = (params?: {
  outlet_id?: string
  status?: QrisNotificationStatus
  from?: string
  to?: string
  limit?: number
}) => api.get<ApiResponse<QrisStaticNotification[]>>('/qris-static/notifications', { params })

/** Tagihan QRIS yang masih menunggu pembayaran (termasuk yang kedaluwarsa). */
export const getPendingQrisBills = (outletId?: string) =>
  api.get<ApiResponse<PendingQrisBill[]>>('/qris-static/pending-bills', {
    params: outletId ? { outlet_id: outletId } : undefined,
  })

/**
 * Konfirmasi manual: melunasi transaksi memakai notifikasi yang dipilih operator.
 * Dipakai saat uang sudah masuk (terlihat di HP) tapi pencocokan otomatis gagal.
 * `force` diperlukan bila nominal notifikasi berbeda dari total transaksi.
 */
export const matchQrisNotification = (
  notificationId: string,
  data: { transaction_id: string; force?: boolean; note?: string },
) => api.post<ApiResponse<null>>(`/qris-static/notifications/${notificationId}/match`, data)
