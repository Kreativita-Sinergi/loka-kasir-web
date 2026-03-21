import { NavLink, useNavigate } from 'react-router-dom'
import { CreditCard, Clock, Layers } from 'lucide-react'
import {
  IconDashboard, IconOrder, IconProduct, IconEmployee,
  IconHistory, IconLibrary, IconNotification, IconLogout,
} from '@/components/icons/LokaIcons'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', icon: <IconDashboard size={18} />, path: '/' },
  { label: 'Transaksi', icon: <IconHistory size={18} />, path: '/transactions' },
  { label: 'Produk', icon: <IconProduct size={18} />, path: '/products' },
  { label: 'Karyawan', icon: <IconEmployee size={18} />, path: '/employees' },
  { label: 'Shift', icon: <Clock size={18} />, path: '/shifts' },
  { label: 'Membership', icon: <CreditCard size={18} />, path: '/membership' },
  { label: 'Library', icon: <IconLibrary size={18} />, path: '/library' },
  { label: 'Notifikasi', icon: <IconNotification size={18} />, path: '/notifications' },
  { label: 'Platform', icon: <Layers size={18} />, path: '/platform' },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
    isActive
      ? 'bg-blue-600 text-white shadow-sm'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  )

export default function Sidebar() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100 w-64 shrink-0">
      {/* Logo */}
      <div className="flex items-center px-5 py-4 border-b border-gray-100">
        <img src="/logo.svg" alt="Loka Kasir" className="h-7 w-auto" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.path} to={item.path} end={item.path === '/'} className={linkClass}>
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
            {user?.business?.owner_name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.business?.owner_name ?? 'Admin'}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {user?.role?.name ?? 'Owner'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
        >
          <IconLogout size={18} />
          Keluar
        </button>
      </div>
    </div>
  )
}
