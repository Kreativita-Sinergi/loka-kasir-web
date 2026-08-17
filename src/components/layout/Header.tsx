import { useState } from 'react'
import { Bell, RefreshCw, Moon, Sun, Menu, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getUnreadCount } from '@/api/notifications'
import { useThemeStore } from '@/store/themeStore'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/components/ui/button'
import CurrencyMenu from '@/components/ui/CurrencyMenu'
import LanguageMenu from '@/components/ui/LanguageMenu'
import { t } from '@/lib/i18n'

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { theme, toggleTheme } = useThemeStore()
  const { openMobileSidebar } = useUIStore()
  const [refreshing, setRefreshing] = useState(false)

  const { data } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => getUnreadCount(),
    refetchInterval: 30000,
    retry: false,
  })

  const unreadCount = data?.data?.data?.count ?? 0

  // Refresh data tanpa reload penuh: cukup refetch query yang aktif. Jauh lebih
  // ringan (tak mengunduh ulang aset/JS) dan terasa instan — penting saat banyak
  // pengguna sering menekan refresh.
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await qc.invalidateQueries({ type: 'active' })
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="flex items-center justify-between h-14 md:h-16 px-4 md:px-6 bg-card border-b border-border shrink-0">
      {/* Hamburger (mobile) + page title */}
      <div className="flex items-center gap-3 min-w-0 mr-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={openMobileSidebar}
          className="md:hidden shrink-0"
          aria-label={t('openMenu')}
        >
          <Menu size={18} />
        </Button>
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-bold text-foreground leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* Quick command palette trigger (Cmd/Ctrl+K) */}
        <button
          onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
          title={t('searchCommandTooltip')}
          className="mr-1 hidden items-center gap-2 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-muted sm:flex"
        >
          <Search size={14} />
          <span>{t('searchCommandShort')}</span>
          <kbd className="rounded border border-border bg-card px-1 py-0.5 text-[10px] font-medium">⌘K</kbd>
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
          className="sm:hidden"
          aria-label={t('searchCommandTooltip')}
        >
          <Search size={17} />
        </Button>

        {/* Pemilih bahasa diletakkan di sini, bukan hanya di Pengaturan:
            mengganti bahasa adalah hal yang dicari orang justru ketika ia
            sedang tersesat di layar yang tidak ia mengerti — menyuruhnya
            menemukan Pengaturan lebih dulu adalah lingkaran yang sama. */}
        <LanguageMenu />
        <CurrencyMenu />

        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing} title={t('refreshData')}>
          <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? t('loginUseLightTheme') : t('loginUseDarkTheme')}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/notifications')}
          className="relative"
          title={t('openNotifications')}
          aria-label={
            unreadCount > 0
              ? t('openNotificationsUnread', { count: unreadCount })
              : t('openNotifications')
          }
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-destructive text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
