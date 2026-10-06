import { useEffect, useId, useRef, useState } from 'react'
import { Bell, RefreshCw, Moon, Sun, Menu, Search, Settings2, Store } from 'lucide-react'
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
import { toTitleCase } from '@/lib/utils'
import { NAV_ITEMS, navGroupLabel } from './navItems'
import HubNavigation from './HubNavigation'

interface HeaderProps { title: string; subtitle?: string }

/**
 * Header halaman — mengikuti header tablet aplikasi: judul di kiri, kolom cari
 * di kanan, lalu lonceng. Pilihan yang jarang diubah (bahasa, mata uang, tema)
 * dikumpulkan di satu menu supaya barisnya tidak penuh ikon.
 */
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
  const outletName = outlet ? toTitleCase(outlet.name) : t('labelAllOutlets')
  const menuRow = 'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-muted'

  return (
    <>
    <header className="relative z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-2 sm:px-4 lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="icon" onClick={openMobileSidebar} className="lg:hidden" aria-label={t('openMenu')}><Menu size={20} /></Button>
        <div className="min-w-0">
          {section && <p className="hidden text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground lg:block">{navGroupLabel(section)}</p>}
          <h1 className="truncate text-base font-bold leading-snug tracking-tight text-foreground lg:text-lg">{title}</h1>
          {subtitle && <p className="hidden truncate text-xs text-muted-foreground lg:block" title={subtitle}>{subtitle}</p>}
          <button type="button" onClick={openMobileSidebar} className="flex min-h-5 max-w-full min-w-0 items-center gap-1 text-xs text-muted-foreground lg:hidden"
            aria-label={`${t('sidebarActiveOutlet')}: ${outletName}`}>
            <Store size={12} className="shrink-0" /><span className="truncate">{outletName}</span>
          </button>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {/* Kolom cari seperti _HeaderSearchField di aplikasi: membuka pencarian
            fitur (Command Palette), bukan mencari data halaman. */}
        <button type="button" onClick={search} title={t('searchCommandTooltip')}
          className="mr-1 hidden h-10 w-56 items-center gap-2 rounded-[10px] border border-border bg-card px-3 text-sm text-muted-foreground transition hover:border-primary/40 md:flex xl:w-72">
          <Search size={16} className="shrink-0" /><span className="flex-1 truncate text-left">{t('searchCommandShort')}</span>
          <kbd className="rounded-md border border-border bg-muted px-1.5 text-[11px] font-medium">⌘K</kbd>
        </button>
        <Button variant="ghost" size="icon" onClick={search} className="md:hidden" aria-label={t('searchCommandTooltip')}><Search size={18} /></Button>
        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing} className="hidden sm:inline-flex" aria-label={t('refreshData')} title={t('refreshData')}>
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => { setMoreOpen(false); navigate('/notifications') }} className="relative"
          aria-label={unreadCount > 0 ? t('openNotificationsUnread', { count: unreadCount }) : t('openNotifications')} title={t('openNotifications')}>
          <Bell size={18} />
          {unreadCount > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </Button>
        <div ref={moreRef} className="relative">
          <Button variant="ghost" size="icon" aria-label={t('headerPreferences')} title={t('headerPreferences')} aria-expanded={moreOpen} aria-controls={moreId} onClick={() => setMoreOpen(value => !value)}>
            <Settings2 size={18} />
          </Button>
          {moreOpen && <div id={moreId} className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border bg-card p-2 shadow-xl">
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">{t('headerPreferences')}</p>
            <LanguageMenu className="[&>button]:min-h-11 [&>button]:w-full" />
            <CurrencyMenu className="[&>button]:min-h-11 [&>button]:w-full" />
            <button type="button" onClick={() => { toggleTheme(); setMoreOpen(false) }} className={menuRow}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}{themeLabel}</button>
            <button type="button" disabled={refreshing} onClick={handleRefresh} className={`${menuRow} disabled:opacity-50 sm:hidden`}><RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />{t('refreshData')}</button>
          </div>}
        </div>
      </div>
    </header>
    <HubNavigation />
    </>
  )
}
