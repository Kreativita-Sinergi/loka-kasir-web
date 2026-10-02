import { Link, useLocation } from 'react-router-dom'
import { Crown } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { navLabel } from './navItems'
import { findNavigationHub, sectionItems, type NavigationHub } from './navigationHubs'
import { useNavigationItems } from './useNavigationItems'

export default function HubNavigation() {
  const { pathname } = useLocation()
  const hub = findNavigationHub(pathname)
  return hub ? <HubTabs hub={hub} pathname={pathname} /> : null
}

function HubTabs({ hub, pathname }: { hub: NavigationHub; pathname: string }) {
  const accessible = useNavigationItems()
  const { isPro } = usePermissions()
  const sections = hub.sections.map(section => ({ ...section, items: sectionItems(section, accessible) }))
    .filter(section => section.items.length > 0)
  const current = sections.find(section => section.paths.includes(pathname))
  if (!current) return null

  const linkClass = (active: boolean) => cn(
    'inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors',
    active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
  )
  return (
    <div className="shrink-0 border-b border-border bg-card px-2 sm:px-4 lg:px-6">
      {sections.length > 1 && (
        <nav aria-label={t(hub.labelKey)} className="flex gap-1 overflow-x-auto">
          {sections.map(section => {
            const destination = section.items.find(item => !item.planRequired || isPro) ?? section.items[0]
            const active = section === current
            return <Link key={section.labelKey} to={destination.path} aria-current={active ? 'true' : undefined} className={linkClass(active)}>{t(section.labelKey)}</Link>
          })}
        </nav>
      )}
      {current.items.length > 1 && (
        <nav aria-label={t(current.labelKey)} className={cn('flex gap-1 overflow-x-auto', sections.length > 1 && 'border-t border-border/60')}>
          {current.items.map(item => (
            <Link key={item.path} to={item.path} aria-current={pathname === item.path ? 'page' : undefined} className={linkClass(pathname === item.path)}>
              {navLabel(item)}
              {item.planRequired === 'pro' && !isPro && <Crown size={12} className="text-warning" aria-label="Pro" />}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}
