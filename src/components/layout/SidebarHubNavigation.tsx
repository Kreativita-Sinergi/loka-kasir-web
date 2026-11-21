import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Crown } from 'lucide-react'

import { t } from '@/lib/i18n'
import type { MessageKey } from '@/lib/messages'
import { cn } from '@/lib/utils'
import { navLabel, type NavItem } from './navItems'
import { sectionItems, type NavigationHub } from './navigationHubs'

interface SidebarHubNavigationProps {
  hub: NavigationHub
  accessible: NavItem[]
  pathname: string
  isPro: boolean
  onClose?: () => void
}

export default function SidebarHubNavigation({ hub, accessible, pathname, isPro, onClose }: SidebarHubNavigationProps) {
  const sections = hub.sections.map(section => ({ ...section, items: sectionItems(section, accessible) }))
    .filter(section => section.items.length > 0)
  const allItems = sections.flatMap(section => section.items)
  const current = allItems.find(item => item.path === pathname)
    ?? allItems.filter(item => pathname.startsWith(item.path + '/'))
      .sort((a, b) => b.path.length - a.path.length)[0]
  const currentSection = sections.find(section => current && section.paths.includes(current.path))
  const [expanded, setExpanded] = useState<MessageKey | null>(currentSection?.labelKey ?? sections[0]?.labelKey ?? null)
  const id = useId()
  const activeLink = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    activeLink.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [pathname])

  if (allItems.length < 2) return null

  function pageLink(item: NavItem, groupLabel = false) {
    const active = item === current
    return (
      <Link
        key={item.path}
        ref={active ? activeLink : undefined}
        to={item.path}
        onClick={onClose}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex min-h-9 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] leading-snug transition-colors',
          groupLabel && 'font-semibold',
          active ? 'bg-primary/10 font-bold text-primary dark:bg-primary-subtle' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <span className="min-w-0 flex-1">{navLabel(item)}</span>
        {item.planRequired === 'pro' && !isPro && <Crown size={12} className="shrink-0 text-warning" aria-label="Pro" />}
      </Link>
    )
  }

  return (
    <div role="group" aria-label={t(hub.labelKey)} className="mt-1 ml-4 space-y-0.5 border-l border-border pl-2">
      {sections.map(section => {
        const open = section.labelKey === expanded
        const sectionId = id + '-' + section.labelKey
        return section.items.length === 1 ? pageLink(section.items[0], true) : (
          <div key={section.labelKey}>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={open ? sectionId : undefined}
              onClick={() => setExpanded(open ? null : section.labelKey)}
              className={cn(
                'flex min-h-9 w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[13px] font-semibold leading-snug transition-colors hover:bg-muted',
                currentSection === section ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="min-w-0 flex-1">{t(section.labelKey)}</span>
              <ChevronDown size={14} aria-hidden="true" className={cn('shrink-0 transition-transform motion-reduce:transition-none', !open && '-rotate-90')} />
            </button>
            {open && <div id={sectionId} className="ml-2 space-y-0.5">{section.items.map(item => pageLink(item))}</div>}
          </div>
        )
      })}
    </div>
  )
}
