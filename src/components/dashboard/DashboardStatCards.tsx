import { ShoppingCart, TrendingUp, Package, Users } from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import { formatCurrency } from '@/lib/utils'
import type { TodaySummary } from '@/types'

interface DashboardStatCardsProps {
  summary: TodaySummary | undefined
  totalBusinesses: number
  loading: boolean
}

export default function DashboardStatCards({ summary, totalBusinesses, loading }: DashboardStatCardsProps) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        title="Pendapatan Hari Ini"
        value={formatCurrency(summary?.total_revenue ?? 0)}
        icon={<TrendingUp size={20} />}
        color="green"
        loading={loading}
      />
      <StatCard
        title="Order Hari Ini"
        value={summary?.total_orders ?? 0}
        icon={<ShoppingCart size={20} />}
        color="blue"
        loading={loading}
      />
      <StatCard
        title="Item Terjual"
        value={summary?.total_items ?? 0}
        icon={<Package size={20} />}
        color="purple"
        loading={loading}
      />
      <StatCard
        title="Total Bisnis"
        value={totalBusinesses}
        icon={<Users size={20} />}
        color="orange"
      />
    </div>
  )
}
