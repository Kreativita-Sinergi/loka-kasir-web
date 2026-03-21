import { useQuery } from '@tanstack/react-query'
import { ShoppingCart, TrendingUp, Package, Users } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import Badge from '@/components/ui/Badge'
import { getHomeData } from '@/api/home'
import { getTransactions } from '@/api/transactions'
import { getBusinesses } from '@/api/business'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export default function DashboardPage() {
  const { data: homeData, isLoading: homeLoading } = useQuery({
    queryKey: ['home'],
    queryFn: () => getHomeData(),
    retry: 1,
  })

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['transactions', { limit: 5, page: 1 }],
    queryFn: () => getTransactions({ limit: 5, page: 1 }),
  })

  const { data: bizData } = useQuery({
    queryKey: ['businesses', { limit: 1 }],
    queryFn: () => getBusinesses({ limit: 1, page: 1 }),
  })

  const summary = homeData?.data?.data?.today_summary
  const topProducts = homeData?.data?.data?.top_products ?? []
  const recentTx = txData?.data?.data?.results ?? []
  const totalBusinesses = bizData?.data?.pagination?.total ?? 0

  const statusBadge = (tx: { is_canceled: boolean; is_refunded: boolean; status: string }) => {
    if (tx.is_canceled) return <Badge variant="red">Dibatalkan</Badge>
    if (tx.is_refunded) return <Badge variant="yellow">Direfund</Badge>
    if (tx.status === 'paid') return <Badge variant="green">Lunas</Badge>
    return <Badge variant="blue">Pending</Badge>
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Dashboard" subtitle="Ringkasan performa platform hari ini" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Stat Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Pendapatan Hari Ini"
            value={formatCurrency(summary?.total_revenue ?? 0)}
            icon={<TrendingUp size={20} />}
            color="green"
            loading={homeLoading}
          />
          <StatCard
            title="Order Hari Ini"
            value={summary?.total_orders ?? 0}
            icon={<ShoppingCart size={20} />}
            color="blue"
            loading={homeLoading}
          />
          <StatCard
            title="Item Terjual"
            value={summary?.total_items ?? 0}
            icon={<Package size={20} />}
            color="purple"
            loading={homeLoading}
          />
          <StatCard
            title="Total Bisnis"
            value={totalBusinesses}
            icon={<Users size={20} />}
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Transaksi Terbaru</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {txLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    <div className="h-4 flex-1 bg-gray-100 rounded animate-pulse" />
                  </div>
                ))
              ) : recentTx.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">Belum ada transaksi</div>
              ) : (
                recentTx.map((tx) => (
                  <div key={tx.transaction_id} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">#{tx.bill_number}</p>
                      <p className="text-xs text-gray-400">{formatDateTime(tx.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {statusBadge(tx)}
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(tx.final_price)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Products Chart */}
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Produk Terlaris</h2>
            </div>
            {homeLoading ? (
              <div className="p-5 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">Belum ada data</div>
            ) : (
              <div className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 0, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="product_name"
                      tick={{ fontSize: 11 }}
                      width={90}
                      tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + '…' : v}
                    />
                    <Tooltip
                      formatter={(v) => [v, 'Order']}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="order_count" fill="#3b82f6" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
