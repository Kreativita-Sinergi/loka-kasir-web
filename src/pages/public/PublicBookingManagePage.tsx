import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CalendarClock, CalendarDays, CheckCircle2, Info, MessageCircle } from 'lucide-react'
import {
  cancelPublicBooking,
  getBookingManage,
  reschedulePublicBooking,
  type PublicManagedBooking,
} from '@/api/public'
import { formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'
import type { MessageKey } from '@/lib/messages'
import {
  addDays,
  contactUrl,
  durationText,
  formatRange,
  slotOptions,
  hhmm,
  todayIn,
  wallDate,
  wallMinute,
  wallToIso,
  zoneOffset,
} from './publicBookingTime'
import { codeText, publicErrorText } from './publicErrors'
import { SlotPicker } from './BookingParts'

const statusLabel: Record<string, MessageKey> = {
  booked: 'bmStatusBooked',
  confirmed: 'bmStatusConfirmed',
  ongoing: 'bmStatusOngoing',
  completed: 'bmStatusCompleted',
  canceled: 'bmStatusCanceled',
}



/**
 * Kelola booking — link rahasia per booking yang diterima pelanggan setelah
 * memesan online (atau lewat WhatsApp dari kasir).
 *
 * Pelanggan melihat jadwalnya, menghubungi toko, dan memindahkan jadwalnya
 * sendiri bila toko mengizinkan. Durasinya tetap: menambah jam main adalah
 * pesanan berbeda yang harganya perlu disetujui toko.
 */
export default function PublicBookingManagePage() {
  const { token = '' } = useParams()
  const [date, setDate] = useState<string | null>(null)
  const [courtId, setCourtId] = useState<string | null>(null)
  const [start, setStart] = useState<number | null>(null)
  const [moved, setMoved] = useState<PublicManagedBooking | null>(null)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [canceled, setCanceled] = useState(false)

  const query = useQuery({
    queryKey: ['booking-manage', token, date],
    queryFn: () => getBookingManage(token, date ?? '').then((r) => r.data.data),
    enabled: !!token,
    retry: false,
  })
  const info = query.data

  const booking = info?.booking
  const tz = info?.timezone ?? 'Asia/Jakarta'
  const duration = booking ? Math.round((Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) / 60000) : 0
  const court = info?.courts.find((c) => c.id === (courtId ?? booking?.court_id)) ?? info?.courts[0]
  const schedule = info?.date ? { date: info.date, timezone: tz, busy: info.busy } : null
  // Jadwal yang sekarang tidak ditawarkan sebagai tujuan pindah.
  const isCurrent = (m: number) =>
    !!booking && !!schedule && court?.id === booking.court_id &&
    schedule.date === wallDate(booking.starts_at, tz) && m === wallMinute(booking.starts_at, tz)
  const options = schedule && court ? slotOptions(schedule, court, duration).filter((o) => !isCurrent(o.minute)) : []

  const target = () => {
    if (!schedule || !court || start == null) throw new Error('incomplete')
    const offset = zoneOffset(tz, new Date(`${schedule.date}T12:00:00Z`))
    return {
      court_id: court.id,
      starts_at: wallToIso(schedule.date, start, offset),
      ends_at: wallToIso(schedule.date, start + duration, offset),
    }
  }

  // Harga jadwal baru dihitung server lebih dulu: pindah ke prime time bisa
  // menaikkan biayanya, dan pelanggan harus tahu sebelum menekan pindahkan.
  const preview = useQuery({
    queryKey: ['booking-manage-preview', token, court?.id, schedule?.date, start],
    queryFn: () => reschedulePublicBooking(token, { ...target(), preview: true }).then((r) => r.data.data),
    enabled: start != null && !!court && !!schedule,
    retry: false,
  })

  const move = useMutation({
    mutationFn: () => reschedulePublicBooking(token, target()).then((r) => r.data.data),
    onSuccess: (r) => {
      setMoved(r.booking ?? null)
      setStart(null)
      setDate(null)
      setCourtId(null)
      void query.refetch()
    },
    onError: () => { void query.refetch() },
  })

  // Batal butuh dua ketukan: slotnya langsung dilepas dan tidak bisa
  // dikembalikan. Bukan window.confirm — dialog bawaan peramban di HP mudah
  // tertutup tanpa sengaja dan tidak bisa diterjemahkan.
  const cancel = useMutation({
    mutationFn: () => cancelPublicBooking(token).then((r) => r.data.data),
    onSuccess: () => {
      setCanceled(true)
      setConfirmingCancel(false)
      setStart(null)
      void query.refetch()
    },
  })

  if (query.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }
  if (!info || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center mb-4">
          <CalendarDays size={30} />
        </div>
        <p className="text-sm text-gray-600">{t('bmInvalid')}</p>
      </div>
    )
  }

  const time = formatRange(booking.starts_at, booking.ends_at, tz)
  const cancelNote = info.cancel_block_code === 'CANCEL_HAS_PAYMENT' || info.cancel_block_code === 'CANCEL_TOO_LATE'
    ? codeText(info.cancel_block_code, info.cancel_block_params) ?? info.cancel_block
    : null
  const today = todayIn(tz)
  const chip = (active: boolean) =>
    `px-3 py-2 rounded-xl text-sm font-semibold ring-1 transition ${
      active ? 'bg-blue-600 text-white ring-blue-600' : 'bg-white text-gray-800 ring-gray-200 hover:ring-blue-300'}`
  const card = 'bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/70 p-4'

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
        <div className="max-w-2xl mx-auto px-4 pt-3.5 pb-6 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold leading-tight truncate">{info.store_name}</h1>
            <p className="text-xs text-white/80 truncate">{info.outlet_name}</p>
          </div>
          <span className="shrink-0 flex items-center gap-1 text-xs font-semibold bg-white/15 ring-1 ring-white/25 rounded-full px-3 py-1">
            <CalendarClock size={13} /> {t('bmTitle')}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-3">
        {canceled && (
          <div className="bg-gray-100 ring-1 ring-gray-200 rounded-2xl p-4 flex gap-3">
            <CheckCircle2 size={22} className="shrink-0 text-gray-600" />
            <p className="text-sm text-gray-800 font-semibold">{t('bmCanceled')}</p>
          </div>
        )}
        {moved && !canceled && (
          <div className="bg-emerald-50 ring-1 ring-emerald-200 rounded-2xl p-4 flex gap-3">
            <CheckCircle2 size={22} className="shrink-0 text-emerald-600" />
            <p className="text-sm text-emerald-800 font-semibold">{t('bmMoved')}</p>
          </div>
        )}

        <div className={`${card} space-y-1`}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500">{t('bmNumber', { number: booking.booking_number })}</p>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
              {t(statusLabel[booking.status] ?? 'bmStatusBooked')}
            </span>
          </div>
          <p className="text-base font-bold text-gray-900">{booking.customer_name}</p>
          <p className="text-sm font-semibold text-gray-800">{t('pbSummary', { court: booking.court_name, time })}</p>
          {booking.total_price > 0 && (
            <p className="text-sm text-gray-600">
              {t('pbEstimate')}: <b>{formatCurrency(booking.total_price)}</b>
              {booking.deposit_amount > 0 && <> · {t('bmPaid')} {formatCurrency(booking.deposit_amount)}</>}
            </p>
          )}
        </div>

        {info.contact_phone && (
          <a
            href={contactUrl(info.contact_phone, t('bmContactText', {
              store: info.store_name, name: booking.customer_name, number: booking.booking_number, time,
            }))}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold ring-1 ring-emerald-200"
          >
            <MessageCircle size={16} /> {t('pbContact')}
          </a>
        )}

        {!info.can_reschedule ? (
          info.reschedule_block && (
            <div className="bg-gray-100 rounded-2xl p-4 flex gap-3">
              <Info size={18} className="shrink-0 text-gray-500 mt-0.5" />
              <p className="text-sm text-gray-700">
                {codeText(info.reschedule_block_code, info.reschedule_block_params) ?? info.reschedule_block}
              </p>
            </div>
          )
        ) : (
          <div className={`${card} space-y-3`}>
            <div>
              <p className="text-sm font-bold text-gray-900">{t('bmReschedule')}</p>
              <p className="text-xs text-gray-500">
                {t('bmRescheduleRules', {
                  left: info.reschedule_left, hours: info.reschedule_min_hours, duration: durationText(duration),
                })}
              </p>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-500" htmlFor="bm-date">{t('pbDate')}</label>
              <input
                id="bm-date"
                type="date"
                value={schedule?.date ?? ''}
                min={today}
                max={addDays(today, 90)}
                onChange={(e) => { if (e.target.value) { setDate(e.target.value); setStart(null) } }}
                className="w-full px-3 py-2 text-sm bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {info.courts.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500">{t('pbPickCourt')}</p>
                <div className="flex flex-wrap gap-2">
                  {info.courts.map((c) => (
                    <button key={c.id} type="button" className={chip(c.id === court?.id)}
                      onClick={() => { setCourtId(c.id); setStart(null) }}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500">{t('pbPickTime')}</p>
              {query.isFetching ? (
                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <SlotPicker options={options} selected={start} onSelect={setStart} />
              )}
            </div>

            {start != null && court && (
              <div className="pt-1 space-y-2">
                {preview.data && (
                  <p className="text-sm text-gray-700">
                    {t('bmNewPrice')}: <b>{formatCurrency(preview.data.total_price)}</b>
                    {preview.data.total_price !== preview.data.previous_total && (
                      <span className="text-gray-500"> ({t('bmPrevPrice', { price: formatCurrency(preview.data.previous_total) })})</span>
                    )}
                  </p>
                )}
                {(preview.isError || move.isError) && (
                  <p className="text-sm text-red-600">{publicErrorText(move.isError ? move.error : preview.error, 'bmFailed')}</p>
                )}
                <button
                  type="button"
                  disabled={!preview.data || move.isPending}
                  onClick={() => move.mutate()}
                  className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50"
                >
                  {move.isPending
                    ? t('bmMoving')
                    : t('bmConfirm', { time: `${court.name} · ${hhmm(start)}–${hhmm(start + duration)}` })}
                </button>
              </div>
            )}
          </div>
        )}

        {info.can_cancel ? (
          <div className={`${card} space-y-3`}>
            {confirmingCancel ? (
              <>
                <p className="text-sm text-gray-800">{t('bmCancelConfirm', { number: booking.booking_number })}</p>
                {cancel.isError && <p className="text-sm text-red-600">{publicErrorText(cancel.error, 'bmCancelFailed')}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setConfirmingCancel(false); cancel.reset() }}
                    className="flex-1 py-2.5 rounded-xl bg-white ring-1 ring-gray-200 text-sm font-semibold text-gray-700">
                    {t('bmCancelKeep')}
                  </button>
                  <button type="button" disabled={cancel.isPending} onClick={() => cancel.mutate()}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-50">
                    {cancel.isPending ? t('bmCanceling') : t('bmCancelYes')}
                  </button>
                </div>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmingCancel(true)}
                className="w-full py-2.5 rounded-xl bg-white ring-1 ring-red-200 text-sm font-semibold text-red-600">
                {t('bmCancel')}
              </button>
            )}
          </div>
        ) : cancelNote && (
          // Hanya alasan yang menunjuk jalan keluar (ada pembayaran, terlalu
          // mepet). Booking yang sudah batal/selesai sudah dijelaskan di atas.
          <p className="text-xs text-gray-500 px-1">{cancelNote}</p>
        )}
      </div>
    </div>
  )
}
