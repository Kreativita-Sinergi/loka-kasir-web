import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Package, PiggyBank, ShoppingCart, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getSalesSummary, type SalesSummaryGroup } from '@/api/salesReports'
import { getProfitSummary, getSoldProducts } from '@/api/transactions'
import DashboardSalesTrend from '@/components/dashboard/DashboardSalesTrend'
import ReportDateRange from '@/components/reports/ReportDateRange'
import { Button } from '@/components/ui/button'
import OutletSelector from '@/components/ui/OutletSelector'
import QueryErrorState from '@/components/ui/QueryErrorState'
import StatCard from '@/components/ui/StatCard'
import { PERMS, usePermissions } from '@/hooks/usePermissions'
import { activeLocale, t } from '@/lib/i18n'
import { formatQuantity } from '@/lib/money'
import { businessTodayISO, isReportDate, offsetReportDate, previousReportRange, type ReportRange } from '@/lib/reportRange'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { SoldProduct } from '@/types'

const presets = { today: 'dashToday', week: 'rptPeriod7', month: 'dashMonthToDate', custom: 'dashCustomPeriod' } as const
type Preset = keyof typeof presets

function changeLabel(current: number, previous: number, period: string, format: (value: number) => string) {
  const delta = current - previous
  const sign = delta > 0 ? '+' : ''
  // A zero baseline has no percentage change. Show the absolute change.
  const value = previous === 0
    ? `${sign}${format(delta)}`
    : new Intl.NumberFormat(activeLocale(), {
      style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero',
    }).format(delta / Math.abs(previous))
  const color = delta > 0 ? 'text-success' : delta < 0 ? 'text-destructive' : ''
  return <><span className={`font-semibold ${color}`}>{value}</span> {t('dashComparePeriod', { previous: period })}</>
}

export default function DashboardSalesOverview({ outletId }: { outletId?: string }) {
  const timezone = useAuthStore(state => state.user?.business?.timezone)
  const today = businessTodayISO(timezone)
  const { can } = usePermissions()
  const [preset, setPreset] = useState<Preset>('today')
  const [custom, setCustom] = useState<ReportRange>({ from: today, to: today })
  const [draft, setDraft] = useState(custom)
  const [rankBy, setRankBy] = useState<'units_sold' | 'revenue'>('units_sold')
  const from = preset === 'week' ? offsetReportDate(today, -6) : preset === 'month' ? `${today.slice(0, 7)}-01` : today
  const range = preset === 'custom' ? custom : { from, to: today }
  const previous = previousReportRange(range)
  const params = { start_date: range.from, end_date: range.to, outlet_id: outletId }
  const previousParams = previous && { start_date: previous.from, end_date: previous.to, outlet_id: outletId }
  const timeGroup = range.from === range.to ? 'hour' : 'day'
  const validDraft = isReportDate(draft.from) && isReportDate(draft.to) && draft.from <= draft.to && draft.to <= today

  const profit = useQuery({
    queryKey: ['profit-summary', { outlet_id: outletId, startDate: range.from, endDate: range.to }],
    queryFn: () => getProfitSummary(params),
    select: response => response.data.data,
  })
  const previousProfit = useQuery({
    queryKey: ['profit-summary', { outlet_id: outletId, startDate: previous?.from, endDate: previous?.to }],
    queryFn: () => getProfitSummary(previousParams),
    enabled: !!previousParams,
    select: response => response.data.data,
  })
  const products = useQuery({
    queryKey: ['sold-products', { outlet_id: outletId, startDate: range.from, endDate: range.to }],
    queryFn: () => getSoldProducts(params),
    select: response => response.data.data,
  })
  const trend = useQuery({
    queryKey: ['sales-summary', timeGroup, range.from, range.to, outletId],
    queryFn: () => getSalesSummary({ ...params, group_by: timeGroup }),
    select: response => response.data.data,
  })
  const categories = useQuery({
    queryKey: ['sales-summary', 'category', range.from, range.to, outletId],
    queryFn: () => getSalesSummary({ ...params, group_by: 'category' }),
    select: response => response.data.data,
  })

  const rankedProducts = rankProducts(products.data ?? [], rankBy)
  const itemsSold = rankedProducts.reduce((total, product) => total + product.units_sold, 0)
  const { data: now } = profit
  const { data: before } = previousProfit
  const dateFormatter = new Intl.DateTimeFormat(activeLocale(), { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const baseline = previous && dateFormatter.formatRange(new Date(previous.from), new Date(previous.to))
  const compare = (current: number | undefined, past: number | undefined, format: (value: number) => string) =>
    current != null && past != null && baseline ? changeLabel(current, past, baseline, format) : null
  const summaryLink = (group: SalesSummaryGroup) =>
    `/reports/sales-summary?${new URLSearchParams({ group, start_date: range.from, end_date: range.to })}`
  const productLink = `/transactions?${new URLSearchParams({ tab: 'products', start_date: range.from, end_date: range.to })}`
  const categoryRows = categories.data?.rows.slice(0, 6) ?? []
  const largestCategory = Math.max(0, ...categoryRows.map(row => Math.abs(row.revenue)))

  return (
    <section aria-labelledby="dashboard-sales" className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="dashboard-sales" className="font-semibold text-foreground">{t('dashSalesOverview')}</h2>
          <ReportLink to={summaryLink(timeGroup)} label={t('navSalesReports')} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="min-w-44 max-w-full flex-1 sm:flex-none"><OutletSelector /></div>
          <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1" role="group" aria-label={t('labelPeriod')}>
            {(Object.keys(presets) as Preset[]).map(key => (
              <Button key={key} type="button" variant={preset === key ? 'outline' : 'ghost'} size="sm"
                aria-pressed={preset === key} onClick={() => setPreset(key)}>
                {t(presets[key])}
              </Button>
            ))}
          </div>
        </div>
        {preset === 'custom' && (
          <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={event => {
            event.preventDefault()
            if (validDraft) setCustom(draft)
          }}>
            <ReportDateRange {...draft} maxDate={today} onChange={setDraft} />
            <Button type="submit" size="sm" disabled={!validDraft}>{t('actionApply')}</Button>
          </form>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {dateFormatter.formatRange(new Date(range.from), new Date(range.to))}
        </p>
      </div>

      <QueryErrorState error={profit.error ?? previousProfit.error} onRetry={() => {
        if (profit.error) void profit.refetch()
        if (previousProfit.error) void previousProfit.refetch()
      }} />
      <div className="grid grid-cols-1 min-[350px]:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard title={t('ssmColRevenue')} value={now ? formatCurrency(now.total_revenue) : '—'} icon={<TrendingUp />}
          color="green" loading={profit.isLoading} emphasis
          subtitle={<>
            {compare(now?.total_revenue, before?.total_revenue, formatCurrency)}
            {now && now.total_transactions > 0 && <span className="block">{t('dashAverageReceipt', { amount: formatCurrency(now.total_revenue / now.total_transactions) })}</span>}
          </>} />
        <StatCard title={t('txGrossProfit')} value={now ? formatCurrency(now.gross_profit) : '—'} icon={<PiggyBank />}
          color="orange" loading={profit.isLoading}
          subtitle={<>
            {compare(now?.gross_profit, before?.gross_profit, formatCurrency)}
            {!!now?.missing_cost_count && <span className="block">{t('dashMissingCosts', { count: formatQuantity(now.missing_cost_count) })}</span>}
          </>} />
        <StatCard title={t('labelTransactions')} value={now ? formatQuantity(now.total_transactions) : '—'} icon={<ShoppingCart />}
          color="blue" loading={profit.isLoading}
          subtitle={compare(now?.total_transactions, before?.total_transactions, formatQuantity)} />
        <StatCard title={t('dashItemsSold')} value={products.data ? formatQuantity(itemsSold) : '—'}
          icon={<Package />} color="purple" loading={products.isLoading} />
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-semibold">{t(timeGroup === 'hour' ? 'dashHourlySales' : 'dashDailySales')}</h3>
        </div>
        {trend.error ? <QueryErrorState error={trend.error} onRetry={trend.refetch} /> : (
          <div className="min-w-0 p-3">
            {trend.isLoading ? <Skeleton /> : <DashboardSalesTrend rows={trend.data?.rows ?? []} range={range} />}
          </div>
        )}
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h3 className="font-semibold">{t('dashTopProducts')}</h3>
            {can(PERMS.POS_CREATE_ORDER) && <ReportLink to={productLink} label={t('ssmColDetail')} />}
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('dashTopProducts')}>
              {(['units_sold', 'revenue'] as const).map(key => (
                <Button key={key} type="button" variant={rankBy === key ? 'outline' : 'ghost'} size="sm"
                  aria-pressed={rankBy === key} onClick={() => setRankBy(key)}>
                  {t(key === 'units_sold' ? 'dashTopByUnits' : 'dashTopByRevenue')}
                </Button>
              ))}
            </div>
            {products.error ? <QueryErrorState error={products.error} onRetry={products.refetch} /> :
              products.isLoading ? <Skeleton /> : !rankedProducts.length ? <NoSales /> : (
                <ol className="mt-2 divide-y divide-border">
                  {rankedProducts.slice(0, 10).map(row => (
                    <li key={row.product_id} className="flex items-baseline justify-between gap-4 py-2 text-sm">
                      <span className="min-w-0 break-words">{row.product_name}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{rankBy === 'revenue' ? formatCurrency(row.revenue) : formatQuantity(row.units_sold)}</span>
                    </li>
                  ))}
                </ol>
              )}
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h3 className="font-semibold">{t('dashCategorySales')}</h3>
            <ReportLink to={summaryLink('category')} label={t('ssmColDetail')} />
          </div>
          <div className="p-4">
            {categories.error ? <QueryErrorState error={categories.error} onRetry={categories.refetch} /> :
              categories.isLoading ? <Skeleton /> : !categoryRows.length ? <NoSales /> : (
                <ul className="space-y-4">
                  {categoryRows.map(row => (
                    <li key={row.key}>
                      <div className="flex items-baseline justify-between gap-4 text-sm">
                        <span className="min-w-0 break-words">{row.label || t('ssmNoneCategory')}</span>
                        <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(row.revenue)}</span>
                      </div>
                      <div aria-hidden="true" className="mt-1.5 h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary/70" style={{ width: `${largestCategory ? Math.abs(row.revenue) / largestCategory * 100 : 0}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </div>
      </div>
    </section>
  )
}

function ReportLink({ to, label }: { to: string; label: string }) {
  return <Link to={to} className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-primary hover:underline">
    {label}<ArrowUpRight aria-hidden="true" size={14} />
  </Link>
}

function Skeleton() {
  return <div aria-hidden="true" className="h-44 animate-pulse rounded-xl bg-muted" />
}

function NoSales() {
  return <p className="py-10 text-center text-sm text-muted-foreground">{t('reportNoSalesInPeriod')}</p>
}

function rankProducts(products: SoldProduct[], rankBy: 'units_sold' | 'revenue') {
  // Older receipts retain the name at the time of sale. Combine their totals
  // with other receipts for the same product before choosing the top ten.
  const totals = new Map<string, SoldProduct>()
  for (const product of products) {
    const total = totals.get(product.product_id)
    if (total) {
      total.units_sold += product.units_sold
      total.revenue += product.revenue
    } else {
      totals.set(product.product_id, { ...product })
    }
  }
  return [...totals.values()].sort((a, b) => b[rankBy] - a[rankBy] || a.product_name.localeCompare(b.product_name))
}
