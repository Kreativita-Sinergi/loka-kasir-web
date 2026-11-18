import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { getMemberQuota, type MemberQuotaOffer } from '@/api/gymQuota'
import { t } from '@/lib/i18n'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Badge from '@/components/ui/Badge'

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
        <div className="w-10 h-10 rounded-xl bg-primary-subtle text-primary flex items-center justify-center shrink-0">
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
            className={cn('h-full', q.over_limit ? 'bg-destructive' : ratio >= 0.9 ? 'bg-warning' : 'bg-primary')}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      )}
      {q.over_limit && (
        <p className="text-sm text-destructive">
          {q.block_new_members
            ? t('gqBlocked')
            : t('gqGrace', { date: q.grace_until ? formatDate(q.grace_until) : '-' })}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{t('gqRule', { days: data.grace_days })}</p>

      <div className="inline-flex gap-1 rounded-xl border border-border p-1" role="group">
        {[false, true].map((y) => (
          <Button key={String(y)} type="button" size="sm" aria-pressed={yearly === y}
            variant={yearly === y ? 'default' : 'ghost'} onClick={() => setYearly(y)}>
            {y ? t('gqYearly') : t('gqMonthly')}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {data.offers.map((o) => {
          const price = priceOf(o)
          const current = q.tier === o.plan
          return (
            <div key={o.plan} className={cn('rounded-xl border p-4 space-y-2', current ? 'border-primary' : 'border-border')}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-foreground">{sizeOf(o.limit)}</p>
                {current && <Badge variant="blue">{t('gqCurrent')}</Badge>}
              </div>
              {price != null && (
                <p className="text-sm text-muted-foreground">
                  {yearly ? t('gqPerYear', { price: formatCurrency(price) }) : t('gqPerMonth', { price: formatCurrency(price) })}
                </p>
              )}
              <Button type="button" size="sm" className="w-full" disabled={busy || price == null}
                variant={current ? 'outline' : 'default'}
                onClick={() => onBuy(yearly ? o.yearly_plan : o.plan, t('gqPayTitle', { size: sizeOf(o.limit) }))}>
                {current ? t('gqExtend') : t('gqChoose')}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
