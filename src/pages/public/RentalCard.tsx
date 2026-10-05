import { useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Clock, Gamepad2, Minus, Plus, QrCode, ReceiptText, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  extendPublicRental,
  getPublicRental,
  startPublicRental,
  type PublicRental,
  type PublicRentalPayment,
  type PublicRentalSession,
} from '@/api/public'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { displayedText as titleCase } from '@/lib/textCase'
import { loadContact } from '@/lib/publicOrderHistory'

/** Peringatan "hampir habis" muncul di sisa waktu ini. */
const WARN_SECONDS = 10 * 60
/** Selang memuat ulang keadaan meja dari server. Hitungan detiknya lokal. */
const POLL_MS = 15_000

const pad = (n: number) => String(n).padStart(2, '0')

/** 3725 → "1:02:05"; di bawah satu jam → "02:05". */
const clock = (totalSeconds: number) => {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`
}

/** 90 → "1 jam 30 menit". */
const duration = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const parts = []
  if (h > 0) parts.push(t('rentalHours', { n: h }))
  if (m > 0 || h === 0) parts.push(t('rentalMinutes', { n: m }))
  return parts.join(' ')
}

const ceilTo = (minutes: number, step: number) => Math.ceil(minutes / Math.max(1, step)) * Math.max(1, step)

/**
 * Biaya sewa pada detik ini — cermin TimerSession.Bill di server, supaya angka
 * di HP bergerak halus di antara dua pemuatan. Yang mengikat tetap angka server
 * saat kasir menghentikan meja.
 */
const liveAmount = (s: PublicRentalSession, elapsedSeconds: number) => {
  const elapsedMin = elapsedSeconds / 60
  if (s.mode === 'PAKET') {
    if (s.planned_minutes < 1) return 0
    const over = elapsedMin - s.planned_minutes
    const billed = s.planned_minutes + (over > 0 ? ceilTo(over, s.round_minutes) : 0)
    return Math.round(billed * (s.package_price / s.planned_minutes))
  }
  const billed = Math.max(ceilTo(elapsedMin, s.round_minutes), s.min_minutes)
  return Math.round((billed * s.price_per_hour) / 60)
}

/**
 * Kartu waktu meja rental (PS, biliar) di halaman QR.
 *
 * Keadaannya diambil dari server per MEJA, bukan dari penyimpanan HP: muat
 * ulang, ganti browser, atau HP teman semeja menampilkan sesi dan pesanan yang
 * sama.
 */
export default function RentalCard({ token, tableNumber, initial, renderPay }: {
  token: string
  tableNumber: string
  initial: PublicRental
  /** Layar bayar QRIS milik halaman menu (PickupPay) untuk nota [orderId]. */
  renderPay: (orderId: string) => ReactNode
}) {
  const [mountedAt] = useState(() => Date.now())
  const { data, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['public-rental', token],
    queryFn: async () => (await getPublicRental(token)).data.data,
    initialData: initial,
    initialDataUpdatedAt: mountedAt,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  })
  const rental = data ?? initial

  // Selisih jam HP terhadap server: jam server saat jawaban dibuat dikurangi
  // jam HP saat jawaban itu diterima.
  const offset = new Date(rental.server_time).getTime() - dataUpdatedAt

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const serverNow = now + offset

  // Layar bayar terbuka hanya selama pembayarannya masih menunggu: begitu
  // lunas, pending_payment hilang dari jawaban server dan layar ini menutup
  // sendiri — mejanya sudah menyala di baliknya.
  const [payingOrder, setPayingOrder] = useState<string | null>(null)
  const pending = rental.pending_payment
  const showPay = !!payingOrder && pending?.order_id === payingOrder
  const onChanged = (next?: PublicRental) => {
    void refetch()
    if (next?.pending_payment && !next.pending_payment.claimed) setPayingOrder(next.pending_payment.order_id)
  }

  const session = rental.session
  const startPending = pending?.kind === 'START' && (!session || session.status === 'CANCELED')
  return (
    <div className="bg-white rounded-2xl ring-1 ring-gray-200/70 overflow-hidden">
      {showPay && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-50">
          <button
            onClick={() => setPayingOrder(null)}
            className="fixed top-3 left-3 z-10 flex items-center gap-1 rounded-full bg-white/90 ring-1 ring-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm"
          >
            <ArrowLeft size={14} /> {t('rentalBackToMenu')}
          </button>
          {renderPay(payingOrder)}
        </div>
      )}
      <div className="flex items-center gap-3 px-3.5 pt-3.5">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <Gamepad2 size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 truncate">
            {tableNumber.toUpperCase()} · {titleCase(rental.product.name)}
          </p>
          <p className="text-xs text-gray-500">
            {rental.product.mode === 'METER'
              ? t('rentalRateHour', { price: formatCurrency(rental.product.price) })
              : t('rentalRatePackage', { price: formatCurrency(rental.product.price), duration: duration(rental.product.package_minutes) })}
          </p>
        </div>
      </div>

      <div className="p-3.5">
        {startPending && pending ? (
          <PendingPayment payment={pending} onPay={() => setPayingOrder(pending.order_id)} />
        ) : !session || session.status === 'CANCELED' ? (
          <StartForm token={token} rental={rental} rejected={session} onChanged={onChanged} />
        ) : session.status === 'REQUESTED' ? (
          <Waiting session={session} />
        ) : (
          <Running
            token={token}
            rental={rental}
            session={session}
            serverNow={serverNow}
            onChanged={onChanged}
            onPay={(orderId) => setPayingOrder(orderId)}
          />
        )}
      </div>

      {session && session.status !== 'CANCELED' && session.orders.length > 0 && (
        <Orders session={session} serverNow={serverNow} />
      )}
    </div>
  )
}

function StartForm({ token, rental, rejected, onChanged }: {
  token: string
  rental: PublicRental
  rejected: PublicRentalSession | null
  onChanged: (next?: PublicRental) => void
}) {
  const [packages, setPackages] = useState(1)
  const [name, setName] = useState(() => loadContact().name)
  const isPackage = rental.product.mode === 'PAKET'
  const canPrepay = isPackage && rental.prepay_available
  const start = useMutation({
    mutationFn: async (prepay: boolean) => (await startPublicRental(token, {
      packages: isPackage ? packages : undefined,
      customer_name: name.trim() || null,
      prepay,
    })).data.data,
    onSuccess: (next) => onChanged(next),
    onError: (err) => {
      toast.error(getErrorMessage(err))
      onChanged()
    },
  })

  return (
    <div className="space-y-3">
      {rejected ? (
        <div className="flex gap-2 rounded-xl bg-red-50 text-red-700 px-3 py-2.5 text-sm">
          <XCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{t('rentalRejected')}</p>
            {rejected.note && <p className="text-xs text-red-600/90">{rejected.note}</p>}
          </div>
        </div>
      ) : (
        <p className="text-sm font-semibold text-emerald-700">{t('rentalReadyTitle')}</p>
      )}

      {isPackage && (
        <PackageStepper rental={rental} packages={packages} onChange={setPackages} />
      )}
      {!isPackage && rental.product.min_minutes > 0 && (
        <p className="text-xs text-gray-500">{t('rentalMinCharge', { duration: duration(rental.product.min_minutes) })}</p>
      )}

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('rentalNamePlaceholder')}
        maxLength={60}
        className="w-full px-3 py-2 text-sm bg-gray-50 rounded-xl ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
      />
      {canPrepay && (
        <button
          onClick={() => start.mutate(true)}
          disabled={start.isPending}
          className="w-full rounded-2xl py-3 font-semibold bg-indigo-600 text-white active:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <QrCode size={16} /> {t('rentalPayAndStart')}
        </button>
      )}
      <button
        onClick={() => start.mutate(false)}
        disabled={start.isPending}
        className={`w-full rounded-2xl py-3 font-semibold disabled:opacity-60 ${canPrepay
          ? 'bg-white text-indigo-700 ring-1 ring-gray-200 active:bg-gray-50'
          : 'bg-indigo-600 text-white active:bg-indigo-700'}`}
      >
        {canPrepay ? t('rentalAskCashier') : rejected ? t('rentalTryAgain') : t('rentalStart')}
      </button>
      <p className="text-[11px] text-gray-400 text-center">{canPrepay ? t('rentalPrepayHint') : t('rentalStartHint')}</p>
    </div>
  )
}

function PackageStepper({ rental, packages, onChange }: {
  rental: PublicRental
  packages: number
  onChange: (n: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-gray-700">{t('rentalPackages')}</p>
        <p className="text-xs text-gray-500">
          {t('rentalTotalDuration', { duration: duration(rental.product.package_minutes * packages) })}
          {' · '}{formatCurrency(rental.product.price * packages)}
        </p>
      </div>
      <div className="flex items-center gap-1 bg-gray-100 rounded-full p-0.5">
        <button onClick={() => onChange(Math.max(1, packages - 1))} aria-label="-"
          className="w-8 h-8 rounded-full flex items-center justify-center active:bg-gray-200 disabled:opacity-40" disabled={packages <= 1}>
          <Minus size={14} />
        </button>
        <span className="min-w-6 text-center text-sm font-bold">{packages}</span>
        <button onClick={() => onChange(Math.min(rental.product.max_packages, packages + 1))} aria-label="+"
          className="w-8 h-8 rounded-full flex items-center justify-center active:bg-gray-200 disabled:opacity-40" disabled={packages >= rental.product.max_packages}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

/** Paket (atau perpanjangan) yang menunggu dibayar QRIS. */
function PendingPayment({ payment, onPay }: { payment: PublicRentalPayment; onPay: () => void }) {
  const until = new Date(payment.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (
    <div className="rounded-xl bg-amber-50 px-3 py-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-amber-800">
            {payment.kind === 'START' ? t('rentalAwaitingPayment') : t('rentalAwaitingPaymentExtend')}
          </p>
          <p className="text-xs text-amber-700/80">
            {duration(payment.minutes)} · {formatCurrency(payment.amount)}
          </p>
        </div>
        <QrCode size={18} className="text-amber-700 shrink-0" />
      </div>
      {payment.claimed ? (
        <p className="text-xs font-semibold text-amber-800">{t('rentalPaymentChecking')}</p>
      ) : (
        <>
          <button onClick={onPay} className="w-full rounded-xl py-2.5 text-sm font-semibold bg-indigo-600 text-white active:bg-indigo-700">
            {t('rentalPayNow')}
          </button>
          <p className="text-[11px] text-amber-700/80 text-center">{t('rentalPayUntil', { time: until })}</p>
        </>
      )}
    </div>
  )
}

/** Perpanjang paket yang sedang berjalan: bayar QRIS sekarang, atau minta kasir. */
function ExtendForm({ token, rental, onChanged }: {
  token: string
  rental: PublicRental
  onChanged: (next?: PublicRental) => void
}) {
  const [open, setOpen] = useState(false)
  const [packages, setPackages] = useState(1)
  const extend = useMutation({
    mutationFn: async (prepay: boolean) => (await extendPublicRental(token, { packages, prepay })).data.data,
    onSuccess: (next) => {
      setOpen(false)
      onChanged(next)
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
      onChanged()
    },
  })

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full rounded-xl py-2.5 text-sm font-semibold bg-white text-indigo-700 ring-1 ring-gray-200 active:bg-gray-50 flex items-center justify-center gap-1.5">
        <Plus size={15} /> {t('rentalExtend')}
      </button>
    )
  }
  return (
    <div className="rounded-xl ring-1 ring-gray-200 p-3 space-y-2.5">
      <PackageStepper rental={rental} packages={packages} onChange={setPackages} />
      <div className="flex gap-2">
        <button onClick={() => extend.mutate(false)} disabled={extend.isPending}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-white text-indigo-700 ring-1 ring-gray-200 disabled:opacity-60">
          {t('rentalExtendAsk')}
        </button>
        {rental.prepay_available && (
          <button onClick={() => extend.mutate(true)} disabled={extend.isPending}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-indigo-600 text-white disabled:opacity-60">
            {t('rentalExtendPay')}
          </button>
        )}
      </div>
    </div>
  )
}

function Waiting({ session }: { session: PublicRentalSession }) {
  const until = session.request_expires_at
    ? new Date(session.request_expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null
  return (
    <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-3 py-3">
      <div className="w-6 h-6 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin shrink-0" />
      <div>
        <p className="text-sm font-semibold text-amber-800">{t('rentalWaiting')}</p>
        {until && <p className="text-xs text-amber-700/80">{t('rentalWaitingHint', { time: until })}</p>}
      </div>
    </div>
  )
}

function Running({ token, rental, session, serverNow, onChanged, onPay }: {
  token: string
  rental: PublicRental
  session: PublicRentalSession
  serverNow: number
  onChanged: (next?: PublicRental) => void
  onPay: (orderId: string) => void
}) {
  const startedAt = session.started_at ? new Date(session.started_at).getTime() : serverNow
  const stopped = session.status === 'STOPPED'
  const endAt = stopped && session.ended_at ? new Date(session.ended_at).getTime() : serverNow
  const elapsed = Math.max(0, (endAt - startedAt) / 1000)
  const isPackage = session.mode === 'PAKET' && session.planned_minutes > 0
  const remaining = isPackage ? session.planned_minutes * 60 - elapsed : 0
  const over = isPackage && remaining < 0
  const warn = isPackage && !over && remaining <= WARN_SECONDS
  const amount = stopped ? session.rental_amount : liveAmount(session, elapsed)

  let label = t('rentalElapsed')
  let big = clock(elapsed)
  if (stopped) {
    label = t('rentalStopped')
  } else if (over) {
    label = t('rentalOvertime')
    big = `+${clock(-remaining)}`
  } else if (isPackage) {
    label = t('rentalRemaining')
    big = clock(remaining)
  }

  const tone = stopped ? 'bg-gray-50 text-gray-900' : over ? 'bg-red-50 text-red-700' : warn ? 'bg-amber-50 text-amber-800' : 'bg-indigo-50 text-indigo-900'

  return (
    <div className="space-y-2.5">
      <div className={`rounded-2xl px-4 py-3.5 ${tone}`}>
        <p className="text-xs font-semibold opacity-80 flex items-center gap-1"><Clock size={13} /> {label}</p>
        <p className="text-4xl font-bold tabular-nums tracking-tight mt-0.5" aria-live="off">{big}</p>
        {isPackage && !stopped && (
          <p className="text-xs opacity-80 mt-1">
            {t('rentalElapsed')} {clock(elapsed)} / {duration(session.planned_minutes)}
          </p>
        )}
        {stopped && <p className="text-xs opacity-80 mt-1">{duration(Math.round(elapsed / 60))}</p>}
      </div>
      {(warn || over) && (
        <p className={`flex gap-1.5 text-xs ${over ? 'text-red-700' : 'text-amber-800'}`}>
          <AlertTriangle size={14} className="shrink-0 mt-px" />
          {over ? t('rentalOverHint') : t('rentalAlmostOver')}
        </p>
      )}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">{stopped ? t('rentalCost') : t('rentalCostSoFar')}</span>
        <span className="font-bold tabular-nums">{formatCurrency(amount)}</span>
      </div>
      {session.prepaid_amount > 0 && (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{t('rentalPrepaid')}</span>
            <span className="tabular-nums text-emerald-700">−{formatCurrency(session.prepaid_amount)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{t('rentalDue')}</span>
            <span className="font-bold tabular-nums">{formatCurrency(Math.max(0, amount - session.prepaid_amount))}</span>
          </div>
        </>
      )}
      {stopped && <p className="text-sm font-semibold text-gray-700">{t('rentalStoppedHint')}</p>}
      {!stopped && isPackage && (
        rental.pending_payment?.kind === 'EXTEND' ? (
          <PendingPayment payment={rental.pending_payment} onPay={() => onPay(rental.pending_payment!.order_id)} />
        ) : session.extend_request_minutes > 0 ? (
          <p className="text-xs font-semibold text-amber-800 bg-amber-50 rounded-xl px-3 py-2">
            {t('rentalExtendWaiting', { duration: duration(session.extend_request_minutes) })}
          </p>
        ) : (
          <ExtendForm token={token} rental={rental} onChanged={onChanged} />
        )
      )}
    </div>
  )
}

function Orders({ session, serverNow }: { session: PublicRentalSession; serverNow: number }) {
  const startedAt = session.started_at ? new Date(session.started_at).getTime() : serverNow
  const endAt = session.status === 'STOPPED' && session.ended_at ? new Date(session.ended_at).getTime() : serverNow
  const rentalAmount = session.status === 'REQUESTED'
    ? 0
    : session.status === 'STOPPED' ? session.rental_amount : liveAmount(session, Math.max(0, (endAt - startedAt) / 1000))

  return (
    <div className="border-t border-gray-100 px-3.5 py-3 space-y-2">
      <p className="text-xs font-bold text-gray-900 flex items-center gap-1"><ReceiptText size={13} /> {t('rentalOrdersTitle')}</p>
      {session.orders.map((order) => (
        <div key={order.id} className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-gray-400">
              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${order.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {order.status === 'pending' ? t('rentalOrderPending') : t('rentalOrderAccepted')}
            </span>
          </div>
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-700 truncate pr-2">{item.quantity}× {titleCase(item.name)}</span>
              <span className="tabular-nums text-gray-900">{formatCurrency(item.total)}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="flex justify-between text-sm pt-1.5 border-t border-dashed border-gray-200">
        <span className="font-semibold text-gray-700">{t('rentalGrandTotal')}</span>
        <span className="font-bold tabular-nums">{formatCurrency(Math.max(0, rentalAmount - session.prepaid_amount) + session.orders_total)}</span>
      </div>
    </div>
  )
}
