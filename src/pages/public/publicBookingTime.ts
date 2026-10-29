import type { PublicBookingCourt, PublicBookingInfo } from '@/api/public'
import { activeLocale, t } from '@/lib/i18n'

/** Selisih zona toko pada saat [at], dalam bentuk RFC3339 ("+07:00"). */
export function zoneOffset(timeZone: string, at: Date = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
    const m = /GMT([+-]\d{2}):?(\d{2})?/.exec(part)
    return m ? `${m[1]}:${m[2] ?? '00'}` : 'Z'
  } catch {
    return '+07:00'
  }
}

/** Tanggal YYYY-MM-DD hari ini menurut jam dinding toko. */
export function todayIn(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

export const addDays = (ymd: string, days: number) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export const hhmm = (minute: number) => {
  const m = ((minute % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}.${String(m % 60).padStart(2, '0')}`
}

/** Menit jam dinding pada [date] → RFC3339 dengan zona toko. 1440 = besoknya 00.00. */
export function wallToIso(date: string, minute: number, offset: string): string {
  const day = addDays(date, Math.floor(minute / 1440))
  const m = minute % 1440
  const h = String(Math.floor(m / 60)).padStart(2, '0')
  const mm = String(m % 60).padStart(2, '0')
  return `${day}T${h}:${mm}:00${offset}`
}

type ScheduleView = Pick<PublicBookingInfo, 'date' | 'timezone' | 'busy'>

/**
 * Keadaan satu jam mulai: bisa dipilih, sudah dipesan orang lain (seluruh
 * atau sebagian rentangnya), atau sudah lewat.
 */
export type SlotState = 'free' | 'taken' | 'past'

export interface SlotOption {
  minute: number
  state: SlotState
}

/** Rentang terisi [court] dalam milidetik. */
const busyRanges = (info: ScheduleView, courtId: string) =>
  info.busy
    .filter((b) => b.court_id === courtId)
    .map((b) => [Date.parse(b.starts_at), Date.parse(b.ends_at)] as const)

/**
 * SEMUA jam mulai [court] untuk durasi [duration] menit beserta keadaannya.
 *
 * Jam yang terisi tidak disembunyikan: pelanggan perlu bisa membedakan "jam
 * 19.00 sudah dipesan" dari "lapangan tidak buka jam 19.00", dan melihat
 * kapan lapangannya ramai. Nama pemesan tidak pernah ada di sini — server
 * hanya mengirim rentang jamnya.
 */
export function slotOptions(
  info: ScheduleView,
  court: PublicBookingCourt,
  duration: number,
  now: number = Date.now(),
): SlotOption[] {
  const offset = zoneOffset(info.timezone, new Date(`${info.date}T12:00:00Z`))
  const busy = busyRanges(info, court.id)
  const step = court.slot_minutes > 0 ? court.slot_minutes : 60
  const out: SlotOption[] = []
  for (let m = court.open_minute; m + duration <= court.close_minute; m += step) {
    const s = Date.parse(wallToIso(info.date, m, offset))
    const e = Date.parse(wallToIso(info.date, m + duration, offset))
    const state: SlotState = s <= now ? 'past' : busy.some(([bs, be]) => s < be && bs < e) ? 'taken' : 'free'
    out.push({ minute: m, state })
  }
  return out
}

/** Jam mulai yang masih kosong untuk [court] dengan durasi [duration] menit. */
export function freeStarts(
  info: ScheduleView,
  court: PublicBookingCourt,
  duration: number,
  now: number = Date.now(),
): number[] {
  return slotOptions(info, court, duration, now)
    .filter((o) => o.state === 'free')
    .map((o) => o.minute)
}

/** Keadaan satu kotak di jadwal harian; 'closed' = di luar jam buka lapangan itu. */
export type CellState = SlotState | 'closed'

export interface DayGrid {
  /** Menit awal tiap baris, mis. [360, 420, …]. */
  rows: number[]
  /** Panjang satu baris dalam menit. */
  step: number
  /** cells[courtId][i] = keadaan baris ke-i. */
  cells: Record<string, CellState[]>
}

/**
 * Jadwal sehari semua lapangan, berbaris per jam (per 30 menit bila ada
 * lapangan berkelipatan setengah jam) — dari jam buka paling pagi sampai jam
 * tutup paling malam.
 */
export function dayGrid(info: ScheduleView & { courts: PublicBookingCourt[] }, now: number = Date.now()): DayGrid {
  const courts = info.courts
  if (courts.length === 0) return { rows: [], step: 60, cells: {} }
  const step = courts.every((c) => (c.slot_minutes > 0 ? c.slot_minutes : 60) % 60 === 0) ? 60 : 30
  const first = Math.min(...courts.map((c) => c.open_minute))
  const last = Math.max(...courts.map((c) => c.close_minute))
  const rows: number[] = []
  for (let m = first - (first % step); m < last; m += step) rows.push(m)
  const offset = zoneOffset(info.timezone, new Date(`${info.date}T12:00:00Z`))
  const cells: Record<string, CellState[]> = {}
  for (const court of courts) {
    const busy = busyRanges(info, court.id)
    cells[court.id] = rows.map((m) => {
      if (m < court.open_minute || m + step > court.close_minute) return 'closed'
      const s = Date.parse(wallToIso(info.date, m, offset))
      const e = Date.parse(wallToIso(info.date, m + step, offset))
      if (busy.some(([bs, be]) => s < be && bs < e)) return 'taken'
      return e <= now ? 'past' : 'free'
    })
  }
  return { rows, step, cells }
}

/**
 * "Sabtu, 1 November, 18.00–20.00" (atau "Saturday 1 November, 18.00–20.00")
 * menurut jam dinding toko, dalam bahasa halaman. Jamnya selalu bertitik,
 * sama dengan pilihan jam di halaman yang sama.
 */
export function formatRange(startsAt: string, endsAt: string, timeZone: string): string {
  const locale = activeLocale() === 'en' ? 'en-GB' : 'id-ID'
  const day = new Date(startsAt).toLocaleDateString(locale, { timeZone, weekday: 'long', day: 'numeric', month: 'long' })
  const time = (iso: string) => hhmm(wallMinute(iso, timeZone))
  return `${day}, ${time(startsAt)}–${time(endsAt)}`
}

/** Menit jam dinding toko sejak tengah malam untuk sebuah waktu. */
export function wallMinute(iso: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(iso))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return get('hour') * 60 + get('minute')
}

/** Tanggal YYYY-MM-DD jam dinding toko untuk sebuah waktu. */
export function wallDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(iso))
}

/** Link chat WhatsApp ke toko dengan pesan yang sudah terisi. */
export const contactUrl = (phone: string, text: string) =>
  `https://wa.me/${phone}?text=${encodeURIComponent(text)}`

/** "2 jam 30 mnt", "2 jam", "45 mnt" — mengikuti bahasa halaman. */
export function durationText(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return t('durHoursMinutes', { h, m })
  return h > 0 ? t('durHours', { h }) : t('durMinutes', { m })
}
