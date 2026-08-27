import { ShoppingCart, TrendingUp, Package, PiggyBank } from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import { formatCurrency } from '@/lib/utils'
import { usePermissions, PERMS } from '@/hooks/usePermissions'
import type { TodaySummary } from '@/types'
import { t } from '@/lib/i18n'

interface DashboardStatCardsProps {
  summary: TodaySummary | undefined
  loading: boolean
}

export default function DashboardStatCards({ summary, loading }: DashboardStatCardsProps) {
  const { can } = usePermissions()

  // Laba menyingkap harga modal setiap produk, jadi kartunya mengikuti izin yang
  // sama dengan laporan keuangan — kasir dan koki melihat omzet, bukan margin.
  const showProfit = can(PERMS.REPORTS_FINANCIAL)

  return (
    <div className={'grid grid-cols-1 min-[480px]:grid-cols-3 gap-4 ' + (showProfit ? 'xl:grid-cols-4' : '')}>
      <StatCard
        title={t('dashRevenueToday')}
        value={formatCurrency(summary?.total_revenue ?? 0)}
        icon={<TrendingUp size={20} />}
        color="green"
        loading={loading}
      />
      {showProfit && (
        <StatCard
          title={t('dashProfitToday')}
          value={formatCurrency(summary?.gross_profit ?? 0)}
          icon={<PiggyBank size={20} />}
          color="orange"
          loading={loading}
        />
      )}
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
