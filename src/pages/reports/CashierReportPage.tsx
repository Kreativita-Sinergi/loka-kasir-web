import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IdCard, Info, Lightbulb, ThumbsUp, Trophy } from 'lucide-react'
import Header from '@/components/layout/Header'
import { getCashierReport, type CashierInsight, type CashierReportRow, type ReportPeriod } from '@/api/ownerInsights'
import { aspectLabel, cashierInsightText, signedPct } from '@/lib/reportCard'
import { formatCurrency } from '@/lib/utils'
import { formatQuantity } from '@/lib/money'
import { t } from '@/lib/i18n'
import GradeCard from './GradeCard'

const ASPECT_ORDER = ['throughput', 'ticket', 'cash', 'compliance', 'attendance'] as const

const barColor = (score: number) => (score >= 70 ? 'bg-success' : score >= 50 ? 'bg-warning' : 'bg-destructive')

function InsightList({ title, icon, tone, items }: { title: string; icon: React.ReactNode; tone: string; items: CashierInsight[] }) {
  return (
    <div className="space-y-1">
      <p className={`text-xs font-bold ${tone}`}>{title}</p>
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.code} className="flex items-start gap-1.5 text-sm text-foreground">
            <span className={`mt-0.5 shrink-0 ${tone}`}>{icon}</span>
            {cashierInsightText(i)}
          </li>
        ))}
      </ul>
    </div>
  )
}

function CashierCard({ row }: { row: CashierReportRow }) {
  const scoreOf = Object.fromEntries(row.aspects.map((a) => [a.code, a.score]))
  return (
    <div className="space-y-2">
      <GradeCard
        score={row.score}
        grade={row.grade}
        title={row.name}
        lines={[
          ...(row.score == null ? [t('rptCashierUnrated')] : []),
          t('rptCashierMeta', { tx: formatQuantity(row.transactions), ticket: formatCurrency(row.avg_ticket) }),
          ...(row.sales_per_hour != null ? [t('rptSalesPerHour', { value: formatCurrency(row.sales_per_hour) })] : []),
        ]}
      />
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="space-y-1.5">
          {ASPECT_ORDER.map((code) => {
            const s = scoreOf[code]
            return (
              <div key={code} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-xs text-muted-foreground">{aspectLabel(code)}</span>
                {s == null ? (
                  <span className="flex-1 text-xs text-muted-foreground">{t('rptNotRated')}</span>
                ) : (
                  <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                    <div className={`h-full rounded ${barColor(s)}`} style={{ width: `${s}%` }} />
                  </div>
                )}
                <span className="w-8 text-right text-xs tabular-nums text-foreground">{s ?? ''}</span>
              </div>
            )
          })}
        </div>
        {row.strengths.length > 0 && (
          <InsightList title={t('rptStrengths')} icon={<ThumbsUp size={14} />} tone="text-success" items={row.strengths} />
        )}
        {row.improvements.length > 0 && (
          <InsightList title={t('rptImprovements')} icon={<Lightbulb size={14} />} tone="text-warning" items={row.improvements} />
        )}
      </div>
    </div>
  )
}

export default function CashierReportPage() {
  const [period, setPeriod] = useState<ReportPeriod>('30d')
  const { data, isLoading, isError } = useQuery({
    queryKey: ['cashier-report', period],
    queryFn: () => getCashierReport(period),
    select: (res) => res.data.data,
  })

  const tabClass = (active: boolean) =>
    `px-3 py-1.5 text-sm rounded-lg font-medium ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header title={t('rptCashierTitle')} subtitle={t('rptCashierSubtitle')} />

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
            {data.highlights.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">{t('rptHighlightsTitle')}</p>
                {data.highlights.map((h) => (
                  <p key={h.code} className="flex items-center gap-2 text-sm text-foreground">
                    <Trophy size={16} className="shrink-0 text-warning" />
                    {t(h.code === 'top_sales' ? 'rptTopSales' : 'rptTopTicket', { name: h.name, pct: signedPct(h.vs_team_pct ?? 0) })}
                  </p>
                ))}
              </div>
            )}

            {data.cashiers.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card px-4 py-8 flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <IdCard size={28} />
                {t('rptCashierEmpty')}
              </div>
            ) : (
              <>
                {data.cashiers.length === 1 && (
                  <div className="flex items-start gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                    <Info size={16} className="mt-0.5 shrink-0" />
                    <p>{t('rptSoloNote')}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {data.cashiers.map((c) => <CashierCard key={c.cashier_id} row={c} />)}
                </div>
              </>
            )}
          </>
        )}

        <div className="flex items-start gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>{t('rptCashierNote')}</p>
        </div>
      </div>
    </div>
  )
}
