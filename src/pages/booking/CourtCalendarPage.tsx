import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import {
  getSchedule, formatMinuteOfDay, minuteRangeIn,
  type Booking, type Court,
} from '@/api/booking'
import { useOutletStore } from '@/store/outletStore'
import { formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Warna kotak mengikuti STATUS pemesanan, bukan cabang olahraganya: yang perlu
 *  terbaca sekilas adalah apakah rombongannya sudah datang, bukan mereka main
 *  apa. */
function statusTone(status: string) {
  switch (status) {
    case 'confirmed': return 'bg-blue-100 text-blue-900 border-blue-200'
    case 'ongoing': return 'bg-emerald-100 text-emerald-900 border-emerald-200'
    case 'completed': return 'bg-muted text-muted-foreground border-border'
    default: return 'bg-primary/15 text-foreground border-primary/30'
  }
}

function BookingModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const outstanding = Math.max(0, booking.total_price - booking.deposit_amount)
  const from = new Date(booking.starts_at)
  const to = new Date(booking.ends_at)

  return (
    <Modal open onClose={onClose} title={booking.customer_name || booking.booking_number}>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('bkBookingNumber')}</span>
          <span className="font-medium">{booking.booking_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('bkCourts')}</span>
          <span className="font-medium">{booking.court?.name ?? '-'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('bkToday')}</span>
          <span className="font-medium">
            {from.toLocaleDateString()} {from.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            –{to.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('bkTotal')}</span>
          <span className="font-semibold">{formatCurrency(booking.total_price)}</span>
        </div>
        {booking.deposit_amount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('bkDeposit')}</span>
            <span>{formatCurrency(booking.deposit_amount)}</span>
          </div>
        )}
        {/* Sisa hanya ditampilkan bila memang ADA sisanya: baris "Sisa Rp 0"
            pada pemesanan lunas hanya menambah angka yang harus dibaca. */}
        {outstanding > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('bkOutstanding')}</span>
            <span className="font-semibold text-red-600">{formatCurrency(outstanding)}</span>
          </div>
        )}
        {booking.field_values?.length ? (
          <>
            <div className="h-px bg-border" />
            {booking.field_values.map(field => (
              <div key={field.field_key} className="flex justify-between">
                <span className="text-muted-foreground">{field.label}</span>
                <span>{field.value}</span>
              </div>
            ))}
          </>
        ) : null}
        {booking.note && (
          <p className="text-muted-foreground">{booking.note}</p>
        )}
      </div>
    </Modal>
  )
}

export default function CourtCalendarPage() {
  const outletId = useOutletStore(s => s.selected?.id) ?? ''
  const [date, setDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  })
  const [picked, setPicked] = useState<Booking | null>(null)

  const { data: schedule } = useQuery({
    queryKey: ['court-schedule', outletId, isoDate(date)],
    queryFn: () => getSchedule(outletId, isoDate(date)).then(r => r.data.data),
    enabled: !!outletId,
  })

  const courts: Court[] = schedule?.courts ?? []
  const bookings: Booking[] = (schedule?.bookings ?? []).filter(b => b.status !== 'canceled')

  const shift = (days: number) =>
    setDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days))

  // Baris jam disatukan dari SEMUA lapangan: tempat yang lapangannya buka pada
  // jam berbeda tetap harus punya kisi yang lurus, kalau tidak kotak yang
  // bersebelahan menunjuk jam berbeda.
  const openMinute = courts.length ? Math.min(...courts.map(c => c.open_minute)) : 0
  const closeMinute = courts.length ? Math.max(...courts.map(c => c.close_minute)) : 0
  const step = courts.length ? Math.min(...courts.map(c => c.slot_minutes)) : 60
  const rowCount = step > 0 ? Math.floor((closeMinute - openMinute) / step) : 0

  return (
    <div className="space-y-5">
      <Header title={t('bkCalendar')} />

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => shift(-1)}
          className="rounded-lg border border-border p-2 hover:bg-muted/50">
          <ChevronLeft className="size-4" />
        </button>
        <input type="date" value={isoDate(date)}
          onChange={e => {
            const [y, m, d] = e.target.value.split('-').map(Number)
            if (y && m && d) setDate(new Date(y, m - 1, d))
          }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <button type="button" onClick={() => shift(1)}
          className="rounded-lg border border-border p-2 hover:bg-muted/50">
          <ChevronRight className="size-4" />
        </button>
      </div>

      {courts.length === 0 ? (
        <div className="rounded-xl border border-border p-10 text-center">
          <p className="font-medium">{t('bkNoCourts')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('bkNoCourtsBody')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="w-16 px-2 py-2 text-left text-xs font-medium text-muted-foreground">
                  {formatMinuteOfDay(openMinute)}
                </th>
                {courts.map(court => (
                  <th key={court.id} className="min-w-32 px-2 py-2 text-left">
                    <div className="font-semibold">{court.name}</div>
                    <div className="text-xs font-normal text-muted-foreground">
                      {formatMinuteOfDay(court.open_minute)}–{formatMinuteOfDay(court.close_minute)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowCount }, (_, row) => {
                const minute = openMinute + row * step
                return (
                  <tr key={minute} className="border-b border-border/60 last:border-0">
                    <td className="px-2 py-1 align-top text-xs text-muted-foreground">
                      {formatMinuteOfDay(minute)}
                    </td>
                    {courts.map(court => {
                      // Di luar jam operasional lapangan INI — kotaknya kosong,
                      // bukan bisa dipesan.
                      if (minute < court.open_minute || minute + step > court.close_minute) {
                        return <td key={court.id} className="bg-muted/30 px-2 py-1" />
                      }
                      const occupying = bookings.find(b => {
                        if (b.court_id !== court.id) return false
                        const [start, end] = minuteRangeIn(b, date)
                        // Bersambung bukan bertabrakan: slot 18–19 dan
                        // pemesanan 19–20 tidak saling menyentuh.
                        return minute < end && minute + step > start
                      })
                      if (!occupying) {
                        return (
                          <td key={court.id} className="px-2 py-1 text-xs text-muted-foreground/60">
                            {t('bkSlotFree')}
                          </td>
                        )
                      }
                      const [start] = minuteRangeIn(occupying, date)
                      const isFirstCell = start >= minute && start < minute + step
                      return (
                        <td key={court.id} className="p-1">
                          <button type="button" onClick={() => setPicked(occupying)}
                            className={`h-full w-full rounded border px-2 py-1 text-left text-xs ${statusTone(occupying.status)}`}>
                            {/* Hanya kotak PERTAMA memuat namanya, supaya sewa
                                dua jam terbaca sebagai satu blok. */}
                            {isFirstCell && (
                              <>
                                <div className="font-semibold">
                                  {occupying.customer_name || occupying.booking_number}
                                </div>
                                <div>{t(`bkStatus${occupying.status}` as never)}</div>
                              </>
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {picked && <BookingModal booking={picked} onClose={() => setPicked(null)} />}
    </div>
  )
}
