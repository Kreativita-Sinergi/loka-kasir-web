import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/**
 * Mengubah string menjadi Title Case (huruf besar di awal setiap kata).
 * Data disimpan lowercase di DB; gunakan ini saat menampilkan ke user.
 */
export function toTitleCase(str: string | null | undefined): string {
  if (!str) return ''
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export function generateRandomSKU(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `SKU-${date}-${rand}`
}

export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const e = error as { response?: { data?: { error?: { details?: string }; message?: string } } }
    return e.response?.data?.error?.details || e.response?.data?.message || 'Terjadi kesalahan'
  }
  return 'Terjadi kesalahan'
}
