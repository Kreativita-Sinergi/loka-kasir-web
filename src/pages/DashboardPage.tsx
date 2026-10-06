import { useQuery } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import DashboardStatCards from '@/components/dashboard/DashboardStatCards'
import SetupChecklistCard from '@/components/dashboard/SetupChecklistCard'
import InstallAppCard from '@/components/dashboard/InstallAppCard'
import RecentTransactionsList from '@/components/dashboard/RecentTransactionsList'
import TopProductsChart from '@/components/dashboard/TopProductsChart'
import ActionCenterCard from '@/components/dashboard/ActionCenterCard'
import { getHomeData } from '@/api/home'
import { getTransactions } from '@/api/transactions'
import { useOutletStore } from '@/store/outletStore'
import { t } from '@/lib/i18n'
import { activeLocale } from '@/lib/i18n'
import { useAuthStore } from '@/store/authStore'
import { usePermissions } from '@/hooks/usePermissions'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { NAV_ITEMS, navLabel, navDescription, roleAllowsNav } from '@/components/layout/navItems'
import QueryErrorState from '@/components/ui/QueryErrorState'

export default function DashboardPage() {
  const { selected: selectedOutlet } = useOutletStore()
  const outletId = selectedOutlet?.id
  const businessName = useAuthStore(state => state.user?.business?.business_name)
  const { can, canAny, roleCode } = usePermissions()
  const shortcuts = ['/transactions', '/products', '/inventory/current-stock', '/reports']
    .flatMap(path => NAV_ITEMS.filter(item => item.path === path))
    .filter(item => roleAllowsNav(item, roleCode) && (item.anyOf?.length ? canAny(...item.anyOf) : !item.permission || can(item.permission)))

  const { data: homeData, isLoading: homeLoading, error: homeError, refetch: reloadHome } = useQuery({
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
    ? t('dashOutletSubtitle', { outlet: selectedOutlet.name })
    : t('dashPageSubtitle')
  const today = new Intl.DateTimeFormat(activeLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())

  // Seperti header tablet aplikasi: nama usaha sebagai judul. Dulu judul
  // "Beranda" di header diulang lagi sebagai blok besar nama usaha + subjudul
  // yang sama, memakan ±110px sebelum angka pertama terlihat.
  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      <Header title={businessName || t('navHome')} subtitle={`${today} · ${subtitle}`} />
      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-5">
        <QueryErrorState error={homeError} onRetry={reloadHome} />
        <SetupChecklistCard />
        <DashboardStatCards summary={summary} loading={homeLoading} />

        <ActionCenterCard home={homeData?.data?.data} outletId={outletId} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <RecentTransactionsList transactions={recentTx} loading={txLoading} outletName={selectedOutlet?.name} />
          <TopProductsChart products={topProducts} loading={homeLoading} />
        </div>

        {shortcuts.length > 0 && <section aria-labelledby="dashboard-shortcuts">
          <h2 id="dashboard-shortcuts" className="mb-2.5 text-sm font-semibold">{t('dashQuickAccess')}</h2>
          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 xl:grid-cols-4 gap-3">
            {shortcuts.map(item => <Link key={item.path} to={item.path} title={navDescription(item)} className="group flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5 transition-colors hover:border-primary/40 hover:bg-primary-subtle/40">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{item.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{navLabel(item)}</span>
                <span className="block truncate text-xs text-muted-foreground">{navDescription(item)}</span>
              </span>
              <ArrowUpRight size={15} className="shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
            </Link>)}
          </div>
        </section>}
        <InstallAppCard show={!txLoading && recentTx.length === 0} />
      </div>
    </div>
  )
}
