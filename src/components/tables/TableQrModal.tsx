import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Download, Printer, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Modal from '@/components/ui/Modal'
import { regenerateTableQr } from '@/api/tables'
import { getErrorMessage } from '@/lib/utils'
import type { Table } from '@/types'

interface Props {
  table: Table
  outletName?: string
  open: boolean
  onClose: () => void
}

/**
 * TableQrModal menampilkan QR code menu publik (Scan-to-Order) untuk satu meja.
 * QR di-generate di sisi klien dari `table.menu_url` memakai library `qrcode`,
 * lalu bisa diunduh sebagai PNG atau dicetak untuk ditempel di meja.
 */
export default function TableQrModal({ table, outletName, open, onClose }: Props) {
  const qc = useQueryClient()
  const [dataUrl, setDataUrl] = useState<string>('')
  const menuUrl = table.menu_url ?? ''

  useEffect(() => {
    if (!open || !menuUrl) return
    let active = true
    QRCode.toDataURL(menuUrl, { width: 512, margin: 2, errorCorrectionLevel: 'M' })
      .then((url) => { if (active) setDataUrl(url) })
      .catch(() => { if (active) setDataUrl('') })
    return () => { active = false }
  }, [open, menuUrl])

  const regenMut = useMutation({
    mutationFn: () => regenerateTableQr(table.id),
    onSuccess: () => {
      toast.success('QR berhasil dibuat ulang')
      qc.invalidateQueries({ queryKey: ['tables'] })
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const handleDownload = () => {
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `qr-meja-${table.number}.png`
    a.click()
  }

  const handlePrint = () => {
    if (!dataUrl) return
    const w = window.open('', '_blank', 'width=480,height=640')
    if (!w) return
    w.document.write(`
      <html>
        <head><title>QR Meja ${table.number}</title>
        <style>
          body { font-family: system-ui, sans-serif; text-align: center; padding: 32px; }
          h1 { font-size: 20px; margin: 0 0 4px; }
          h2 { font-size: 32px; margin: 0 0 16px; }
          p { color: #555; font-size: 14px; margin-top: 16px; }
          img { width: 320px; height: 320px; }
        </style></head>
        <body>
          ${outletName ? `<h1>${outletName}</h1>` : ''}
          <h2>Meja ${table.number}</h2>
          <img src="${dataUrl}" />
          <p>Scan untuk melihat menu &amp; memesan</p>
          <script>window.onload = function () { window.print(); window.onafterprint = function(){ window.close(); }; }</script>
        </body>
      </html>`)
    w.document.close()
  }

  return (
    <Modal open={open} onClose={onClose} title={`QR Meja ${table.number}`} size="sm">
      {!menuUrl ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          QR belum tersedia untuk meja ini. Coba muat ulang halaman.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center">
            {dataUrl
              ? <img src={dataUrl} alt={`QR Meja ${table.number}`} className="w-56 h-56 rounded-xl border border-border" />
              : <div className="w-56 h-56 rounded-xl bg-muted animate-pulse" />}
          </div>
          <p className="text-center text-xs text-muted-foreground break-all px-2">{menuUrl}</p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownload}
              disabled={!dataUrl}
              className="flex items-center justify-center gap-2 py-2.5 border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted disabled:opacity-50 transition"
            >
              <Download size={14} /> Unduh
            </button>
            <button
              onClick={handlePrint}
              disabled={!dataUrl}
              className="flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <Printer size={14} /> Cetak
            </button>
          </div>

          <button
            onClick={() => { if (confirm('Buat ulang QR? QR lama yang sudah dicetak tidak akan berfungsi lagi.')) regenMut.mutate() }}
            disabled={regenMut.isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-red-600 dark:text-red-400 text-sm font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50 transition"
          >
            <RefreshCw size={14} /> {regenMut.isPending ? 'Memproses...' : 'Buat Ulang QR'}
          </button>
        </div>
      )}
    </Modal>
  )
}
