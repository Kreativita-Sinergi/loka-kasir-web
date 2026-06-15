import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle2, Printer, WifiOff, Usb, Bluetooth, Inbox, Receipt, ChevronDown } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { getOutletConfig } from '@/api/outlets'
import { useOutletStore } from '@/store/outletStore'
import { unitPriceWithModifiers, type CartItem } from '@/pages/pos/types'
import type { CartTotals } from '@/store/cartStore'
import { buildReceipt, buildDrawerKick, widthForPaper, dotsForPaper, imageUrlToRaster, renderReceiptText, type ReceiptData } from '@/lib/escpos'
import { printViaUSB, printViaBluetooth, usbSupported, bluetoothSupported } from '@/lib/thermalPrinter'

export interface SaleSnapshot {
  items: CartItem[]
  totals: CartTotals
  methodName: string
  amountReceived: number
  change: number
  /** Sisa hutang bila transaksi kasbon (0 = lunas). */
  kasbonDebt?: number
  offline: boolean
  businessName: string
  /** Nomor antrian (opsional). */
  queueNumber?: string | null
  /** Nama pelanggan (opsional). */
  customerName?: string | null
  /** URL logo bisnis untuk struk browser (opsional). */
  logoUrl?: string | null
  createdAt: number
}

interface Props {
  sale: SaleSnapshot | null
  onClose: () => void
}

export default function ReceiptModal({ sale, onClose }: Props) {
  const [printing, setPrinting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const outlet = useOutletStore((s) => s.selected)
  const { data: cfg } = useQuery({
    queryKey: ['outlet-config-qris', outlet?.id], // reuse cache from PaymentModal
    queryFn: async () => (await getOutletConfig(outlet!.id)).data.data,
    enabled: !!sale && !!outlet,
  })
  if (!sale) return null

  const width = widthForPaper(cfg?.paper_size)
  const isCash = /tunai|cash/i.test(sale.methodName)
  // Logo struk = outlet config logo_url (di-upload via Profil), fallback ke logo
  // bisnis. Hanya tampil bila "Tampilkan Logo" aktif di pengaturan outlet.
  const receiptLogo = (cfg?.show_logo ? (cfg?.logo_url ?? sale.logoUrl) : null) ?? null

  const receiptData: ReceiptData = {
    businessName: sale.businessName,
    dateTime: new Date(sale.createdAt).toLocaleString('id-ID'),
    queueNumber: sale.queueNumber ?? null,
    customerName: sale.customerName ?? null,
    items: sale.items.map((i) => ({
      name: i.name,
      qty: i.quantity,
      amount: unitPriceWithModifiers(i) * i.quantity,
    })),
    subtotal: sale.totals.subtotal,
    discount: sale.totals.discount,
    tax: sale.totals.tax,
    total: sale.totals.total,
    methodName: sale.methodName,
    amountReceived: sale.amountReceived,
    change: sale.change,
  }

  const send = async (transport: 'usb' | 'bluetooth', bytes: Uint8Array) => {
    if (transport === 'usb') await printViaUSB(bytes)
    else await printViaBluetooth(bytes)
  }

  const printThermal = async (transport: 'usb' | 'bluetooth') => {
    setPrinting(true)
    try {
      // Konversi logo ke raster bila diaktifkan & tersedia (gagal → tanpa logo).
      let logo: Uint8Array | null = null
      if (receiptLogo) {
        logo = await imageUrlToRaster(receiptLogo, dotsForPaper(cfg?.paper_size))
      }
      // Buka laci otomatis untuk pembayaran tunai.
      await send(transport, buildReceipt(receiptData, { width, openDrawer: isCash, logo }))
      toast.success('Struk dikirim ke printer')
    } catch (e) {
      toast.error((e as Error)?.message || 'Gagal mencetak. Coba "Struk Browser".')
    } finally {
      setPrinting(false)
    }
  }

  const openDrawer = async () => {
    const transport: 'usb' | 'bluetooth' = usbSupported() ? 'usb' : 'bluetooth'
    setPrinting(true)
    try {
      await send(transport, buildDrawerKick())
    } catch (e) {
      toast.error((e as Error)?.message || 'Gagal membuka laci')
    } finally {
      setPrinting(false)
    }
  }

  const print = () => {
    const w = window.open('', '_blank', 'width=320,height=600')
    if (!w) return
    const rows = sale.items
      .map(
        (i) =>
          `<tr><td>${i.name} x${i.quantity}</td><td style="text-align:right">${formatCurrency(
            unitPriceWithModifiers(i) * i.quantity,
          )}</td></tr>`,
      )
      .join('')
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const logoHtml = receiptLogo
      ? `<img src="${esc(receiptLogo)}" alt="logo" style="max-width:120px;max-height:80px;object-fit:contain;display:block;margin:0 auto 6px" />`
      : ''
    const queueHtml = sale.queueNumber
      ? `<div style="text-align:center;font-weight:bold;font-size:20px;margin:4px 0">No. Antrian: ${esc(sale.queueNumber)}</div>`
      : ''
    const customerHtml = sale.customerName
      ? `<div>Kepada: ${esc(sale.customerName)}</div>`
      : ''
    w.document.write(`
      <html><head><title>Struk</title>
      <style>
        body{font-family:monospace;font-size:12px;padding:8px;width:280px}
        h3{text-align:center;margin:4px 0}
        table{width:100%;border-collapse:collapse}
        td{padding:2px 0}
        .line{border-top:1px dashed #000;margin:6px 0}
        .tot{font-weight:bold}
      </style></head><body>
      ${logoHtml}
      <h3>${esc(sale.businessName)}</h3>
      <div style="text-align:center">${new Date(sale.createdAt).toLocaleString('id-ID')}</div>
      ${queueHtml}
      ${customerHtml}
      <div class="line"></div>
      <table>${rows}</table>
      <div class="line"></div>
      <table>
        <tr><td>Subtotal</td><td style="text-align:right">${formatCurrency(sale.totals.subtotal)}</td></tr>
        <tr><td>Diskon</td><td style="text-align:right">- ${formatCurrency(sale.totals.discount)}</td></tr>
        <tr><td>Pajak</td><td style="text-align:right">${formatCurrency(sale.totals.tax)}</td></tr>
        <tr class="tot"><td>TOTAL</td><td style="text-align:right">${formatCurrency(sale.totals.total)}</td></tr>
        <tr><td>${sale.methodName}</td><td style="text-align:right">${formatCurrency(sale.amountReceived)}</td></tr>
        <tr><td>Kembali</td><td style="text-align:right">${formatCurrency(sale.change)}</td></tr>
      </table>
      <div class="line"></div>
      <div style="text-align:center">Terima kasih 🙏</div>
      <script>window.onload=()=>{window.print();window.close()}</script>
      </body></html>`)
    w.document.close()
  }

  return (
    <Modal open={!!sale} onClose={onClose} title="Transaksi Selesai" size="sm">
      <div className="space-y-4 text-center">
        {sale.offline ? (
          <WifiOff className="mx-auto text-amber-500" size={44} />
        ) : (sale.kasbonDebt ?? 0) > 0 ? (
          <Receipt className="mx-auto text-amber-500" size={44} />
        ) : (
          <CheckCircle2 className="mx-auto text-success" size={44} />
        )}
        <p className="text-2xl font-bold">{formatCurrency(sale.totals.total)}</p>
        {sale.offline ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Tersimpan offline. Akan disinkronkan otomatis saat koneksi kembali.
          </p>
        ) : (sale.kasbonDebt ?? 0) > 0 ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Kasbon — dibayar {formatCurrency(sale.amountReceived)}, sisa hutang{' '}
            <span className="font-semibold">{formatCurrency(sale.kasbonDebt ?? 0)}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pembayaran {sale.methodName} berhasil
            {sale.change > 0 && ` — kembalian ${formatCurrency(sale.change)}`}
          </p>
        )}

        {/* Pratinjau struk (sesuai yang akan dicetak) */}
        <div>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="mx-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Receipt size={13} /> Pratinjau Struk
            <ChevronDown size={13} className={showPreview ? 'rotate-180 transition' : 'transition'} />
          </button>
          {showPreview && (
            <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-border bg-muted/50 p-3">
              {/* Logo & teks dipusatkan sebagai satu kolom agar logo sejajar di
                  tengah blok struk (teks struk lebih sempit dari lebar kotak). */}
              <div className="flex flex-col items-center">
                {receiptLogo && (
                  <img
                    src={receiptLogo}
                    alt="Logo"
                    className="mb-2 max-h-16 object-contain"
                  />
                )}
                <pre className="font-mono text-[11px] leading-tight text-foreground whitespace-pre">
{renderReceiptText(receiptData, width).join('\n')}
                </pre>
              </div>
            </div>
          )}
        </div>

        {(usbSupported() || bluetoothSupported()) && (
          <div className="space-y-2">
            <div className="flex gap-2">
              {usbSupported() && (
                <Button variant="outline" className="flex-1" disabled={printing} onClick={() => printThermal('usb')}>
                  <Usb size={16} /> Thermal USB
                </Button>
              )}
              {bluetoothSupported() && (
                <Button variant="outline" className="flex-1" disabled={printing} onClick={() => printThermal('bluetooth')}>
                  <Bluetooth size={16} /> Bluetooth
                </Button>
              )}
            </div>
            <Button variant="ghost" size="sm" className="w-full" disabled={printing} onClick={openDrawer}>
              <Inbox size={15} /> Buka Laci
            </Button>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" className="flex-1" onClick={print}>
            <Printer size={16} /> Struk Browser
          </Button>
          <Button className="flex-1" onClick={onClose}>
            Transaksi Baru
          </Button>
        </div>
      </div>
    </Modal>
  )
}
