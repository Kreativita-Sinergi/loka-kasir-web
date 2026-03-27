import { Bell, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getUnreadCount } from '@/api/notifications'
import { useAuthStore } from '@/store/authStore'
import OutletDropdown from '@/components/ui/OutletDropdown'

interface HeaderProps {
  title: string
  subtitle?: string
}

/** Roles that operate across multiple outlets and benefit from the global outlet switcher. */
const MULTI_OUTLET_ROLES = new Set(['OWNER', 'MANAGER', 'ADMIN'])

export default function Header({ title, subtitle }: HeaderProps) {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => getUnreadCount(),
    refetchInterval: 30000,
  })

  const unreadCount = data?.data?.data?.count ?? 0
  const roleCode = (user?.role?.code ?? user?.role?.name ?? '').toUpperCase()
  const showOutletDropdown = MULTI_OUTLET_ROLES.has(roleCode)

  return (
    <div className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-100 shrink-0">
      {/* Page title */}
      <div className="min-w-0 mr-4">
        <h1 className="text-lg font-bold text-gray-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>

      {/* Centre: outlet switcher — only for multi-outlet roles */}
      {showOutletDropdown && (
        <div className="flex-1 max-w-xs mx-auto hidden md:block">
          <OutletDropdown />
        </div>
      )}

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.location.reload()}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
          title="Refresh"
        >
          <RefreshCw size={17} />
        </button>
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
