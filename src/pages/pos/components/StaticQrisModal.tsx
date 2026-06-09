import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { Loader2, QrCode, ExternalLink } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { getOutletConfig } from '@/api/outlets'
import { useOutletStore } from '@/store/outletStore'

interface Props {
  open: boolean
  total: number
  submitting: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * Menampilkan QRIS statis milik merchant (gambar yang diupload, atau QR dari
 * payment link) untuk dipindai pelanggan. Konfirmasi LUNAS manual oleh kasir —
 * dana langsung masuk ke rekening merchant, tanpa gateway.
 */
export default function StaticQrisModal({ open, total, submitting, onConfirm, onClose }: Props) {
  const outlet = useOutletStore((s) => s.selected)
  const [linkQr, setLinkQr] = useState<string | null>(null)

  const { data: config, isLoading } = useQuery({
    queryKey: ['outlet-config-qris', outlet?.id],
    queryFn: async () => (await getOutletConfig(outlet!.id)).data.data,
    enabled: open && !!outlet,
  })

  const imageUrl = config?.qris_image_url ?? null
  const link = config?.payment_link ?? null

  useEffect(() => {
    if (!link || imageUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLinkQr(null)
      return
    }
    QRCode.toDataURL(link, { width: 260, margin: 1 }).then(setLinkQr).catch(() => setLinkQr(null))
  }, [link, imageUrl])

  return (
    <Modal open={open} onClose={onClose} title="Pembayaran QRIS" size="sm">
      <div className="space-y-4 text-center">
        <div className="rounded-2xl bg-primary-subtle p-3">
          <p className="text-xs text-muted-foreground">Total Tagihan</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(total)}</p>
        </div>

        {isLoading ? (
          <div className="flex h-[260px] items-center justify-center">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt="QRIS"
            className="mx-auto w-[260px] rounded-xl border border-border"
          />
        ) : linkQr ? (
          <div className="space-y-2">
            <img src={linkQr} alt="QR Pembayaran" className="mx-auto rounded-xl border border-border" />
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink size={12} /> Buka link pembayaran
              </a>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8 text-muted-foreground">
            <QrCode size={32} />
            <p className="text-sm">QRIS belum diatur untuk outlet ini.</p>
            <p className="text-xs">
              Atur gambar QRIS / link pembayaran di Outlet → Pengaturan, atau tunjukkan QRIS
              fisik Anda, lalu konfirmasi manual.
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Pelanggan scan & bayar. Setelah dana masuk ke rekening Anda, tekan{' '}
          <span className="font-medium">Konfirmasi Lunas</span>.
        </p>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button className="flex-1" onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Memproses…' : 'Konfirmasi Lunas'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
