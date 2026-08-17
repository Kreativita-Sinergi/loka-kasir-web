import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import InsightCards, { GrowthBadge } from '@/components/reports/InsightCards'
import RevenueTrendChart from '@/components/reports/RevenueTrendChart'
import PeakHoursChart from '@/components/reports/PeakHoursChart'
import { getRevenueTrend, getProductPerformance, getPeakHours, getInsights } from '@/api/analytics'
import { useOutletStore } from '@/store/outletStore'
import { formatCurrency } from '@/lib/utils'
import type { ProductPerformance } from '@/types'
import { t } from '@/lib/i18n'

export default function ReportsPage() {
  const { selected: selectedOutlet } = useOutletStore()
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly')

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['revenue-trend', period],
    queryFn: () => getRevenueTrend(period),
  })

  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ['product-performance'],
    queryFn: () => getProductPerformance({ limit: 10 }),
  })

  const { data: peakData, isLoading: peakLoading } = useQuery({
    queryKey: ['peak-hours'],
    queryFn: () => getPeakHours(),
  })

  const { data: insightsData } = useQuery({
    queryKey: ['insights'],
    queryFn: () => getInsights(),
  })

  const trends    = trendData?.data?.data ?? []
  const products  = productData?.data?.data ?? []
  const peakHours = peakData?.data?.data ?? []
  const insights  = insightsData?.data?.data?.insights ?? []

  const productColumns = [
    {
      key: 'product_name',
      label: t('labelProduct'),
      render: (row: ProductPerformance) => (
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{row.product_name}</p>
          {row.is_slow_moving && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 rounded-full">
              {t('badgeSlowMoving')}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'total_sold',
      label: t('labelSold'),
      render: (row: ProductPerformance) => <span className="text-sm text-foreground">{t('unitPcs', { count: row.total_sold })}</span>,
    },
    {
      key: 'total_revenue',
      label: t('labelRevenue'),
      render: (row: ProductPerformance) => (
        <span className="text-sm font-semibold text-foreground">{formatCurrency(row.total_revenue)}</span>
      ),
    },
    {
      key: 'growth',
      label: t('labelTrend'),
      render: (row: ProductPerformance) => <GrowthBadge pct={row.growth_percentage} />,
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title={t('navSalesReports')}
        subtitle={selectedOutlet ? t('reportSubtitleOutlet', { outlet: selectedOutlet.name }) : t('reportPageSubtitle')}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

        <InsightCards insights={insights} />

        <RevenueTrendChart trends={trends} loading={trendLoading} period={period} setPeriod={setPeriod} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border border-border">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-sm font-semibold text-foreground">{t('reportProductPerformance')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('reportTopTen')}</p>
            </div>
            <DataTable
              columns={productColumns as never[]}
              data={products as never[]}
              loading={productLoading}
              emptyMessage={t('reportNoSalesInPeriod')}
            />
          </div>

          <PeakHoursChart peakHours={peakHours} loading={peakLoading} />
        </div>

      </div>
    </div>
  )
}
