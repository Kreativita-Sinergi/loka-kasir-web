import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronRight, CircleMinus, CirclePlus, Hourglass, Info, TrendingUp, Trophy, Wrench } from 'lucide-react'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import GradeCard from './GradeCard'
import { getStoreReport, type RecommendationKind, type ReportPeriod, type ReportRecommendation } from '@/api/ownerInsights'
import {
  RECOMMENDATION_KINDS, gradeTone, kindLabel, partialScoreLine, pillarLabel, pillarNote,
  recommendationAction, recommendationText, signedPct,
} from '@/lib/reportCard'
import { formatCurrency } from '@/lib/utils'
import { oneDecimal } from '@/lib/ownerInsights'
import { formatQuantity } from '@/lib/money'
import { t } from '@/lib/i18n'

const kindStyle: Record<RecommendationKind, { icon: React.ReactNode; color: string }> = {
  add: { icon: <CirclePlus size={18} />, color: 'text-success' },
  grow: { icon: <TrendingUp size={18} />, color: 'text-primary' },
  fix: { icon: <Wrench size={18} />, color: 'text-warning' },
  cut: { icon: <CircleMinus size={18} />, color: 'text-destructive' },
}

function RecommendationRow({ rec }: { rec: ReportRecommendation }) {
  const [title, body] = recommendationText(rec)
  const action = recommendationAction(rec)
  const style = kindStyle[rec.kind]
  return (
    <li className="px-4 py-3 flex items-start gap-3">
      <span className={`mt-0.5 shrink-0 ${style.color}`}>{style.icon}</span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {!!rec.impact_per_month && rec.impact_per_month > 0 && (
            <Badge variant="green">{t('rptImpact', { money: formatCurrency(rec.impact_per_month) })}</Badge>
          )}
          {action && (
            <Link to={action[1]} className="inline-flex items-center gap-0.5 text-sm font-medium text-primary hover:underline">
              {action[0]} <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </li>
  )
}

export default function StoreReportPage() {
  const [period, setPeriod] = useState<ReportPeriod>('30d')
  const { data, isLoading, isError } = useQuery({
    queryKey: ['store-report', period],
    queryFn: () => getStoreReport(period),
    select: (res) => res.data.data,
  })

  const tabClass = (active: boolean) =>
    `px-3 py-1.5 text-sm rounded-lg font-medium ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header title={t('rptStoreTitle')} subtitle={t('rptStoreSubtitle')} />

      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="inline-flex gap-1 rounded-xl border border-border bg-card p-1">
          <button type="button" className={tabClass(period === '7d')} onClick={() => setPeriod('7d')}>{t('rptPeriod7')}</button>
          <button type="button" className={tabClass(period === '30d')} onClick={() => setPeriod('30d')}>{t('rptPeriod30')}</button>
        </div>

        {isError && (
          <div className="bg-destructive-subtle border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">
            {t('cashDiscLoadFailed')}
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}</div>
        )}

        {data && (
          <>
            <GradeCard
              score={data.score}
              grade={data.grade}
              lines={[
                data.revenue_change_pct != null
                  ? t('rptRevenueLine', { revenue: formatCurrency(data.revenue), change: signedPct(data.revenue_change_pct) })
                  : t('rptRevenueOnly', { revenue: formatCurrency(data.revenue) }),
                t('rptTicketLine', { ticket: formatCurrency(data.avg_ticket), items: oneDecimal(data.items_per_tx) }),
                ...(data.top_items.length ? [t('rptTopItems', { items: data.top_items.join(', ') })] : []),
                ...[partialScoreLine(data)].filter((l): l is string => !!l),
              ]}
            />

            {data.thin_data && (
              <div className="flex items-start gap-2 rounded-xl border border-warning/20 bg-warning-subtle px-4 py-3 text-sm text-warning">
                <Hourglass size={16} className="mt-0.5 shrink-0" />
                <p>{t('rptThinData', { tx: formatQuantity(data.transactions), min: formatQuantity(data.min_transactions) })}</p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
              {data.pillars.map((p) => (
                <div key={p.code} className="rounded-xl border border-border bg-card p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">{pillarLabel(p.code)}</p>
                  <Badge variant={p.score == null ? 'gray' : gradeTone(p.grade)}>
                    {p.score == null ? t('rptNotRated') : `${p.grade} · ${p.score}`}
                  </Badge>
                  <p className="text-sm text-foreground">{pillarNote(p)}</p>
                </div>
              ))}
            </div>

            {data.recommendations.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card px-4 py-8 flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <Trophy size={28} />
                {t('rptRecsEmpty')}
              </div>
            ) : (
              RECOMMENDATION_KINDS.map((kind) => {
                const group = data.recommendations.filter((r) => r.kind === kind)
                if (!group.length) return null
                return (
                  <div key={kind} className="rounded-2xl border border-border bg-card overflow-hidden">
                    <p className="px-4 pt-4 pb-1 text-sm font-semibold text-foreground">{kindLabel(kind)}</p>
                    <ul className="divide-y divide-border">
                      {group.map((r, i) => <RecommendationRow key={`${r.code}-${i}`} rec={r} />)}
                    </ul>
                  </div>
                )
              })
            )}
          </>
        )}

        <div className="flex items-start gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>{t('rptNote')}</p>
        </div>
      </div>
    </div>
  )
}
