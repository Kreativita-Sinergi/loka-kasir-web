import { ShoppingCart, TrendingUp, Package } from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import { formatCurrency } from '@/lib/utils'
import type { TodaySummary } from '@/types'
import { t } from '@/lib/i18n'

interface DashboardStatCardsProps {
  summary: TodaySummary | undefined
  loading: boolean
}

export default function DashboardStatCards({ summary, loading }: DashboardStatCardsProps) {
  return (
    <div className="grid grid-cols-1 min-[480px]:grid-cols-3 gap-4">
      <StatCard
        title={t('dashRevenueToday')}
        value={formatCurrency(summary?.total_revenue ?? 0)}
        icon={<TrendingUp size={20} />}
        color="green"
        loading={loading}
      />
      <StatCard
        title={t('dashTxToday')}
        value={summary?.total_orders ?? 0}
        icon={<ShoppingCart size={20} />}
        color="blue"
        loading={loading}
      />
      <StatCard
        title={t('dashItemsSold')}
        value={summary?.total_items ?? 0}
        icon={<Package size={20} />}
        color="purple"
        loading={loading}
      />
    </div>
  )
}
