// ESC/POS receipt encoder untuk printer thermal (58mm default = 32 kolom).
// Menghasilkan Uint8Array byte mentah yang dikirim ke printer via WebUSB /
// Web Bluetooth. Hanya teks + format dasar (align, bold, potong kertas) — cukup
// untuk struk kasir.

export interface ReceiptLineItem {
  name: string
  qty: number
  amount: number
}

export interface ReceiptData {
  businessName: string
  dateTime: string
  /** Nomor antrian (mis. "A001"). Bila ada, dicetak menonjol di bagian atas. */
  queueNumber?: string | null
  /** Nama pelanggan. Bila ada, dicetak sebagai baris "Kepada". */
  customerName?: string | null
  items: ReceiptLineItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  methodName: string
  amountReceived: number
  change: number
  footer?: string
}

const ESC = 0x1b
const GS = 0x1d
const LF = 0x0a

/** Map ke byte 8-bit (Latin-1); karakter non-ASCII diganti agar tak salah cetak. */
function toBytes(str: string): number[] {
  const out: number[] = []
  for (const ch of str) {
    const code = ch.charCodeAt(0)
    out.push(code < 256 ? code : 0x3f /* ? */)
  }
  return out
}

function rp(n: number): string {
  return 'Rp' + Math.round(n).toLocaleString('id-ID')
}

/** Baris dua kolom: kiri rata-kiri, kanan rata-kanan, total `width` kolom. */
function twoCol(left: string, right: string, width: number): string {
  const space = width - left.length - right.length
  if (space >= 1) return left + ' '.repeat(space) + right
  // Potong kiri agar muat.
  const maxLeft = Math.max(0, width - right.length - 1)
  return left.slice(0, maxLeft) + ' ' + right
}

export interface ReceiptOptions {
  /** Kolom karakter: 32 untuk 58mm, 48 untuk 80mm. */
  width?: number
  /** Kirim pulse buka laci kasir di awal cetak (untuk pembayaran tunai). */
  openDrawer?: boolean
  /**
   * Logo dalam format perintah raster ESC/POS (GS v 0), hasil [imageUrlToRaster].
   * Dicetak di bagian paling atas struk, rata tengah.
   */
  logo?: Uint8Array | null
}

/** Lebar cetak printer dalam dot: 58mm = 384 dot, 80mm = 576 dot. */
export function dotsForPaper(paperSize?: string): number {
  return paperSize === '80mm' ? 576 : 384
}

/**
 * Konversi URL gambar menjadi perintah raster ESC/POS (GS v 0) 1-bit hitam-putih.
 * Mengembalikan null bila gambar gagal dimuat atau kanvas ter-taint (CORS) —
 * pemanggil cukup melewati logo tanpa menggagalkan cetak.
 *
 * @param maxWidthDots lebar maksimum dalam dot (gunakan [dotsForPaper]).
 */
export async function imageUrlToRaster(
  url: string,
  maxWidthDots: number,
): Promise<Uint8Array | null> {
  try {
    // Cache-key terpisah ("cors=1"): mencegah pemakaian respons cache non-CORS
    // (dari <img> biasa di tempat lain) yang akan men-taint kanvas. Cloudinary
    // mengirim Access-Control-Allow-Origin: * tapi tanpa Vary: Origin.
    const corsUrl = url + (url.includes('?') ? '&' : '?') + 'cors=1'
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image()
      im.crossOrigin = 'anonymous' // wajib agar kanvas tidak ter-taint
      im.onload = () => resolve(im)
      im.onerror = reject
      im.src = corsUrl
    })
    if (!img.width || !img.height) return null

    // Lebar wajib kelipatan 8 (1 byte = 8 dot). Batasi ke maxWidthDots.
    let w = Math.min(maxWidthDots, img.width)
    w = Math.max(8, Math.floor(w / 8) * 8)
    const h = Math.max(1, Math.round((w * img.height) / img.width))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)

    const px = ctx.getImageData(0, 0, w, h).data
    const bytesPerRow = w / 8
    const out: number[] = [
      GS, 0x76, 0x30, 0x00,
      bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff,
      h & 0xff, (h >> 8) & 0xff,
    ]
    for (let y = 0; y < h; y++) {
      for (let bx = 0; bx < bytesPerRow; bx++) {
        let byte = 0
        for (let bit = 0; bit < 8; bit++) {
          const x = bx * 8 + bit
          const idx = (y * w + x) * 4
          const a = px[idx + 3]
          // Transparan dianggap putih.
          const lum = a < 128
            ? 255
            : 0.299 * px[idx] + 0.587 * px[idx + 1] + 0.114 * px[idx + 2]
          if (lum < 160) byte |= 0x80 >> bit // gelap → titik dicetak
        }
        out.push(byte)
      }
    }
    return new Uint8Array(out)
  } catch {
    return null
  }
}

/** Pulse buka laci kasir (ESC p 0 25 250) — laci terhubung ke port printer. */
export function buildDrawerKick(): Uint8Array {
  return new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xfa])
}

/** Lebar kolom dari paper_size outlet ('58mm' | '80mm'). */
export function widthForPaper(paperSize?: string): number {
  return paperSize === '80mm' ? 48 : 32
}

/**
 * Render struk sebagai baris teks (untuk PRATINJAU di layar) — sama persis
 * dengan tata letak yang dikirim ke printer, hanya tanpa byte kontrol.
 */
export function renderReceiptText(data: ReceiptData, width = 32): string[] {
  const center = (s: string) => {
    const pad = Math.max(0, Math.floor((width - s.length) / 2))
    return ' '.repeat(pad) + s
  }
  const lines: string[] = []
  lines.push(center(data.businessName))
  lines.push(center(data.dateTime))
  if (data.queueNumber) {
    lines.push(center('No. Antrian: ' + data.queueNumber))
  }
  if (data.customerName) {
    lines.push('Kepada: ' + data.customerName)
  }
  lines.push('-'.repeat(width))
  for (const it of data.items) {
    lines.push(it.name)
    lines.push(twoCol(`  ${it.qty} x`, rp(it.amount), width))
  }
  lines.push('-'.repeat(width))
  lines.push(twoCol('Subtotal', rp(data.subtotal), width))
  if (data.discount > 0) lines.push(twoCol('Diskon', '-' + rp(data.discount), width))
  if (data.tax > 0) lines.push(twoCol('Pajak', rp(data.tax), width))
  lines.push(twoCol('TOTAL', rp(data.total), width))
  lines.push(twoCol(data.methodName, rp(data.amountReceived), width))
  if (data.change > 0) lines.push(twoCol('Kembali', rp(data.change), width))
  lines.push('-'.repeat(width))
  lines.push(center(data.footer || 'Terima kasih'))
  return lines
}

export function buildReceipt(data: ReceiptData, opts: ReceiptOptions = {}): Uint8Array {
  const width = opts.width ?? 32
  const b: number[] = []
  if (opts.openDrawer) b.push(ESC, 0x70, 0x00, 0x19, 0xfa)
  const text = (s: string) => b.push(...toBytes(s))
  const line = (s = '') => {
    text(s)
    b.push(LF)
  }
  const align = (n: 0 | 1 | 2) => b.push(ESC, 0x61, n) // 0 left, 1 center, 2 right
  const bold = (on: boolean) => b.push(ESC, 0x45, on ? 1 : 0)

  b.push(ESC, 0x40) // init

  align(1)
  // Logo raster di paling atas (rata tengah). Printer modern menghormati
  // ESC a 1 untuk gambar GS v 0.
  if (opts.logo && opts.logo.length > 0) {
    b.push(...opts.logo)
    b.push(LF)
  }
  bold(true)
  line(data.businessName)
  bold(false)
  line(data.dateTime)
  if (data.queueNumber) {
    bold(true)
    line('No. Antrian: ' + data.queueNumber)
    bold(false)
  }
  if (data.customerName) {
    align(0)
    line('Kepada: ' + data.customerName)
    align(1)
  }
  line('-'.repeat(width))

  align(0)
  for (const it of data.items) {
    line(it.name)
    line(twoCol(`  ${it.qty} x`, rp(it.amount), width))
  }
  line('-'.repeat(width))

  line(twoCol('Subtotal', rp(data.subtotal), width))
  if (data.discount > 0) line(twoCol('Diskon', '-' + rp(data.discount), width))
  if (data.tax > 0) line(twoCol('Pajak', rp(data.tax), width))
  bold(true)
  line(twoCol('TOTAL', rp(data.total), width))
  bold(false)
  line(twoCol(data.methodName, rp(data.amountReceived), width))
  if (data.change > 0) line(twoCol('Kembali', rp(data.change), width))

  line('-'.repeat(width))
  align(1)
  line(data.footer || 'Terima kasih')

  b.push(LF, LF, LF)
  b.push(GS, 0x56, 0x42, 0x00) // partial cut (feed + cut)

  return new Uint8Array(b)
}
