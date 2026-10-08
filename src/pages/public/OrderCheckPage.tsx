import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { QrCode, ReceiptText, Search, X } from 'lucide-react'
import {
  getOrderCheck,
  lookupOrderCheck,
  type PublicCheckListOrder,
  type PublicCheckOrder,
} from '@/api/public'
import { formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { displayedText as titleCase } from '@/lib/textCase'

/** Selang memuat ulang: pesanan baru dan yang sudah dibayar ikut berubah. */
const REFRESH_MS = 15_000

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?'

/** 250 → "250 g", 1500 → "1,5 kg". */
const grams = (g: number) =>
  g >= 1000 ? `${(g / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg` : `${g} g`

const clockOf = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

/**
 * QR "Cek Pesanan" — satu QR statis per outlet, dipasang di kasir.
 *
 * Pembeli memindainya untuk melihat pesanan yang belum dibayar di outlet itu.
 * Daftarnya hanya nama samaran, meja, jam, dan item TANPA harga. Nomor nota dan
 * nominal baru dibuka server setelah pembeli memasukkan nomor nota/antrean
 * atau nama lengkapnya — belanjaan orang lain tidak dipamerkan ke seisi toko.
 */
export default function OrderCheckPage() {
  const { token = '' } = useParams()
  const [search, setSearch] = useState('')
  const lookup = useMutation({
    mutationFn: async (query: string) => (await lookupOrderCheck(token, query)).data.data.orders,
  })
  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ['order-check', token],
    queryFn: async () => (await getOrderCheck(token)).data.data,
    enabled: !!token,
    retry: false,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center mb-4">
          <QrCode size={30} />
        </div>
        <p className="text-sm text-gray-600">{t('ocInvalid')}</p>
      </div>
    )
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const query = search.trim()
    if (query) lookup.mutate(query)
  }
  const clear = () => {
    setSearch('')
    lookup.reset()
  }
  const lookupError = lookup.isError
    ? isAxiosError(lookup.error) && lookup.error.response?.status === 429
      ? t('ocLookupLimited')
      : t('ocLookupFailed')
    : null

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
        <div className="max-w-2xl mx-auto px-4 pt-3.5 pb-6 flex items-center gap-3">
          {data.business_logo ? (
            <img src={data.business_logo} alt="" className="w-10 h-10 rounded-xl object-cover bg-white/10 ring-2 ring-white/30" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/15 ring-2 ring-white/30 flex items-center justify-center text-sm font-bold">
              {initials(data.business_name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold leading-tight truncate">{data.business_name}</h1>
            <p className="text-xs text-white/80 truncate">{data.outlet_name}</p>
          </div>
          <span className="shrink-0 flex items-center gap-1 text-xs font-semibold bg-white/15 ring-1 ring-white/25 rounded-full px-3 py-1">
            <ReceiptText size={13} /> {t('ocTitle')}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-3">
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/70 p-3 space-y-2">
          <p className="text-xs text-gray-600">{t('ocHint')}</p>
          <form onSubmit={submit} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('ocSearch')}
                type="search"
                enterKeyHint="search"
                maxLength={100}
                className="w-full pl-9 pr-9 py-2 text-sm bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              {search && (
                <button type="button" onClick={clear} aria-label={t('actionClose')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400">
                  <X size={14} />
                </button>
              )}
            </div>
            <button type="submit" disabled={!search.trim() || lookup.isPending}
              className="shrink-0 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl disabled:opacity-50">
              {t('ocLookup')}
            </button>
          </form>
          <div className="flex justify-between text-[11px] text-gray-400">
            <span>{t('ocCount', { n: data.orders.length })}</span>
            <span>{t('ocUpdated', { time: new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) })}</span>
          </div>
        </div>

        {lookupError && <p className="text-center text-sm text-red-600 py-2">{lookupError}</p>}
        {lookup.data && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">{t('ocLookupTitle')}</h2>
            {lookup.data.length === 0
              ? <p className="text-sm text-gray-600 bg-white rounded-2xl ring-1 ring-gray-200/80 px-4 py-3">{t('ocLookupNone')}</p>
              : lookup.data.map((o) => <OrderCard key={o.bill_number} order={o} />)}
          </section>
        )}

        {data.orders.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-16">{t('ocEmpty')}</p>
        )}
        {data.orders.length > 0 && (
          <section className="space-y-2">
            {lookup.data && (
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 pt-2">{t('ocAllOrders')}</h2>
            )}
            {data.orders.map((o, i) => <ListCard key={`${o.created_at}-${i}`} order={o} />)}
          </section>
        )}
      </div>
    </div>
  )
}

const metaOf = (o: { customer: string; table_number: string | null; created_at: string }) =>
  [o.customer, o.table_number ? t('menuTableBadge', { n: o.table_number.toUpperCase() }) : null, clockOf(o.created_at)]
    .filter(Boolean).join(' · ')

/** Baris daftar publik: tanpa nomor nota dan harga. */
function ListCard({ order }: { order: PublicCheckListOrder }) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-gray-200/80 px-4 py-3">
      <p className="text-sm font-semibold text-gray-900 truncate">{metaOf(order)}</p>
      {order.items.length > 0 && (
        <div className="mt-2 pt-2 border-t border-dashed border-gray-200 space-y-1">
          {order.items.map((it, i) => (
            <p key={i} className="text-sm text-gray-700 truncate">
              {it.is_weight_based ? grams(it.quantity) : `${it.quantity}×`} {titleCase(it.name)}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

/** Detail pesanan setelah dicocokkan: nomor nota, harga, total, sisa. */
function OrderCard({ order }: { order: PublicCheckOrder }) {
  const code = order.queue_number || order.bill_number
  const remaining = Math.max(0, order.total - order.paid)
  return (
    <div className="bg-white rounded-2xl ring-2 ring-blue-500/60 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900 tracking-wide truncate">#{code}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{metaOf(order)}</p>
        </div>
        <p className="text-base font-bold text-gray-900 tabular-nums shrink-0">{formatCurrency(order.total)}</p>
      </div>
      {order.items.length > 0 && (
        <div className="mt-2 pt-2 border-t border-dashed border-gray-200 space-y-1">
          {order.items.map((it, i) => (
            <div key={i} className="flex justify-between gap-3 text-sm">
              <span className="text-gray-700 min-w-0 truncate">
                {it.is_weight_based ? grams(it.quantity) : `${it.quantity}×`} {titleCase(it.name)}
              </span>
              <span className="tabular-nums text-gray-900 shrink-0">{formatCurrency(it.total)}</span>
            </div>
          ))}
        </div>
      )}
      {order.paid > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">{t('ocPaid')}</span>
            <span className="tabular-nums text-emerald-700">−{formatCurrency(order.paid)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span className="text-gray-700">{t('ocRemaining')}</span>
            <span className="tabular-nums">{formatCurrency(remaining)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
