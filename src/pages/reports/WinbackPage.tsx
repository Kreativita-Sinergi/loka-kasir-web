import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Clock, HandHeart, Info, MessageCircle, PhoneOff, PiggyBank, QrCode, Star, UserPlus, UserSearch, UserX, Wallet } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import Badge, { type BadgeVariant } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Switch from '@/components/ui/Switch'
import { Button } from '@/components/ui/button'
import {
  contactWinbackCustomer,
  getRatingLink,
  getRatings,
  getWinback,
  setRatingLinkEnabled,
  whatsAppNumber,
  whatsAppUrl,
  type CustomerRating,
  type WinbackCustomer,
  type WinbackSegment,
} from '@/api/ownerInsights'
import { useBusinessOutlets } from '@/hooks/useBusinessOutlets'
import { useAuthStore } from '@/store/authStore'
import { fewTracked, oneDecimal, ratingReplyMessage, winbackMessage } from '@/lib/ownerInsights'
import { formatCurrency, formatDate } from '@/lib/utils'
import { formatQuantity } from '@/lib/money'
import { t } from '@/lib/i18n'
import type { Outlet } from '@/types'

type Tab = 'customers' | 'ratings'

const SEGMENT: Record<WinbackSegment, [BadgeVariant, 'wbkSegmentAtRisk' | 'wbkSegmentLost' | 'wbkSegmentNewOnce']> = {
  at_risk: ['yellow', 'wbkSegmentAtRisk'],
  lost: ['red', 'wbkSegmentLost'],
  new_once: ['blue', 'wbkSegmentNewOnce'],
}

function ContactModal({ customer, onClose }: { customer: WinbackCustomer; onClose: () => void }) {
  const storeName = useAuthStore((s) => s.user?.business?.business_name ?? '')
  const qc = useQueryClient()
  const [message, setMessage] = useState(() => winbackMessage(customer, storeName))
  const [voucher, setVoucher] = useState<'none' | 'amount' | 'percent'>('none')
  const [value, setValue] = useState('')
  const validDays = 14

  const send = useMutation({
    mutationFn: async () => {
      const num = Number(value.replace(/\D/g, ''))
      if (voucher !== 'none' && (num <= 0 || (voucher === 'percent' && num > 100))) {
        throw new Error(t('wbkVoucherInvalid'))
      }
      const res = await contactWinbackCustomer(customer.customer_id, {
        segment: customer.segment,
        ...(voucher === 'none' ? {} : { voucher_type: voucher, voucher_value: num, valid_days: validDays }),
      })
      let text = message.trim()
      const v = res.data.data.voucher
      if (v) {
        const shown = voucher === 'percent' ? `${num}%` : formatCurrency(num)
        text += `\n\n${t('wbkVoucherLine', { code: v.code, value: shown, until: v.expires_at ? formatDate(v.expires_at) : '' })}`
      }
      return text
    },
    onSuccess: (text) => {
      window.open(whatsAppUrl(whatsAppNumber(customer.phone), text), '_blank', 'noopener')
      qc.invalidateQueries({ queryKey: ['winback'] })
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const chip = (k: typeof voucher, label: string) => (
    <button type="button" onClick={() => { setVoucher(k); setValue('') }}
      className={`px-3 py-1.5 text-sm rounded-lg border ${voucher === k ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
      {label}
    </button>
  )

  return (
    <Modal open onClose={onClose} title={t('wbkGreetTitle', { name: customer.name })}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{customer.phone || t('wbkNoPhoneHint')}</p>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground">{t('wbkMessage')}</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground" />
        </label>
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{t('wbkVoucherTitle')}</p>
          <div className="flex flex-wrap gap-2">
            {chip('none', t('wbkVoucherNone'))}
            {chip('amount', t('wbkVoucherAmount'))}
            {chip('percent', t('wbkVoucherPercent'))}
          </div>
          {voucher !== 'none' && (
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">{voucher === 'amount' ? t('wbkVoucherAmountLabel') : t('wbkVoucherPercentLabel')}</span>
              <input inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} placeholder={voucher === 'amount' ? '5000' : '10'}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground" />
              <span className="text-xs text-muted-foreground">{t('wbkVoucherHelper', { days: validDays })}</span>
            </label>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t('actionCancel')}</Button>
          <Button onClick={() => send.mutate()} disabled={send.isPending}>
            <MessageCircle size={16} /> {t('wbkSendWhatsApp')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function RatingQrRow({ outlet }: { outlet: Outlet }) {
  const qc = useQueryClient()
  const link = useQuery({
    queryKey: ['rating-link', outlet.id],
    queryFn: () => getRatingLink(outlet.id),
    select: (r) => r.data.data,
  })
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => setRatingLinkEnabled(outlet.id, enabled),
    onSuccess: (_, enabled) => {
      toast.success(enabled ? t('wbkQrOn') : t('wbkQrOff'))
      qc.invalidateQueries({ queryKey: ['rating-link', outlet.id] })
    },
    onError: () => toast.error(t('cashDiscLoadFailed')),
  })
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{outlet.name}</p>
        {link.data?.url && <p className="truncate text-xs text-muted-foreground">{link.data.url}</p>}
      </div>
      <Switch checked={!!link.data?.enabled} disabled={!link.data || toggle.isPending} onChange={(v) => toggle.mutate(v)} />
    </li>
  )
}

function RatingRow({ rating: r, storeName }: { rating: CustomerRating; storeName: string }) {
  const phone = whatsAppNumber(r.contact_phone)
  return (
    <li className="px-4 py-3 space-y-1">
      <span className="text-warning">{'★'.repeat(r.rating)}<span className="text-border">{'★'.repeat(5 - r.rating)}</span></span>
      {r.comment && <p className="text-sm text-foreground">{r.comment}</p>}
      <p className="text-xs text-muted-foreground">
        {[r.contact_name || t('wbkAnonymous'), r.bill_number, r.outlet_name, formatDate(r.created_at)].filter(Boolean).join(' · ')}
      </p>
      {phone && (
        <a href={whatsAppUrl(phone, ratingReplyMessage(r, storeName))} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 pt-0.5 text-sm font-medium text-primary hover:underline">
          <MessageCircle size={14} /> {t('wbkReply')}
        </a>
      )}
    </li>
  )
}

export default function WinbackPage() {
  const storeName = useAuthStore((s) => s.user?.business?.business_name ?? '')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<Tab>('customers')
  const [segment, setSegment] = useState<WinbackSegment | 'all'>('all')
  const [contact, setContact] = useState<WinbackCustomer | null>(null)
  const { outlets } = useBusinessOutlets()

  const winback = useQuery({ queryKey: ['winback'], queryFn: getWinback, select: (r) => r.data.data, enabled: tab === 'customers' })
  const ratings = useQuery({ queryKey: ['ratings'], queryFn: getRatings, select: (r) => r.data.data, enabled: tab === 'ratings' })

  const s = winback.data?.summary
  const customers = (winback.data?.customers ?? []).filter((c) => segment === 'all' || c.segment === segment)
  const tabClass = (active: boolean) =>
    `px-3 py-1.5 text-sm rounded-lg font-medium ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`
  const maxDist = Math.max(1, ...(ratings.data?.distribution ?? [0]))
  // Kosong karena pelanggan jarang dicatat — jangan dibaca "semua setia".
  const emptyFewTracked = segment === 'all' && fewTracked(s)

  /** Ganti tab dan kembali ke atas — saklar QR ada di puncak tab Penilaian. */
  const showTab = (next: Tab) => {
    setTab(next)
    scrollRef.current?.scrollTo({ top: 0 })
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header title={t('wbkTitle')} subtitle={t('wbkSubtitle')} />

      <div ref={scrollRef} className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="inline-flex gap-1 rounded-xl border border-border bg-card p-1">
          <button type="button" className={tabClass(tab === 'customers')} onClick={() => showTab('customers')}>{t('wbkTabCustomers')}</button>
          <button type="button" className={tabClass(tab === 'ratings')} onClick={() => showTab('ratings')}>{t('wbkTabRatings')}</button>
        </div>

        {tab === 'customers' ? (
          <>
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <StatCard title={t('wbkStatAtRisk')} value={s?.at_risk ?? 0} icon={<Clock size={18} />} color="orange" loading={winback.isLoading} />
              <StatCard title={t('wbkStatLost')} value={s?.lost ?? 0} icon={<UserX size={18} />} color="red" loading={winback.isLoading} />
              <StatCard title={t('wbkStatNewOnce')} value={s?.new_once ?? 0} icon={<UserPlus size={18} />} color="blue" loading={winback.isLoading} />
              <StatCard title={t('wbkStatAtStake')} value={formatCurrency(s?.monthly_at_stake ?? 0)} subtitle={t('wbkStatAtStakeHint')} icon={<PiggyBank size={18} />} color="orange" loading={winback.isLoading} />
              <StatCard title={t('wbkStatReturned')} value={t('wbkReturnedOf', { returned: s?.returned_30d ?? 0, contacted: s?.contacted_30d ?? 0 })} icon={<HandHeart size={18} />} color="green" loading={winback.isLoading} />
              <StatCard title={t('wbkStatReturnedRevenue')} value={formatCurrency(s?.returned_revenue_30d ?? 0)} icon={<Wallet size={18} />} color="green" loading={winback.isLoading} />
            </div>

            <div className="flex flex-wrap gap-2">
              {(['all', 'at_risk', 'lost', 'new_once'] as const).map((k) => (
                <button key={k} type="button" onClick={() => setSegment(k)}
                  className={`px-3 py-1.5 text-sm rounded-full border ${segment === k ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                  {k === 'all' ? t('wbkFilterAll') : t(SEGMENT[k][1])}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {winback.isError ? (
                <p className="px-4 py-6 text-sm text-destructive">{t('cashDiscLoadFailed')}</p>
              ) : !winback.isLoading && customers.length === 0 ? (
                emptyFewTracked ? (
                  <div className="px-4 py-10 flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
                    <UserSearch size={28} />
                    <p className="max-w-md">{t('wbkFewTracked', { count: formatQuantity(s?.tracked ?? 0) })}</p>
                    <Button size="sm" variant="outline" onClick={() => showTab('ratings')}>
                      <QrCode size={14} /> {t('wbkTurnOnQr')}
                    </Button>
                  </div>
                ) : (
                  <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t('wbkEmpty')}</p>
                )
              ) : (
                <ul className="divide-y divide-border">
                  {customers.map((c) => {
                    const [variant, label] = SEGMENT[c.segment]
                    return (
                      <li key={c.customer_id} className="flex items-start justify-between gap-3 px-4 py-3">
                        <div className="min-w-0 space-y-0.5">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                            {c.name} <Badge variant={variant}>{t(label)}</Badge>
                          </p>
                          <p className="text-sm text-foreground">
                            {c.segment === 'new_once'
                              ? t('wbkOnceAgo', { days: c.days_since })
                              : t('wbkRhythm', { gap: oneDecimal(c.avg_gap_days), days: c.days_since })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('wbkVisits', { visits: c.visits, ticket: formatCurrency(c.avg_ticket) })}
                            {c.favorite_item ? ` · ${t('wbkFavorite', { item: c.favorite_item })}` : ''}
                          </p>
                          {c.last_contacted_at && (
                            <p className="text-xs font-medium text-success">{t('wbkLastContacted', { date: formatDate(c.last_contacted_at) })}</p>
                          )}
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => setContact(c)}>
                          <MessageCircle size={14} /> {t('wbkGreet')}
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {!!s?.without_phone && (
              <div className="flex items-start gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                <PhoneOff size={16} className="mt-0.5 shrink-0" />
                <p>{t('wbkWithoutPhone', { count: formatQuantity(s.without_phone) })}</p>
              </div>
            )}
            <div className="flex items-start gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
              <Info size={16} className="mt-0.5 shrink-0" />
              <p>{t('wbkNote')}</p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <p className="text-sm font-semibold text-foreground">{t('wbkQrTitle')}</p>
                <p className="text-xs text-muted-foreground">{t('wbkQrHint')}</p>
              </div>
              <ul className="divide-y divide-border">{outlets.map((o) => <RatingQrRow key={o.id} outlet={o} />)}</ul>
            </div>

            <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-4">
              <StatCard title={t('wbkRatingAverage')} value={ratings.data?.count ? oneDecimal(ratings.data.average) : '—'} icon={<Star size={18} />} color="orange" loading={ratings.isLoading} />
              <StatCard title={t('wbkRatingCount')} value={ratings.data?.count ?? 0} icon={<MessageCircle size={18} />} color="blue" loading={ratings.isLoading} />
              <StatCard title={t('wbkRatingContacts')} value={ratings.data?.new_contacts ?? 0} icon={<UserPlus size={18} />} color="green" loading={ratings.isLoading} />
            </div>

            {!!ratings.data?.count && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const n = ratings.data!.distribution[star - 1] ?? 0
                  return (
                    <div key={star} className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="w-6">{star}★</span>
                      <div className="h-2 flex-1 rounded bg-muted overflow-hidden">
                        <div className={`h-full ${star >= 4 ? 'bg-success' : star === 3 ? 'bg-warning' : 'bg-destructive'}`} style={{ width: `${(n / maxDist) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right tabular-nums">{n}</span>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <p className="px-4 pt-4 pb-2 text-sm font-semibold text-foreground">{t('wbkRatingRecent')}</p>
              {!ratings.isLoading && !ratings.data?.recent.length ? (
                <p className="px-4 pb-6 text-sm text-muted-foreground">{t('wbkRatingEmpty')}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {(ratings.data?.recent ?? []).map((r) => <RatingRow key={r.id} rating={r} storeName={storeName} />)}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {contact && <ContactModal customer={contact} onClose={() => setContact(null)} />}
    </div>
  )
}
