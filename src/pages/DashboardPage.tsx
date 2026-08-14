import { useQuery } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import DashboardStatCards from '@/components/dashboard/DashboardStatCards'
import SetupChecklistCard from '@/components/dashboard/SetupChecklistCard'
import InstallAppCard from '@/components/dashboard/InstallAppCard'
import RecentTransactionsList from '@/components/dashboard/RecentTransactionsList'
import TopProductsChart from '@/components/dashboard/TopProductsChart'
import { getHomeData } from '@/api/home'
import { getTransactions } from '@/api/transactions'
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

  const summary = homeData?.data?.data?.today_summary
  const topProducts = homeData?.data?.data?.top_products ?? []
  const recentTx = txData?.data?.data?.results ?? []

  const subtitle = selectedOutlet
    ? `Penjualan dan aktivitas ${selectedOutlet.name} hari ini`
    : 'Penjualan dan aktivitas semua outlet hari ini'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Beranda" subtitle={subtitle} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

        {selectedOutlet && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 rounded-xl text-sm text-blue-700 dark:text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
            Data yang tampil hanya untuk outlet <span className="font-semibold">{selectedOutlet.name}</span>
          </div>
        )}

        <SetupChecklistCard />

        {/* Belum ada satu pun transaksi = aplikasi kasirnya belum dipakai. */}
        <InstallAppCard show={!txLoading && recentTx.length === 0} />

        <DashboardStatCards summary={summary} loading={homeLoading} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <RecentTransactionsList transactions={recentTx} loading={txLoading} outletName={selectedOutlet?.name} />
          <TopProductsChart products={topProducts} loading={homeLoading} />
        </div>
      </div>
    </div>
  )
}
