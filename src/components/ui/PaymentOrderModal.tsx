import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2, Clock, AlertTriangle, ExternalLink, RefreshCw, CreditCard,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { getPaymentOrder } from '@/api/payment'
import type { PaymentOrder } from '@/types'
import { formatMoneyIn, minorToMajor } from '@/lib/money'
import { t } from '@/lib/i18n'

const POLL_INTERVAL_MS = 5_000

/**
 * Nominal tampil order — mata uang lokal bila ada, rupiah bila tidak.
 *
 * Order lama tidak punya kolom display_*; keduanya null berarti nominalnya memang
 * rupiah, jadi `amount` dipakai apa adanya.
 */
function displayAmountOf(order: PaymentOrder): string {
  if (order.display_currency && order.display_amount !== null) {
    return formatMoneyIn(
      minorToMajor(order.display_amount, order.display_currency),
      order.display_currency,
    )
  }
  return formatMoneyIn(order.amount, 'IDR')
}

/** true bila yang ditampilkan bukan rupiah, sehingga catatan penagihan wajib muncul. */
function isForeignCurrency(order: PaymentOrder): boolean {
  return !!order.display_currency && order.display_currency !== 'IDR'
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
    let mounted = true
    const id = setInterval(() => { if (mounted) setCountdown(calc()) }, 1000)
    return () => { mounted = false; clearInterval(id) }
  }, [calc])

  return countdown
}

// ─── CountdownBadge ───────────────────────────────────────────────────────────

function CountdownBadge({ expiredAt }: { expiredAt: string }) {
  const { hours, minutes, seconds, expired } = useCountdown(expiredAt)
  if (expired) {
    return (
      <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold text-sm">
        <AlertTriangle size={14} /> {t('statusExpired')}
      </span>
    )
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-mono font-semibold text-sm tabular-nums">
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
  title = t('payCompletePayment'),
  invalidateKeys = [],
  onPaymentFailed,
}: PaymentOrderModalProps) {
  const qc = useQueryClient()
  const [polled, setPolled] = useState<{ orderId: string; status: PaymentOrder['status'] } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Pastikan onPaymentFailed hanya dipanggil sekali per sesi modal
  const failedCalledRef = useRef(false)

  // Reset guard setiap kali modal dibuka dengan order baru.
  // setPolled tidak diperlukan di sini karena line status sudah memfilter
  // polled stale via polled?.orderId === order.id.
  useEffect(() => {
    if (open) {
      failedCalledRef.current = false
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
    <Modal open={open} onClose={handleClose} title={isPaid ? t('paySucceeded') : title} size="sm">
      {isPaid ? (
        // ── Sukses ──────────────────────────────────────────────────────────
        <div className="flex flex-col items-center py-4 gap-4 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-500/15 rounded-full flex items-center justify-center">
            <CheckCircle2 size={36} className="text-green-500 dark:text-green-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{t('payReceived')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('payConfirmedBody', { amount: displayAmountOf(order) })}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition"
          >
            {t('labelCompleted')}
          </button>
        </div>
      ) : isExpired ? (
        // ── Kadaluarsa ──────────────────────────────────────────────────────
        <div className="flex flex-col items-center py-4 gap-4 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center">
            <AlertTriangle size={32} className="text-red-500 dark:text-red-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{t('payOrderExpired')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('payExpiredBody')}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold rounded-xl transition"
          >
            {t('shiftClosed')}
          </button>
        </div>
      ) : (
        // ── Menunggu pembayaran ──────────────────────────────────────────────
        <div className="space-y-4">

          {/* Header batas waktu */}
          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3">
            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">{t('payBefore')}</span>
            <CountdownBadge expiredAt={order.expired_at} />
          </div>

          {/* Detail pembayaran */}
          <div className="bg-muted border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={15} className="text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('payDetails')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('labelTotal')}</span>
              <span className="font-bold text-foreground text-base">{displayAmountOf(order)}</span>
            </div>
            {/*
              Catatan ini wajib ada di mana pun nominal non-rupiah ditampilkan.
              Pemilik toko yang melihat "¥1.480" lalu menemukan "IDR 160.000" di
              mutasi kartunya akan menganggap itu tagihan asing dan mengajukan
              sengketa ke banknya — dan sengketa kartu jauh lebih mahal daripada
              satu baris teks.
            */}
            {isForeignCurrency(order) && (
              <p className="text-xs text-muted-foreground">
                {t('planBilledInIdr', { amount: formatMoneyIn(order.amount, 'IDR') })}
              </p>
            )}
            {order.duitku_reference && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('payReferenceNo')}</span>
                <span className="font-mono text-xs text-muted-foreground">{order.duitku_reference}</span>
              </div>
            )}
          </div>

          {/* Tombol bayar via Duitku */}
          <button
            onClick={openPaymentPage}
            disabled={!order.payment_url}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-muted text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2"
          >
            <ExternalLink size={15} />
            {t('payNow')}
          </button>

          {/* Info metode pembayaran */}
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-3">
            <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold mb-1.5">{t('payMethodsAvailable')}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
              {t('payMethodsList')}
            </p>
          </div>

          {/* Catatan */}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground leading-relaxed">
            <RefreshCw size={11} className="text-muted-foreground shrink-0" />
            {t('payPollingNote', { seconds: POLL_INTERVAL_MS / 1000 })}
          </p>
        </div>
      )}
    </Modal>
  )
}
