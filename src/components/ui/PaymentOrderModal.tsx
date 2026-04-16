import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2, Clock, AlertTriangle, ExternalLink, RefreshCw, CreditCard,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { getPaymentOrder } from '@/api/payment'
import type { PaymentOrder } from '@/types'

const POLL_INTERVAL_MS = 5_000

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(amount)
}

function useCountdown(expiredAt: string) {
  const calc = useCallback(() => {
    const diff = new Date(expiredAt).getTime() - Date.now()
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true }
    const totalSeconds = Math.floor(diff / 1000)
    return {
      hours:   Math.floor(totalSeconds / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
      expired: false,
    }
  }, [expiredAt])

  const [countdown, setCountdown] = useState(calc)

  useEffect(() => {
    const id = setInterval(() => setCountdown(calc()), 1000)
    return () => clearInterval(id)
  }, [calc])

  return countdown
}

// ─── CountdownBadge ───────────────────────────────────────────────────────────

function CountdownBadge({ expiredAt }: { expiredAt: string }) {
  const { hours, minutes, seconds, expired } = useCountdown(expiredAt)
  if (expired) {
    return (
      <span className="flex items-center gap-1 text-red-600 font-semibold text-sm">
        <AlertTriangle size={14} /> Kadaluarsa
      </span>
    )
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <span className="flex items-center gap-1.5 text-amber-700 font-mono font-semibold text-sm tabular-nums">
      <Clock size={14} className="shrink-0" />
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PaymentOrderModalProps {
  order: PaymentOrder | null
  open: boolean
  onClose: () => void
  /** Label deskriptif untuk ditampilkan di header, misal "Upgrade ke Pro" */
  title?: string
  /** Query keys yang di-invalidate setelah pembayaran berhasil */
  invalidateKeys?: string[][]
  /**
   * Dipanggil sekali ketika modal ditutup tanpa pembayaran berhasil,
   * atau polling mendeteksi status expired/cancelled.
   * Gunakan untuk rollback (misal: hapus outlet yang baru dibuat).
   */
  onPaymentFailed?: () => void
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentOrderModal({
  order,
  open,
  onClose,
  title = 'Selesaikan Pembayaran',
  invalidateKeys = [],
  onPaymentFailed,
}: PaymentOrderModalProps) {
  const qc = useQueryClient()
  const [polled, setPolled] = useState<{ orderId: string; status: PaymentOrder['status'] } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Pastikan onPaymentFailed hanya dipanggil sekali per sesi modal
  const failedCalledRef = useRef(false)

  // Reset guard setiap kali modal dibuka dengan order baru
  useEffect(() => {
    if (open) {
      failedCalledRef.current = false
      setPolled(null)
    }
  }, [open, order?.id])

  // Mulai polling saat modal terbuka dan order pending
  useEffect(() => {
    if (!open || !order || order.status !== 'pending') {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }

    const poll = async () => {
      try {
        const res = await getPaymentOrder(order.id)
        const newStatus = res.data.data.status
        setPolled({ orderId: order.id, status: newStatus })
        if (newStatus === 'paid') {
          if (pollRef.current) clearInterval(pollRef.current)
          invalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }))
        } else if (newStatus === 'expired' || newStatus === 'cancelled') {
          if (pollRef.current) clearInterval(pollRef.current)
          // Notifikasi rollback ke parent
          if (!failedCalledRef.current) {
            failedCalledRef.current = true
            onPaymentFailed?.()
          }
        }
      } catch {
        // Diam — jangan ganggu UX jika sesekali gagal
      }
    }

    pollRef.current = setInterval(poll, POLL_INTERVAL_MS)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [open, order, qc, invalidateKeys, onPaymentFailed])

  if (!order) return null

  const status    = (polled?.orderId === order.id ? polled.status : null) ?? order.status
  const isPaid    = status === 'paid'
  const isExpired = status === 'expired' || status === 'cancelled'

  // Tutup modal — jika pembayaran belum berhasil, notifikasi parent untuk rollback
  const handleClose = () => {
    if (!isPaid && !failedCalledRef.current) {
      failedCalledRef.current = true
      onPaymentFailed?.()
    }
    onClose()
  }

  const openPaymentPage = () => {
    if (order.payment_url) {
      window.open(order.payment_url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={isPaid ? 'Pembayaran Berhasil' : title} size="sm">
      {isPaid ? (
        // ── Sukses ──────────────────────────────────────────────────────────
        <div className="flex flex-col items-center py-4 gap-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 size={36} className="text-green-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">Pembayaran Diterima!</p>
            <p className="text-sm text-gray-500 mt-1">
              Pembayaran sebesar{' '}
              <span className="font-semibold text-gray-800">{formatRupiah(order.amount)}</span>{' '}
              telah dikonfirmasi. Akun Anda sudah diperbarui secara otomatis.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition"
          >
            Selesai
          </button>
        </div>
      ) : isExpired ? (
        // ── Kadaluarsa ──────────────────────────────────────────────────────
        <div className="flex flex-col items-center py-4 gap-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">Order Kadaluarsa</p>
            <p className="text-sm text-gray-500 mt-1">
              Waktu pembayaran telah habis. Silakan buat order baru dan ulangi proses pembayaran.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold rounded-xl transition"
          >
            Tutup
          </button>
        </div>
      ) : (
        // ── Menunggu pembayaran ──────────────────────────────────────────────
        <div className="space-y-4">

          {/* Header batas waktu */}
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <span className="text-xs text-amber-700 font-medium">Bayar sebelum</span>
            <CountdownBadge expiredAt={order.expired_at} />
          </div>

          {/* Detail pembayaran */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={15} className="text-gray-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Detail Pembayaran</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Total</span>
              <span className="font-bold text-gray-900 text-base">{formatRupiah(order.amount)}</span>
            </div>
            {order.duitku_reference && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">No. Referensi</span>
                <span className="font-mono text-xs text-gray-600">{order.duitku_reference}</span>
              </div>
            )}
          </div>

          {/* Tombol bayar via Duitku */}
          <button
            onClick={openPaymentPage}
            disabled={!order.payment_url}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2"
          >
            <ExternalLink size={15} />
            Bayar Sekarang
          </button>

          {/* Info metode pembayaran */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs text-blue-700 font-semibold mb-1.5">Metode pembayaran tersedia:</p>
            <p className="text-xs text-blue-600 leading-relaxed">
              QRIS · Virtual Account (BCA, BNI, BRI, Mandiri, Permata) · E-Wallet (OVO, ShopeePay, DANA, LinkAja) · Kartu Kredit
            </p>
          </div>

          {/* Catatan */}
          <p className="flex items-center gap-1.5 text-xs text-gray-500 leading-relaxed">
            <RefreshCw size={11} className="text-gray-400 shrink-0" />
            Halaman ini memperbarui status setiap {POLL_INTERVAL_MS / 1000} detik. Setelah membayar, status akan otomatis diperbarui.
          </p>
        </div>
      )}
    </Modal>
  )
}
