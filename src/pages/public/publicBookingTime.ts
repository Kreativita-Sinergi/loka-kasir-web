import type { PublicBookingCourt, PublicBookingInfo } from '@/api/public'

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

/** Jam mulai yang masih kosong untuk [court] dengan durasi [duration] menit. */
export function freeStarts(
  info: PublicBookingInfo,
  court: PublicBookingCourt,
  duration: number,
  now: number = Date.now(),
): number[] {
  const offset = zoneOffset(info.timezone, new Date(`${info.date}T12:00:00Z`))
  const busy = info.busy
    .filter((b) => b.court_id === court.id)
    .map((b) => [Date.parse(b.starts_at), Date.parse(b.ends_at)] as const)
  const step = court.slot_minutes > 0 ? court.slot_minutes : 60
  const out: number[] = []
  for (let m = court.open_minute; m + duration <= court.close_minute; m += step) {
    const s = Date.parse(wallToIso(info.date, m, offset))
    const e = Date.parse(wallToIso(info.date, m + duration, offset))
    if (s <= now) continue
    if (busy.some(([bs, be]) => s < be && bs < e)) continue
    out.push(m)
  }
  return out
}
