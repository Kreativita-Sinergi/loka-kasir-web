import { Link, useLocation } from 'react-router-dom'
import { Crown, PanelLeftOpen } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { useUIStore } from '@/store/uiStore'
import { navLabel } from './navItems'
import { findNavigationHub, hubPaths, sectionItems, type NavigationHub } from './navigationHubs'
import { useNavigationItems } from './useNavigationItems'

export default function HubNavigation() {
  const { pathname } = useLocation()
  const hub = findNavigationHub(pathname)
  if (!hub) return null
  if (hub.sidebarMenuLabel) return <SidebarShortcut hub={hub} />
  return <HubTabs hub={hub} pathname={pathname} />
}

function SidebarShortcut({ hub }: { hub: NavigationHub }) {
  const accessible = useNavigationItems()
  const { sidebarCollapsed, toggleSidebarCollapsed, openMobileSidebar } = useUIStore()
  const paths = hubPaths(hub)
  if (!hub.sidebarMenuLabel || accessible.filter(item => paths.includes(item.path)).length < 2) return null

  const label = t(hub.sidebarMenuLabel)
  const buttonClass = 'min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-primary transition-colors hover:bg-primary-subtle'
  return (
    <div className={cn('shrink-0 border-b border-border bg-card px-2 py-1 sm:px-4 lg:px-6', !sidebarCollapsed && 'lg:hidden')}>
      <button type="button" className={cn(buttonClass, 'inline-flex lg:hidden')} onClick={openMobileSidebar}>
        <PanelLeftOpen size={16} aria-hidden="true" />{label}
      </button>
      {sidebarCollapsed && (
        <button type="button" className={cn(buttonClass, 'hidden lg:inline-flex')} onClick={toggleSidebarCollapsed}>
          <PanelLeftOpen size={16} aria-hidden="true" />{label}
        </button>
      )}
    </div>
  )
}

function HubTabs({ hub, pathname }: { hub: NavigationHub; pathname: string }) {
  const accessible = useNavigationItems()
  const { isPro } = usePermissions()
  const sections = hub.sections.map(section => ({ ...section, items: sectionItems(section, accessible) }))
    .filter(section => section.items.length > 0)
  const current = sections.find(section => section.paths.includes(pathname))
  // Hanya satu halaman yang boleh dibuka: tidak ada yang perlu dipilih, jadi
  // baris tab kosong tidak perlu memakan tinggi layar.
  if (!current || (sections.length === 1 && current.items.length === 1)) return null

  // Satu baris, bukan dua: bagian hub (Produk · Stok · Pembelian) tampil
  // sebagai tombol segmen seperti SegmentedTabs di aplikasi, lalu halaman di
  // bagian itu sebagai tab bergaris bawah. Dua baris tab dulu memakan ±90px
  // tinggi layar sebelum isi halaman mulai.
  const segmentClass = (active: boolean) => cn(
    'inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-lg px-3 text-[13px] font-semibold transition-colors',
    active ? 'bg-card text-primary shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
  )
  const tabClass = (active: boolean) => cn(
    'inline-flex h-12 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-[13px] font-semibold transition-colors',
    active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
  )
  return (
    <div className="flex h-12 shrink-0 items-center gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-border bg-card px-2 sm:px-4 lg:px-6">
      {sections.length > 1 && (
        <nav aria-label={t(hub.labelKey)} className="flex shrink-0 items-center gap-0.5 rounded-[10px] bg-muted p-1">
          {sections.map(section => {
            const destination = section.items.find(item => !item.planRequired || isPro) ?? section.items[0]
            const active = section === current
            return <Link key={section.labelKey} to={destination.path} aria-current={active ? 'true' : undefined} className={segmentClass(active)}>{t(section.labelKey)}</Link>
          })}
        </nav>
      )}
      {sections.length > 1 && current.items.length > 1 && <span aria-hidden="true" className="h-6 w-px shrink-0 bg-border" />}
      {current.items.length > 1 && (
        <nav aria-label={t(current.labelKey)} className="flex shrink-0 gap-1">
          {current.items.map(item => (
            <Link key={item.path} to={item.path} aria-current={pathname === item.path ? 'page' : undefined} className={tabClass(pathname === item.path)}>
              {navLabel(item)}
              {item.planRequired === 'pro' && !isPro && <Crown size={12} className="text-warning" aria-label="Pro" />}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}
