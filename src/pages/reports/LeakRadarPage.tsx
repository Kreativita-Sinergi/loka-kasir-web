import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, BadgeCheck, ChevronRight, Eye, Flag, Info, QrCode, Receipt, ShieldAlert, Wallet } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import Badge, { type BadgeVariant } from '@/components/ui/Badge'
import { getLeakRadar, type LeakActor, type LeakFinding, type LeakLevel } from '@/api/ownerInsights'
import { leakFindingText, pct } from '@/lib/ownerInsights'
import { leakControl } from '@/lib/reportCard'
import { formatCurrency, formatDate, todayISODate } from '@/lib/utils'
import { formatQuantity } from '@/lib/money'
import { t } from '@/lib/i18n'

const severityBadge: Record<LeakFinding['severity'], [BadgeVariant, 'lkrSeverityHigh' | 'lkrSeverityMedium' | 'lkrSeverityLow']> = {
  high: ['red', 'lkrSeverityHigh'],
  medium: ['yellow', 'lkrSeverityMedium'],
  low: ['gray', 'lkrSeverityLow'],
}

const levelTone: Record<LeakLevel, { ring: string; label: 'lkrLevelAlert' | 'lkrLevelWatch' | 'lkrLevelSafe'; icon: React.ReactNode }> = {
  alert: { ring: 'bg-destructive-subtle text-destructive', label: 'lkrLevelAlert', icon: <ShieldAlert size={18} /> },
  watch: { ring: 'bg-warning-subtle text-warning', label: 'lkrLevelWatch', icon: <Eye size={18} /> },
  safe: { ring: 'bg-success-subtle text-success', label: 'lkrLevelSafe', icon: <BadgeCheck size={18} /> },
}

function FindingRow({ finding }: { finding: LeakFinding }) {
  const [title, body] = leakFindingText(finding)
  const [variant, label] = severityBadge[finding.severity]
  return (
    <li className="px-4 py-3 space-y-1.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <Badge variant={variant}>{t(label)}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">{body}</p>
      {finding.refs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {finding.refs.map((r) => (
            <Link
              key={r.transaction_id}
              to={`/transactions?search=${encodeURIComponent(r.bill_number)}&id=${encodeURIComponent(r.transaction_id)}`}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground hover:bg-muted/70"
            >
              <Receipt size={12} className="text-muted-foreground" />
              {r.bill_number || formatDate(r.at)} · {formatCurrency(r.amount)}
            </Link>
          ))}
        </div>
      )}
    </li>
  )
}

function ActorRow({ actor }: { actor: LeakActor }) {
  const flagged = actor.flags.length > 0
  return (
    <tr className="hover:bg-muted transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-foreground">{actor.actor_name || t('lkrUnknownActor')}</td>
      <td className="px-4 py-3 text-sm text-right text-muted-foreground">{formatQuantity(actor.transactions)}</td>
      <td className="px-4 py-3 text-sm text-right text-muted-foreground">{formatCurrency(actor.sales)}</td>
      <td className="px-4 py-3 text-sm text-center text-muted-foreground">{actor.cancel_count > 0 ? pct(actor.cancel_rate) : '—'}</td>
      <td className="px-4 py-3 text-sm text-center text-muted-foreground">{actor.refund_count > 0 ? pct(actor.refund_rate) : '—'}</td>
      <td className="px-4 py-3 text-sm text-center text-muted-foreground">{actor.discount_rate > 0 ? pct(actor.discount_rate) : '—'}</td>
      <td className="px-4 py-3 text-sm text-center text-muted-foreground">
        {actor.cash_short_shifts > 0 ? `${actor.cash_short_shifts}/${actor.total_shifts}` : '—'}
      </td>
      <td className="px-4 py-3 text-center">
        <Badge variant={flagged ? 'yellow' : 'green'}>
          {flagged ? t('lkrActorFlags', { count: actor.flags.length }) : t('lkrActorClean')}
        </Badge>
      </td>
    </tr>
  )
}

export default function LeakRadarPage() {
  const [from, setFrom] = useState(() => todayISODate(new Date(Date.now() - 30 * 86400000)))
  const [to, setTo] = useState(() => todayISODate(new Date()))

  const { data, isLoading, isError } = useQuery({
    queryKey: ['leak-radar', from, to],
    queryFn: () => getLeakRadar({ from, to }),
    select: (res) => res.data.data,
  })
  const level = levelTone[data?.level ?? 'safe']
  const control = data ? leakControl(data) : null

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header title={t('lkrTitle')} subtitle={t('lkrSubtitle')} />

      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t('cashDiscFrom')}</span>
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t('cashDiscTo')}</span>
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground" />
          </label>
        </div>

        {isError && (
          <div className="bg-destructive-subtle border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">
            {t('cashDiscLoadFailed')}
          </div>
        )}

        {data && control && (
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4">
            {/* Huruf dan angka Kontrol, sama dengan lingkaran nilai Rapor Toko;
                warnanya mengikuti tingkat Radar. */}
            <div className={`size-16 shrink-0 rounded-full flex flex-col items-center justify-center leading-none ${level.ring}`}>
              <span className="text-2xl font-extrabold">{control.grade}</span>
              <span className="text-xs font-bold tabular-nums">{control.score}</span>
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                {level.icon} {t(level.label)}
              </p>
              <p className="text-sm text-muted-foreground">
                {data.summary.at_risk > 0 ? t('lkrAtRisk', { amount: formatCurrency(data.summary.at_risk) }) : t('lkrAtRiskNone')}
              </p>
              <p className="text-xs text-muted-foreground">{t('lkrScoreHint')}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title={t('lkrStatTransactions')} value={formatQuantity(data?.summary.transactions ?? 0)} icon={<Receipt size={18} />} color="blue" loading={isLoading} />
          <StatCard title={t('lkrStatSales')} value={formatCurrency(data?.summary.sales ?? 0)} icon={<Wallet size={18} />} color="green" loading={isLoading} />
          <StatCard title={t('lkrStatHigh')} value={data?.summary.high_count ?? 0} icon={<AlertTriangle size={18} />} color="red" loading={isLoading} />
          <StatCard title={t('lkrStatMedium')} value={data?.summary.medium_count ?? 0} icon={<Flag size={18} />} color="orange" loading={isLoading} />
        </div>

        {data && !data.summary.qris_monitored && (
          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted px-4 py-3 text-sm">
            <QrCode size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">{t('lkrQrisOffTitle')}</p>
              <p className="text-muted-foreground">{t('lkrQrisOffBody')}</p>
              {/* Saklarnya ada di ubah outlet › QRIS (Konfirmasi Otomatis). */}
              <Link to="/outlets" className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
                {t('lkrQrisOffAction')} <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm font-semibold text-foreground">{t('lkrFindingsTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('lkrFindingsHint')}</p>
          </div>
          {isLoading ? (
            <div className="px-4 pb-4 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
          ) : !data?.findings.length ? (
            <p className="px-4 pb-6 pt-2 text-sm text-muted-foreground text-center">{t('lkrNoFindings')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.findings.map((f, i) => <FindingRow key={`${f.code}-${f.actor_id ?? i}`} finding={f} />)}
            </ul>
          )}
        </div>

        {!!data?.actors.length && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <p className="text-sm font-semibold text-foreground">{t('lkrActorsTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('lkrActorsHint')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('cashDiscColCashier')}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">{t('lkrStatTransactions')}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">{t('lkrStatSales')}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">{t('lkrColCancel')}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">{t('lkrColRefund')}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">{t('lkrColDiscount')}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">{t('lkrColCashShort')}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">{t('lkrColStatus')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.actors.map((a) => <ActorRow key={a.actor_id} actor={a} />)}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>{t('lkrNote')}</p>
        </div>
      </div>
    </div>
  )
}
