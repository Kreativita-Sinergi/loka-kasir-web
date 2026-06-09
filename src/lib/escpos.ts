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
  bold(true)
  line(data.businessName)
  bold(false)
  line(data.dateTime)
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
