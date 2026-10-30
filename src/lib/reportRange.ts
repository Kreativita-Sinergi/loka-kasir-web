import { todayISODate } from '@/lib/utils'

// Rentang bawaan laporan bertanggal: awal bulan ini sampai hari ini. Tanggal
// LOKAL — toISOString mundur sehari di WIB sebelum pukul 07.00.
export function monthStartISO(now: Date = new Date()): string {
  return todayISODate(new Date(now.getFullYear(), now.getMonth(), 1))
}
