import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { CalendarCheck, CalendarDays, CheckCircle2, MessageCircle } from 'lucide-react'
import {
  createPublicBooking,
  getPublicBooking,
  type PublicBookingCourt,
  type PublicBookingResult,
} from '@/api/public'
import { formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { addDays, contactUrl, durationText, formatRange, freeStarts, hhmm, todayIn, wallToIso, zoneOffset } from './publicBookingTime'

/** Pilihan durasi: kelipatan slot, sampai 4 jam. */
const durationsFor = (court: PublicBookingCourt) => {
  const step = court.slot_minutes > 0 ? court.slot_minutes : 60
  const out: number[] = []
  for (let d = step; d <= Math.min(240, court.close_minute - court.open_minute); d += step) out.push(d)
  return out
}


/**
 * Booking online — link per outlet yang dibagikan pemilik (bio IG, status WA).
 *
 * Pelanggan memilih tanggal, lapangan/stylist, jam, lalu mengisi nama dan nomor
 * WhatsApp. Tanpa pembayaran: kasir yang mengonfirmasi dan menagih lewat
 * kalender booking di aplikasi.
 */
export default function PublicBookingPage() {
  const { token = '' } = useParams()
  const [date, setDate] = useState<string | null>(null)
  const [courtId, setCourtId] = useState<string | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [start, setStart] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [done, setDone] = useState<PublicBookingResult | null>(null)

  const query = useQuery({
    queryKey: ['public-booking', token, date],
    queryFn: () => getPublicBooking(token, date ?? '').then((r) => r.data.data),
    enabled: !!token,
    retry: false,
  })
  const info = query.data

  const today = info ? todayIn(info.timezone) : null
  const selectedDate = date ?? info?.date ?? ''
  const court = info?.courts.find((c) => c.id === courtId) ?? info?.courts[0]
  const durations = court ? durationsFor(court) : []
  const dur = duration && durations.includes(duration)
    ? duration
    : durations.find((d) => d === 60) ?? durations[0] ?? 60
  const starts = info && court ? freeStarts(info, court, dur) : []

  const book = useMutation({
    mutationFn: () => {
      if (!info || !court || start == null) throw new Error('incomplete')
      const offset = zoneOffset(info.timezone, new Date(`${info.date}T12:00:00Z`))
      return createPublicBooking(token, {
        court_id: court.id,
        starts_at: wallToIso(info.date, start, offset),
        ends_at: wallToIso(info.date, start + dur, offset),
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        note: note.trim() || undefined,
      }).then((r) => r.data.data)
    },
    onSuccess: (r) => setDone(r),
    onError: () => { void query.refetch() },
  })

  if (query.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }
  if (!info) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center mb-4">
          <CalendarDays size={30} />
        </div>
        <p className="text-sm text-gray-600">{t('pbInvalid')}</p>
      </div>
    )
  }

  const header = (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
      <div className="max-w-2xl mx-auto px-4 pt-3.5 pb-6 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold leading-tight truncate">{info.store_name}</h1>
          <p className="text-xs text-white/80 truncate">{info.outlet_name}</p>
        </div>
        <span className="shrink-0 flex items-center gap-1 text-xs font-semibold bg-white/15 ring-1 ring-white/25 rounded-full px-3 py-1">
          <CalendarCheck size={13} /> {t('pbTitle')}
        </span>
      </div>
    </div>
  )

  // Jalur pelanggan ke toko: tanpa ini, pemesan yang ingin bertanya atau
  // mengubah jadwal harus mencari sendiri nomor tokonya.
  const contact = info.contact_phone ? (
    <a
      href={contactUrl(info.contact_phone, t('pbContactText', { store: info.store_name }))}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold ring-1 ring-emerald-200"
    >
      <MessageCircle size={16} /> {t('pbContact')}
    </a>
  ) : null

  if (done) {
    const time = formatRange(done.starts_at, done.ends_at, info.timezone)
    return (
      <div className="min-h-screen bg-gray-50 pb-10">
        {header}
        <div className="max-w-2xl mx-auto px-4 -mt-4">
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/70 p-5 text-center space-y-2">
            <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
            <h2 className="text-lg font-bold text-gray-900">{t('pbSuccessTitle')}</h2>
            <p className="text-sm font-semibold text-gray-800">{t('pbSummary', { court: done.court_name, time })}</p>
            {done.total_price > 0 && (
              <p className="text-sm text-gray-600">{t('pbEstimate')}: <b>{formatCurrency(done.total_price)}</b></p>
            )}
            <p className="text-sm text-gray-600">{t('pbSuccessBody', { number: done.booking_number })}</p>
            {done.manage_url && (
              <div className="pt-1 space-y-1">
                <a
                  href={done.manage_url}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold"
                >
                  <CalendarDays size={16} /> {t('pbManage')}
                </a>
                <p className="text-xs text-gray-500">{t('pbManageHint')}</p>
              </div>
            )}
            {contact}
            <button
              type="button"
              onClick={() => { setDone(null); setStart(null); book.reset(); void query.refetch() }}
              className="mt-2 px-4 py-2 text-sm font-semibold rounded-xl bg-blue-50 text-blue-700"
            >
              {t('pbAgain')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const submitError = book.isError
    ? isAxiosError(book.error)
      ? book.error.response?.status === 429
        ? t('pbTooMany')
        : (book.error.response?.data as { message?: string } | undefined)?.message || t('pbFailed')
      : t('pbFailed')
    : null
  const canSubmit = !!court && start != null && name.trim().length > 0 && phone.trim().length >= 9 && !book.isPending

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (canSubmit) book.mutate()
  }

  const chip = (active: boolean) =>
    `px-3 py-2 rounded-xl text-sm font-semibold ring-1 transition ${
      active ? 'bg-blue-600 text-white ring-blue-600' : 'bg-white text-gray-800 ring-gray-200 hover:ring-blue-300'}`

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {header}
      <form onSubmit={submit} className="max-w-2xl mx-auto px-4 -mt-4 space-y-3">
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/70 p-4 space-y-2">
          <label className="block text-xs font-semibold text-gray-500" htmlFor="pb-date">{t('pbDate')}</label>
          <input
            id="pb-date"
            type="date"
            value={selectedDate}
            min={today ?? undefined}
            max={today ? addDays(today, 90) : undefined}
            onChange={(e) => { if (e.target.value) { setDate(e.target.value); setStart(null) } }}
            className="w-full px-3 py-2 text-sm bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/70 p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500">{t('pbPickCourt')}</p>
          <div className="flex flex-wrap gap-2">
            {info.courts.map((c) => (
              <button key={c.id} type="button" className={chip(c.id === court?.id)}
                onClick={() => { setCourtId(c.id); setStart(null) }}>
                <span className="block">{c.name}</span>
                {c.hourly_rate > 0 && (
                  <span className="block text-[11px] font-normal opacity-80">
                    {t('pbRate', { price: formatCurrency(c.hourly_rate) })}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {court && (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/70 p-4 space-y-3">
            {durations.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500">{t('pbDuration')}</p>
                <div className="flex flex-wrap gap-2">
                  {durations.map((d) => (
                    <button key={d} type="button" className={chip(d === dur)}
                      onClick={() => { setDuration(d); setStart(null) }}>
                      {durationText(d)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500">{t('pbPickTime')}</p>
              {query.isFetching ? (
                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              ) : starts.length === 0 ? (
                <p className="text-sm text-gray-500">{t('pbNoSlot')}</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {starts.map((m) => (
                    <button key={m} type="button" className={chip(m === start)} onClick={() => setStart(m)}>
                      {hhmm(m)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {start != null && court && (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/70 p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-900">
              {t('pbSummary', { court: court.name, time: `${hhmm(start)}–${hhmm(start + dur)}` })}
            </p>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('pbName')}
              maxLength={160} autoComplete="name"
              className="w-full px-3 py-2 text-sm bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('pbPhone')}
              maxLength={40} inputMode="tel" autoComplete="tel"
              className="w-full px-3 py-2 text-sm bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('pbNote')}
              maxLength={300} rows={2}
              className="w-full px-3 py-2 text-sm bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            <button type="submit" disabled={!canSubmit}
              className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50">
              {book.isPending ? t('pbSubmitting') : t('pbSubmit')}
            </button>
          </div>
        )}
        {contact}
      </form>
    </div>
  )
}
