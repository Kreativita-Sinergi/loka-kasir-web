import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Menu, Package, ReceiptText } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useUIStore } from '@/store/uiStore'
import { NAV_ITEMS, roleAllowsNav } from './navItems'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { findNavigationHub, hubPaths } from './navigationHubs'

export default function MobileNavigation() {
  const { can, canAny, roleCode } = usePermissions()
  const { openMobileSidebar, mobileSidebarOpen } = useUIStore()
  const { pathname } = useLocation()
  const destinations = [
    { path: '/', label: t('navHome'), icon: LayoutDashboard },
    { path: '/transactions', label: t('mobileNavTransactions'), icon: ReceiptText },
    { path: '/products', label: t('mobileNavProducts'), icon: Package },
  ].filter(({ path }) => {
    const item = NAV_ITEMS.find(item => item.path === path)
    if (!item || !roleAllowsNav(item, roleCode)) return false
    if (item.anyOf?.length) return canAny(...item.anyOf)
    return !item.permission || can(item.permission)
  })
  const destinationActive = (path: string) => {
    const hub = findNavigationHub(path)
    return (hub && hubPaths(hub).includes(pathname)) || pathname === path || (path !== '/' && pathname.startsWith(`${path}/`))
  }
  const inMore = !destinations.some(item => destinationActive(item.path))
  const itemClass = 'flex min-h-14 flex-1 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-semibold transition-colors'

  return (
    <nav aria-label={t('mobileNavLabel')} className="mobile-navigation flex shrink-0 gap-1 border-t border-border bg-card px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] lg:hidden">
      {destinations.map(({ path, label, icon: Icon }) => (
        <Link key={path} to={path} aria-current={destinationActive(path) ? 'page' : undefined} className={cn(itemClass, destinationActive(path) ? 'bg-primary-subtle text-primary' : 'text-muted-foreground hover:bg-muted')}>
          <Icon size={20} aria-hidden="true" /><span>{label}</span>
        </Link>
      ))}
      <button type="button" onClick={openMobileSidebar} aria-label={t('openMenu')} aria-expanded={mobileSidebarOpen} className={cn(itemClass, inMore || mobileSidebarOpen ? 'bg-primary-subtle text-primary' : 'text-muted-foreground hover:bg-muted')}>
        <Menu size={20} aria-hidden="true" /><span>{t('mobileNavMenu')}</span>
      </button>
    </nav>
  )
}
