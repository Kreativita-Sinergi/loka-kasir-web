import { todayISODate } from '@/lib/utils'

// Rentang bawaan laporan bertanggal: awal bulan ini sampai hari ini. Tanggal
// LOKAL — toISOString mundur sehari di WIB sebelum pukul 07.00.
export function monthStartISO(now: Date = new Date()): string {
  return todayISODate(new Date(now.getFullYear(), now.getMonth(), 1))
}

export type ReportRange = { from: string; to: string }

export function businessTodayISO(timeZone = 'Asia/Jakarta', now = new Date()): string {
  const format = (zone: string) => new Intl.DateTimeFormat('sv-SE', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)

  try {
    return format(timeZone)
  } catch (error) {
    if (!(error instanceof RangeError)) throw error
    return format('Asia/Jakarta')
  }
}

export const REPORT_DAY_MS = 86_400_000

export function offsetReportDate(date: string, days: number): string {
  return new Date(Date.parse(date) + days * REPORT_DAY_MS).toISOString().slice(0, 10)
}

export function isReportDate(date: string | null): date is string {
  return !!date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= '0001-01-01'
    && Number.isFinite(Date.parse(date)) && offsetReportDate(date, 0) === date
}

export function previousReportRange({ from, to }: ReportRange): ReportRange | undefined {
  const days = (Date.parse(to) - Date.parse(from)) / REPORT_DAY_MS + 1
  const previousFrom = offsetReportDate(from, -days)
  if (isReportDate(previousFrom)) return { from: previousFrom, to: offsetReportDate(from, -1) }
}
