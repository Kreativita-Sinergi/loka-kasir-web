import { type ClassValue, clsx } from 'clsx'
import { t } from './i18n'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Smart title-case untuk menampilkan data ke user.
 *
 * Hanya mengkapitalkan huruf awal kata yang seluruhnya huruf kecil. Kata yang
 * sudah mengandung kapital (nama warung, singkatan, brand) dibiarkan apa adanya:
 * - 'kopi susu'      → 'Kopi Susu'
 * - 'RM Padang ASLI' → 'RM Padang ASLI'
 * - 'iPhone 15'      → 'iPhone 15'
 * - 'Jl. RT 05'      → 'Jl. RT 05'
 */
export function toTitleCase(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .split(' ')
    .map((w) => {
      if (!w || w !== w.toLowerCase()) return w // kosong / sudah ada kapital
      return w.replace(/[a-z]/, (c) => c.toUpperCase()) // kapitalkan huruf pertama
    })
    .join(' ')
}

/**
 * Ketiga fungsi di bawah kini meneruskan ke `lib/money`, yang mengikuti mata uang
 * bisnis dan bahasa aktif alih-alih mengunci `'id-ID'` + `'IDR'`.
 *
 * Dibiarkan sebagai re-export, bukan dihapus, karena keduanya dipanggil dari
 * puluhan tempat: memindahkan seluruh import hanya untuk mengganti isinya berarti
 * menyentuh setiap halaman tanpa mengubah satu pun perilakunya.
 */
export { formatMoney as formatCurrency, formatDate, formatDateTime } from './money'

/**
 * Tanggal hari ini sebagai "YYYY-MM-DD" menurut zona waktu PERAMBAN.
 *
 * `toISOString()` selalu memberi tanggal UTC. Dipakai sebagai tanggal kalender
 * di WIB (UTC+7), hasilnya mundur sehari untuk siapa pun yang membukanya antara
 * tengah malam dan pukul 07.00 — pemilik yang membuat PO pagi buta mendapat
 * tanggal kemarin tanpa tanda apa pun bahwa itu salah.
 */
export function todayISODate(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Stempel waktu lokal ringkas "YYYYMMDDHHmm" — untuk nomor dokumen. */
export function localStamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}`
  )
}

export function generateRandomSKU(): string {
  const date = todayISODate().replace(/-/g, '') // YYYYMMDD
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `SKU-${date}-${rand}`
}

export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const e = error as { response?: { data?: { error?: { details?: string }; message?: string } } }
    return e.response?.data?.error?.details || e.response?.data?.message || t('errorGeneric')
  }
  return t('errorGeneric')
}
