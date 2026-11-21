import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { SalesSummaryRow } from '@/api/salesReports'
import { activeLocale, t } from '@/lib/i18n'
import { REPORT_DAY_MS, type ReportRange } from '@/lib/reportRange'
import { formatCurrency } from '@/lib/utils'

export default function DashboardSalesTrend({ rows, range }: { rows: SalesSummaryRow[]; range: ReportRange }) {
  if (!rows.length) {
    return <p className="grid h-52 place-items-center text-sm text-muted-foreground">{t('reportNoSalesInPeriod')}</p>
  }

  const hourly = range.from === range.to
  const revenues = new Map(rows.map(row => [
    hourly ? Number(row.key.slice(0, 2)) : Date.parse(row.key), row.revenue,
  ]))
  const start = hourly ? 0 : Date.parse(range.from)
  const end = hourly ? 23 : Date.parse(range.to)
  const positions = hourly ? Array.from({ length: 24 }, (_, hour) => hour) : dailyPositions(start, end, revenues)
  const points = positions.map(position => ({ position, revenue: revenues.get(position) ?? 0 }))
  const date = new Intl.DateTimeFormat(activeLocale(), { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const amount = new Intl.NumberFormat(activeLocale(), { notation: 'compact' })
  const label = (position: number) => hourly ? `${String(position).padStart(2, '0')}:00` : date.format(position)
  const ticks = hourly ? [0, 4, 8, 12, 16, 20, 23] : dailyTicks(start, end)

  return (
    <ResponsiveContainer width="100%" height={235} minWidth={0} initialDimension={{ width: 500, height: 235 }}>
      <AreaChart data={points} margin={{ top: 10, right: 14, bottom: 2, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis type="number" dataKey="position" domain={[start, end]} ticks={ticks} tickFormatter={label}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis width={52} tickFormatter={value => amount.format(value)}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip
          labelFormatter={value => label(Number(value))}
          formatter={value => [formatCurrency(Number(value)), t('ssmColRevenue')]}
          contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)', borderRadius: 12, fontSize: 12 }}
          itemStyle={{ color: 'var(--foreground)' }}
        />
        <Area dataKey="revenue" stroke="var(--primary)" strokeWidth={2.5}
          fill="var(--primary)" fillOpacity={0.12} isAnimationActive={false}
          activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function dailyPositions(start: number, end: number, revenues: Map<number, number>): number[] {
  const dates = [...new Set([start, ...revenues.keys(), end])].sort((a, b) => a - b)
  const positions = [dates[0]]
  for (let i = 1; i < dates.length; i++) {
    const firstGapDay = dates[i - 1] + REPORT_DAY_MS
    const lastGapDay = dates[i] - REPORT_DAY_MS
    // Two zero points are enough to draw a period without sales.
    if (firstGapDay <= lastGapDay) positions.push(firstGapDay)
    if (firstGapDay < lastGapDay) positions.push(lastGapDay)
    positions.push(dates[i])
  }
  return positions
}

function dailyTicks(start: number, end: number): number[] {
  const days = (end - start) / REPORT_DAY_MS
  const step = Math.max(1, Math.ceil(days / 5))
  const ticks = Array.from({ length: Math.ceil(days / step) }, (_, i) => start + i * step * REPORT_DAY_MS)
  return [...ticks, end]
}
