import api from '@/lib/axios'
import type { ApiResponse } from '@/types'

/** Satu lapangan yang bisa disewa per jam.
 *
 *  Berbeda dari MEJA rumah makan, yang hanya punya dua keadaan: lapangan
 *  disewa untuk RENTANG WAKTU, dan pertanyaannya bukan "sedang dipakai atau
 *  tidak" melainkan "jam berapa saja yang masih kosong hari Sabtu". */
export interface Court {
  id: string
  name: string
  sport: string
  hourly_rate: number
  /** Jam operasional dalam MENIT sejak tengah malam. Tutup pukul 24.00
   *  disimpan 1440, bukan 0 — kalau tidak, lapangan yang buka sampai tengah
   *  malam terbaca tutup sepanjang hari. */
  open_minute: number
  close_minute: number
  /** Kelipatan pemesanan. Padel umumnya 60 atau 90 menit; biliar kerap 30. */
  slot_minutes: number
  is_active: boolean
  sort_order: number
  note?: string | null
}

/** Tarif yang menimpa tarif dasar pada rentang jam tertentu.
 *
 *  Satu jam padel pukul sepuluh pagi dan pukul tujuh malam adalah barang yang
 *  sama dengan harga yang bisa berbeda dua kali lipat, dan yang membedakannya
 *  bukan pilihan kasir melainkan jam dinding. */
export interface CourtRate {
  id: string
  /** Null berarti berlaku untuk SEMUA lapangan di outlet. */
  court_id?: string | null
  name: string
  /** Hari berlaku, ISO-8601 dipisah koma: 1 Senin … 7 Minggu. Kosong = tiap hari. */
  days_of_week: string
  start_minute: number
  end_minute: number
  hourly_rate: number
  is_active: boolean
}

export interface Booking {
  id: string
  court_id: string
  booking_number: string
  customer_name: string
  customer_phone?: string | null
  starts_at: string
  ends_at: string
  total_price: number
  deposit_amount: number
  status: string
  transaction_id?: string | null
  note?: string | null
  court?: Court | null
  field_values?: { field_key: string; label: string; value: string }[]
}

export interface DaySchedule {
  date: string
  courts: Court[]
  bookings: Booking[]
}

export const SPORTS = [
  'PADEL', 'MINI_SOCCER', 'FUTSAL', 'BADMINTON',
  'BASKET', 'TENIS', 'BILIAR', 'LAINNYA',
] as const

export const getCourts = (outletId: string, includeInactive = false) =>
  api.get<ApiResponse<Court[]>>('/booking/court', {
    params: { outlet_id: outletId, include_inactive: includeInactive || undefined },
  })

export const saveCourt = (
  outletId: string,
  data: Omit<Court, 'id'>,
  id?: string,
) =>
  id
    ? api.put<ApiResponse<Court>>(`/booking/court/${id}`, data, { params: { outlet_id: outletId } })
    : api.post<ApiResponse<Court>>('/booking/court', data, { params: { outlet_id: outletId } })

export const deleteCourt = (id: string) =>
  api.delete<ApiResponse<null>>(`/booking/court/${id}`)

export const getRates = () => api.get<ApiResponse<CourtRate[]>>('/booking/rate')

export const saveRate = (data: Omit<CourtRate, 'id'>, id?: string) =>
  id
    ? api.put<ApiResponse<CourtRate>>(`/booking/rate/${id}`, data)
    : api.post<ApiResponse<CourtRate>>('/booking/rate', data)

export const deleteRate = (id: string) =>
  api.delete<ApiResponse<null>>(`/booking/rate/${id}`)

export const getSchedule = (outletId: string, date: string) =>
  api.get<ApiResponse<DaySchedule>>('/booking/schedule', {
    params: {
      outlet_id: outletId,
      date,
      // Batas hari di Jakarta bukan batas hari di UTC. Tanpa selisih zona ini,
      // kalender Sabtu memuat pemesanan Jumat malam.
      tz_offset_minutes: -new Date().getTimezoneOffset(),
    },
  })

/** Mengubah menit sejak tengah malam menjadi "HH.MM".
 *
 *  Memakai titik, bukan titik dua: itu bentuk yang dipakai di Indonesia, dan
 *  jam ini dibaca pemilik lapangan, bukan mesin. */
export function formatMinuteOfDay(minute: number) {
  const hour = Math.floor(minute / 60) % 24
  const rest = minute % 60
  return `${String(hour).padStart(2, '0')}.${String(rest).padStart(2, '0')}`
}

/** Menit sejak tengah malam dari sebuah stempel waktu, dipotong pada batas
 *  harinya — supaya sewa yang melewati tengah malam tergambar benar di kalender
 *  kedua harinya. */
export function minuteRangeIn(booking: Booking, day: Date): [number, number] {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  const dayEnd = new Date(dayStart.getTime() + 86_400_000)
  const from = new Date(booking.starts_at)
  const to = new Date(booking.ends_at)
  const start = from < dayStart ? dayStart : from
  const end = to > dayEnd ? dayEnd : to
  return [
    Math.round((start.getTime() - dayStart.getTime()) / 60_000),
    Math.round((end.getTime() - dayStart.getTime()) / 60_000),
  ]
}
