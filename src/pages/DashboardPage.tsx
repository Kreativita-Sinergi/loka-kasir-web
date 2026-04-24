import { useQuery } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import DashboardStatCards from '@/components/dashboard/DashboardStatCards'
import RecentTransactionsList from '@/components/dashboard/RecentTransactionsList'
import TopProductsChart from '@/components/dashboard/TopProductsChart'
import { getHomeData } from '@/api/home'
import { getTransactions } from '@/api/transactions'
import { getBusinesses } from '@/api/business'
import { useOutletStore } from '@/store/outletStore'

export default function DashboardPage() {
  const { selected: selectedOutlet } = useOutletStore()
  const outletId = selectedOutlet?.id

  const { data: homeData, isLoading: homeLoading } = useQuery({
    queryKey: ['home', outletId],
    queryFn: () => getHomeData(outletId ? { outlet_id: outletId } : undefined),
    retry: 1,
  })

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['transactions', { limit: 5, page: 1, outlet_id: outletId }],
    queryFn: () => getTransactions({ limit: 5, page: 1, outlet_id: outletId || undefined }),
  })

  const { data: bizData } = useQuery({
    queryKey: ['businesses', { limit: 1 }],
    queryFn: () => getBusinesses({ limit: 1, page: 1 }),
  })

  const summary = homeData?.data?.data?.today_summary
  const topProducts = homeData?.data?.data?.top_products ?? []
  const recentTx = txData?.data?.data?.results ?? []
  const totalBusinesses = bizData?.data?.pagination?.total ?? 0

  const subtitle = selectedOutlet
    ? `Ringkasan Performa ${selectedOutlet.name} Hari Ini`
    : 'Ringkasan Performa Semua Outlet Hari Ini'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Dashboard" subtitle={subtitle} />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {selectedOutlet && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
            Menampilkan Data untuk Outlet <span className="font-semibold">{selectedOutlet.name}</span>
          </div>
        )}

        <DashboardStatCards summary={summary} totalBusinesses={totalBusinesses} loading={homeLoading} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <RecentTransactionsList transactions={recentTx} loading={txLoading} outletName={selectedOutlet?.name} />
          <TopProductsChart products={topProducts} loading={homeLoading} />
        </div>
      </div>
    </div>
  )
}
