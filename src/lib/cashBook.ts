import { todayISODate } from './utils'

/** Batas alasan pembatalan — sama dengan validasi server (3..200 karakter). */
export const VOID_REASON_MIN = 3
export const VOID_REASON_MAX = 200

export function isValidVoidReason(reason: string): boolean {
  const length = reason.trim().length
  return length >= VOID_REASON_MIN && length <= VOID_REASON_MAX
}

/**
 * Kunci `Idempotency-Key` untuk satu formulir yang sedang terbuka.
 *
 * Dibuat sekali saat formulir dibuka dan dipakai ulang di setiap percobaan
 * kirim, supaya klik ganda atau kirim ulang setelah jaringan putus tidak
 * mencatat pengeluaran yang sama dua kali — masalah yang justru membuat fitur
 * pembatalan ini dibutuhkan.
 */
export function newIdempotencyKey(): string {
  const c = globalThis.crypto
  if (c?.randomUUID) return c.randomUUID()
  const bytes = new Uint8Array(16)
  if (c?.getRandomValues) c.getRandomValues(bytes)
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * `occurred_at` (RFC3339) dari tanggal kalender pilihan pengguna.
 *
 * Hari ini → tidak dikirim (server memakai "sekarang"). Tanggal lain → tanggal
 * itu pada jam saat ini, supaya urutan barisnya di tanggal tersebut tetap
 * masuk akal dan tanggal lokalnya tidak bergeser karena zona waktu.
 */
export function occurredAtFor(date: string, now: Date = new Date()): string | undefined {
  if (!date || date === todayISODate(now)) return undefined
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString()
}

/** Rentang bawaan buku mutasi: awal bulan berjalan s.d. hari ini. */
export function defaultLedgerRange(now: Date = new Date()): { start: string; end: string } {
  return { start: todayISODate(new Date(now.getFullYear(), now.getMonth(), 1)), end: todayISODate(now) }
}

/** Saldo kedua akun setelah transfer; null bila saldo tidak diketahui. */
export function transferPreview(fromBalance: number | null | undefined, toBalance: number | null | undefined, amount: number) {
  const value = Number.isFinite(amount) && amount > 0 ? amount : 0
  return {
    fromAfter: fromBalance == null ? null : fromBalance - value,
    toAfter: toBalance == null ? null : toBalance + value,
  }
}
