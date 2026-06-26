import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Store, Package, Users, Monitor, ChevronRight } from 'lucide-react'
import Header from '@/components/layout/Header'
import DashboardStatCards from '@/components/dashboard/DashboardStatCards'
import RecentTransactionsList from '@/components/dashboard/RecentTransactionsList'
import TopProductsChart from '@/components/dashboard/TopProductsChart'
import { getHomeData } from '@/api/home'
import { getTransactions } from '@/api/transactions'
import { getBusinesses } from '@/api/business'
import { useOutletStore } from '@/store/outletStore'

const SETUP_STEPS = [
  { icon: Store,   label: 'Buat outlet',          desc: 'Lokasi toko fisik Anda',                  path: '/outlets' },
  { icon: Package, label: 'Tambah produk',         desc: 'Produk yang akan dijual di kasir',         path: '/products' },
  { icon: Users,   label: 'Daftarkan karyawan',    desc: 'Kasir, manager, dan staf toko',            path: '/employees' },
  { icon: Monitor, label: 'Buat terminal kasir',   desc: 'Hubungkan perangkat ke App Kasir',         path: '/master/terminals' },
]

function OnboardingCard() {
  const navigate = useNavigate()
  return (
    <div className="bg-card border border-blue-100 rounded-2xl p-5">
      <div className="mb-4">
        <h3 className="text-base font-bold text-foreground">Mulai siapkan toko Anda</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Selesaikan 4 langkah berikut agar kasir bisa mulai bertransaksi.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SETUP_STEPS.map(({ icon: Icon, label, desc, path }, i) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-blue-200 dark:border-blue-500/20 hover:bg-blue-50 dark:bg-blue-500/10 text-left transition group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 group-hover:bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center shrink-0 transition">
              <Icon size={15} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-blue-400">{i + 1}</span>
                <p className="text-sm font-semibold text-foreground">{label}</p>
              </div>
              <p className="text-xs text-muted-foreground truncate">{desc}</p>
            </div>
            <ChevronRight size={14} className="text-muted-foreground group-hover:text-blue-400 shrink-0 transition" />
          </button>
        ))}
      </div>
    </div>
  )
}

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

  const isNewAccount = !homeLoading && !txLoading && topProducts.length === 0 && recentTx.length === 0

  const subtitle = selectedOutlet
    ? `Ringkasan Performa ${selectedOutlet.name} Hari Ini`
    : 'Ringkasan Performa Semua Outlet Hari Ini'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Dashboard" subtitle={subtitle} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

        {selectedOutlet && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 rounded-xl text-sm text-blue-700 dark:text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
            Menampilkan Data untuk Outlet <span className="font-semibold">{selectedOutlet.name}</span>
          </div>
        )}

        {isNewAccount && <OnboardingCard />}

        <DashboardStatCards summary={summary} totalBusinesses={totalBusinesses} loading={homeLoading} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <RecentTransactionsList transactions={recentTx} loading={txLoading} outletName={selectedOutlet?.name} />
          <TopProductsChart products={topProducts} loading={homeLoading} />
        </div>
      </div>
    </div>
  )
}
