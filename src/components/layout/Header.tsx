import { useState } from 'react'
import { Bell, RefreshCw, Moon, Sun, Menu, HelpCircle, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getUnreadCount } from '@/api/notifications'
import { useThemeStore } from '@/store/themeStore'
import { useUIStore } from '@/store/uiStore'
import { useCoachmark } from '@/hooks/useCoachmark'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { theme, toggleTheme } = useThemeStore()
  const { openMobileSidebar } = useUIStore()
  const { available: tourAvailable, start: startTutorial } = useCoachmark()
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
          aria-label="Buka menu"
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
          title="Cari fitur atau pekerjaan (Ctrl/Cmd + K)"
          className="mr-1 hidden items-center gap-2 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-muted sm:flex"
        >
          <Search size={14} />
          <span>Cari fitur…</span>
          <kbd className="rounded border border-border bg-card px-1 py-0.5 text-[10px] font-medium">⌘K</kbd>
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
          className="sm:hidden"
          aria-label="Cari fitur atau pekerjaan"
        >
          <Search size={17} />
        </Button>

        {tourAvailable && (
          <Button
            variant="ghost"
            size="icon"
            onClick={startTutorial}
            title="Tutorial halaman ini"
            data-tour="help-button"
          >
            <HelpCircle size={17} />
          </Button>
        )}

        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing} title="Muat ulang data">
          <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Gunakan tampilan terang' : 'Gunakan tampilan gelap'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/notifications')}
          className="relative"
          title="Buka pemberitahuan"
          aria-label={unreadCount > 0 ? `Buka pemberitahuan, ${unreadCount} belum dibaca` : 'Buka pemberitahuan'}
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
