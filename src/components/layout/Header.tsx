import { Bell, RefreshCw, Moon, Sun, Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getUnreadCount } from '@/api/notifications'
import { useThemeStore } from '@/store/themeStore'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()
  const { openMobileSidebar } = useUIStore()

  const { data } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => getUnreadCount(),
    refetchInterval: 30000,
    retry: false,
  })

  const unreadCount = data?.data?.data?.count ?? 0

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
        <Button variant="ghost" size="icon" onClick={() => window.location.reload()} title="Refresh">
          <RefreshCw size={17} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/notifications')}
          className="relative"
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
