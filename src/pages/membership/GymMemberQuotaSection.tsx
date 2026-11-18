import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { getMemberQuota, type MemberQuotaOffer } from '@/api/gymQuota'
import { t } from '@/lib/i18n'
import { formatCurrency, formatDate } from '@/lib/utils'

/**
 * Kuota member gym di halaman Langganan.
 *
 * Paket Pro sudah termasuk 50 member aktif; gym yang lebih besar membeli
 * tambahan bertingkat lewat tagihan Duitku yang sama dengan Pro dan outlet.
 * Bagian ini hanya tampil untuk usaha yang memakai member gym (punya member,
 * atau sedang melewati kuota) — toko lain tidak perlu melihatnya.
 */
export default function GymMemberQuotaSection({ onBuy, busy }: {
  onBuy: (plan: string, title: string) => void
  busy: boolean
}) {
  const [yearly, setYearly] = useState(false)
  const { data } = useQuery({
    queryKey: ['gym-member-quota'],
    queryFn: async () => (await getMemberQuota()).data.data,
    retry: false,
  })
  if (!data) return null
  const q = data.quota
  const hasTier = !!q.tier && !!q.tier_active_until
  if (q.active_members === 0 && !hasTier && !q.over_limit) return null

  const sizeOf = (limit: number) => (limit === 0 ? t('gqUnlimited') : t('gqMembers', { count: limit }))
  const priceOf = (o: MemberQuotaOffer) => (yearly ? o.yearly_price : o.monthly_price)
  const ratio = q.limit > 0 ? Math.min(1, q.active_members / q.limit) : 0

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Users size={18} />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-foreground">{t('gqTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {q.limit === 0
              ? t('gqUsageUnlimited', { active: q.active_members })
              : t('gqUsage', { active: q.active_members, limit: q.limit })}
            {' · '}
            {q.trial
              ? t('gqTrial', { base: data.base_limit })
              : hasTier
                ? t('gqTierUntil', { size: sizeOf(q.limit), date: formatDate(q.tier_active_until!) })
                : t('gqIncluded', { base: data.base_limit })}
          </p>
        </div>
      </div>
      {q.limit > 0 && (
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full ${q.over_limit ? 'bg-red-500' : ratio >= 0.9 ? 'bg-amber-500' : 'bg-blue-600'}`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      )}
      {q.over_limit && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {q.block_new_members
            ? t('gqBlocked')
            : t('gqGrace', { date: q.grace_until ? formatDate(q.grace_until) : '-' })}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{t('gqRule', { days: data.grace_days })}</p>

      <div className="inline-flex rounded-xl border border-border p-1 text-sm">
        {[false, true].map((y) => (
          <button key={String(y)} type="button" onClick={() => setYearly(y)}
            className={`px-3 py-1.5 rounded-lg ${yearly === y ? 'bg-blue-600 text-white' : 'text-muted-foreground'}`}>
            {y ? t('gqYearly') : t('gqMonthly')}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {data.offers.map((o) => {
          const price = priceOf(o)
          const current = q.tier === o.plan
          return (
            <div key={o.plan} className={`rounded-xl border p-4 space-y-2 ${current ? 'border-blue-500' : 'border-border'}`}>
              <p className="font-semibold text-foreground">{sizeOf(o.limit)}</p>
              {price != null && (
                <p className="text-sm text-muted-foreground">
                  {yearly ? t('gqPerYear', { price: formatCurrency(price) }) : t('gqPerMonth', { price: formatCurrency(price) })}
                </p>
              )}
              <button type="button" disabled={busy || price == null}
                onClick={() => onBuy(yearly ? o.yearly_plan : o.plan, t('gqPayTitle', { size: sizeOf(o.limit) }))}
                className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60">
                {current ? t('gqExtend') : t('gqChoose')}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
