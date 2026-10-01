import { useEffect, useId, useRef, useState } from 'react'
import { Bell, RefreshCw, Moon, Sun, Menu, Search, MoreHorizontal, GitBranch } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getUnreadCount } from '@/api/notifications'
import { useThemeStore } from '@/store/themeStore'
import { useUIStore } from '@/store/uiStore'
import { useOutletStore } from '@/store/outletStore'
import { Button } from '@/components/ui/button'
import CurrencyMenu from '@/components/ui/CurrencyMenu'
import LanguageMenu from '@/components/ui/LanguageMenu'
import { t } from '@/lib/i18n'
import { NAV_ITEMS, navGroupLabel } from './navItems'

interface HeaderProps { title: string; subtitle?: string }

export default function Header({ title, subtitle }: HeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const section = NAV_ITEMS.find(item => item.path === location.pathname)?.group
  const qc = useQueryClient()
  const { theme, toggleTheme } = useThemeStore()
  const { openMobileSidebar } = useUIStore()
  const outlet = useOutletStore(state => state.selected)
  const [refreshing, setRefreshing] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const moreId = useId()
  const { data } = useQuery({ queryKey: ['unread-count'], queryFn: getUnreadCount, refetchInterval: 30000, retry: false })
  const unreadCount = data?.data?.data?.count ?? 0
  useEffect(() => {
    if (!moreOpen) return
    const closeOutside = (event: PointerEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMoreOpen(false) }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeOnEscape) }
  }, [moreOpen])
  const handleRefresh = async () => {
    setRefreshing(true)
    try { await qc.invalidateQueries({ type: 'active' }) } finally { setRefreshing(false) }
  }
  const search = () => { setMoreOpen(false); window.dispatchEvent(new Event('open-command-palette')) }
  const themeLabel = theme === 'dark' ? t('loginUseLightTheme') : t('loginUseDarkTheme')

  return (
    <header className="operations-header relative z-30 flex min-h-18 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-2 py-2 sm:px-4 lg:min-h-20 lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-3">
        <Button variant="ghost" size="icon" onClick={openMobileSidebar} className="lg:hidden" aria-label={t('openMenu')}><Menu size={20} /></Button>
        <div className="min-w-0">
          {section && <p className="hidden lg:block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-0.5">{navGroupLabel(section)}</p>}
          <h1 className="break-words text-sm font-semibold tracking-tight leading-snug text-foreground sm:text-base lg:truncate lg:text-xl">{title}</h1>
          {subtitle && <p className="hidden text-xs text-muted-foreground lg:block lg:truncate" title={subtitle}>{subtitle}</p>}
          <button type="button" onClick={openMobileSidebar} className="mt-0.5 flex min-h-6 max-w-full min-w-0 items-center gap-1 text-xs text-muted-foreground lg:hidden"
            aria-label={`${t('sidebarActiveOutlet')}: ${outlet?.name ?? t('labelAllOutlets')}`}>
            <GitBranch size={12} className="shrink-0" /><span className="truncate">{outlet?.name ?? t('labelAllOutlets')}</span>
          </button>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button variant="ghost" size="icon" onClick={search} className="lg:hidden" aria-label={t('searchCommandTooltip')}><Search size={18} /></Button>
        <button type="button" onClick={search} title={t('searchCommandTooltip')} className="mr-2 hidden min-h-10 items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition hover:bg-muted lg:flex">
          <Search size={15} /><span>{t('searchCommandShort')}</span><kbd className="rounded border border-border bg-card px-1 text-xs">⌘K</kbd>
        </button>
        <div className="hidden items-center lg:flex">
          <LanguageMenu /><CurrencyMenu />
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing} aria-label={t('refreshData')} title={t('refreshData')}><RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} /></Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={themeLabel} title={themeLabel}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</Button>
        </div>
        <Button variant="ghost" size="icon" onClick={() => { setMoreOpen(false); navigate('/notifications') }} className="relative"
          aria-label={unreadCount > 0 ? t('openNotificationsUnread', { count: unreadCount }) : t('openNotifications')} title={t('openNotifications')}>
          <Bell size={18} />
          {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </Button>
        <div ref={moreRef} className="relative lg:hidden">
          <Button variant="ghost" size="icon" aria-label={t('headerMoreActions')} aria-expanded={moreOpen} aria-controls={moreId} onClick={() => setMoreOpen(value => !value)}><MoreHorizontal size={20} /></Button>
          {moreOpen && <div id={moreId} className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border bg-card p-2 shadow-xl">
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">{t('headerPreferences')}</p>
            <LanguageMenu className="[&>button]:min-h-11 [&>button]:w-full" />
            <CurrencyMenu className="[&>button]:min-h-11 [&>button]:w-full" />
            <button type="button" onClick={() => { toggleTheme(); setMoreOpen(false) }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-muted">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}{themeLabel}</button>
            <button type="button" disabled={refreshing} onClick={handleRefresh} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-muted disabled:opacity-50"><RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />{t('refreshData')}</button>
          </div>}
        </div>
      </div>
    </header>
  )
}
