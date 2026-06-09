import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { getPaymentOrder } from '@/api/pos'

interface Props {
  open: boolean
  orderId: string | null
  paymentUrl: string | null
  total: number
  onPaid: () => void
  onClose: () => void
}

type Phase = 'waiting' | 'paid' | 'expired'

/**
 * QRIS dinamis (Duitku merchant): render QR dari payment_url lalu polling status
 * tiap 3 detik. Saat lunas (di-settle server oleh callback Duitku), panggil onPaid.
 * Modal di-mount fresh per charge sehingga state mulai bersih.
 */
export default function DynamicQrisModal({ open, orderId, paymentUrl, total, onPaid, onClose }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('waiting')
  const paidFired = useRef(false)

  useEffect(() => {
    if (!open || !paymentUrl) return
    QRCode.toDataURL(paymentUrl, { width: 280, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(null))
  }, [open, paymentUrl])

  useEffect(() => {
    if (!open || !orderId || phase !== 'waiting') return
    let active = true
    const tick = async () => {
      try {
        const res = await getPaymentOrder(orderId)
        if (!active) return
        const status = res.data.data.status
        if (status === 'paid' && !paidFired.current) {
          paidFired.current = true
          setPhase('paid')
          setTimeout(() => active && onPaid(), 900)
        } else if (status === 'expired' || status === 'cancelled') {
          setPhase('expired')
        }
      } catch {
        /* transient — keep polling */
      }
    }
    const timer = window.setInterval(tick, 3000)
    void tick()
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [open, orderId, phase, onPaid])

  return (
    <Modal open={open} onClose={onClose} title="Pembayaran QRIS" size="sm">
      <div className="space-y-4 text-center">
        <div className="rounded-2xl bg-primary-subtle p-3">
          <p className="text-xs text-muted-foreground">Total Tagihan</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(total)}</p>
        </div>

        {phase === 'waiting' && (
          <>
            <div className="flex justify-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QRIS" className="rounded-xl border border-border" />
              ) : (
                <div className="flex h-[280px] w-[280px] items-center justify-center">
                  <Loader2 className="animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Pelanggan scan QR, bayar via QRIS / e-wallet. Pembayaran masuk otomatis.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 size={13} className="animate-spin" /> Menunggu pembayaran…
            </div>
            <Button variant="outline" className="w-full" onClick={onClose}>
              Batal
            </Button>
          </>
        )}

        {phase === 'paid' && (
          <div className="space-y-2 py-6">
            <CheckCircle2 className="mx-auto text-success" size={48} />
            <p className="font-semibold">Pembayaran diterima!</p>
          </div>
        )}

        {phase === 'expired' && (
          <div className="space-y-3 py-4">
            <XCircle className="mx-auto text-destructive" size={44} />
            <p className="text-sm text-muted-foreground">
              QRIS kedaluwarsa / dibatalkan. Transaksi tersimpan belum lunas dan bisa dibayar
              ulang dari daftar transaksi.
            </p>
            <Button className="w-full" onClick={onClose}>Tutup</Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
