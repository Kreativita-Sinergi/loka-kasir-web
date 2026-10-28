import { AxiosError, type AxiosResponse } from 'axios'
import { afterEach, expect, it } from 'vitest'
import { setActiveLocale, t } from '@/lib/i18n'
import { codeText, publicErrorText } from './publicErrors'
import { formatRange } from './publicBookingTime'

const failure = (status: number, data: unknown) =>
  new AxiosError(String(status), String(status), undefined, undefined, { status, data } as AxiosResponse)

afterEach(() => setActiveLocale('id'))

it('translates a known server code into the page language, numbers included', () => {
  setActiveLocale('en')
  const text = publicErrorText(failure(429, {
    message: 'Terlalu banyak kode salah. Coba lagi dalam 12 menit, atau minta kode ke kasir.',
    error: { code: 'BALANCE_LOCKED' },
    data: { minutes: 12 },
  }), 'bqFailed')
  expect(text).toBe(t('errBalanceLocked', { minutes: 12 }))
  expect(text).toContain('12 minutes')
})

it('falls back to the server sentence for codes it does not know yet', () => {
  setActiveLocale('en')
  expect(publicErrorText(failure(400, { message: 'Pesan baru dari server', error: { code: 'SOMETHING_NEW' } }), 'bmFailed'))
    .toBe('Pesan baru dari server')
  // Pembatasan laju per IP tidak membawa kode alasan.
  expect(publicErrorText(failure(429, { message: 'rate limited' }), 'bmFailed')).toBe(t('pbTooMany'))
})

it('reschedule block code carries its hours', () => {
  setActiveLocale('en')
  expect(codeText('RESCHEDULE_TOO_LATE', { hours: 6 })).toContain('6 hours')
  expect(codeText(undefined)).toBeNull()
})

it('dates follow the page language, times keep the dotted form', () => {
  setActiveLocale('en')
  expect(formatRange('2026-11-03T12:00:00Z', '2026-11-03T14:00:00Z', 'Asia/Jakarta')).toBe('Tuesday 3 November, 19.00–21.00')
  setActiveLocale('id')
  expect(formatRange('2026-11-03T12:00:00Z', '2026-11-03T14:00:00Z', 'Asia/Jakarta')).toBe('Selasa, 3 November, 19.00–21.00')
})
