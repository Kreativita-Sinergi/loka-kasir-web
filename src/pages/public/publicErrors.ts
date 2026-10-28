import { isAxiosError } from 'axios'
import { t } from '@/lib/i18n'
import type { MessageKey } from '@/lib/messages'

/**
 * Kode alasan dari server → kalimat dalam bahasa pengunjung.
 *
 * Kalimat galat server selalu berbahasa Indonesia; halaman publik mengikuti
 * bahasa peramban. Tanpa peta ini, pengunjung berbahasa Inggris membaca satu
 * kalimat Indonesia di tengah halaman Inggris. Kodenya kembaran konstanta
 * `Code…` di loka-kasir-service/service/public_error.go.
 */
const CODE_TEXT: Record<string, MessageKey> = {
  BOOKING_CANCELED: 'errBookingCanceled',
  BOOKING_COMPLETED: 'errBookingCompleted',
  BOOKING_ONGOING: 'errBookingOngoing',
  BOOKING_STARTED: 'errBookingStarted',
  BOOKING_PAID: 'errBookingPaid',
  RESCHEDULE_CLOSED: 'errRescheduleClosed',
  RESCHEDULE_USED: 'errRescheduleUsed',
  RESCHEDULE_TOO_LATE: 'errRescheduleTooLate',
  RESCHEDULE_CHANGED: 'errRescheduleChanged',
  COURT_NOT_FOUND: 'errCourtNotFound',
  TIME_PASSED: 'errTimePassed',
  DURATION_LOCKED: 'errDurationLocked',
  OUTSIDE_HOURS: 'errOutsideHours',
  PRICE_BELOW_DEPOSIT: 'errPriceBelowDeposit',
  SLOT_TAKEN: 'errSlotTaken',
  INVALID_PHONE: 'errInvalidPhone',
  BALANCE_MISMATCH: 'errBalanceMismatch',
  BALANCE_LOCKED: 'errBalanceLocked',
}

type Params = Record<string, string | number>

/** Kalimat untuk sebuah kode alasan, atau null bila kodenya belum dikenal. */
export function codeText(code: string | null | undefined, params?: Params | null): string | null {
  const key = code ? CODE_TEXT[code] : undefined
  return key ? t(key, params ?? undefined) : null
}

/**
 * Pesan untuk galat permintaan publik: kode yang dikenal diterjemahkan;
 * pembatasan laju tanpa kode menjadi "terlalu banyak percobaan"; selain itu
 * pesan server apa adanya, lalu [fallback].
 */
export function publicErrorText(error: unknown, fallback: MessageKey): string {
  if (!isAxiosError(error)) return t(fallback)
  const body = error.response?.data as
    | { message?: string; error?: { code?: string }; data?: Params }
    | undefined
  const known = codeText(body?.error?.code, body?.data)
  if (known) return known
  if (error.response?.status === 429) return t('pbTooMany')
  return body?.message || t(fallback)
}
