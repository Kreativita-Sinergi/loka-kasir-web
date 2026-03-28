import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CreditCard, Clock, Layers, GitBranch,
  LayoutDashboard, ShoppingCart, Package, Users, Library,
  Bell, ArrowLeftRight, History, UserCircle, Monitor, LayoutGrid,
  Boxes, TrendingUp, DollarSign, ShieldCheck,
} from 'lucide-react'
import { IconLogout } from '@/components/icons/LokaIcons'
import { useAuthStore } from '@/store/authStore'
import { usePermissions, PERMS } from '@/hooks/usePermissions'
import { useOutletStore } from '@/store/outletStore'
import { getOutletConfig } from '@/api/outlets'
import { cn } from '@/lib/utils'
import OutletSelector from '@/components/ui/OutletSelector'
import type { PermissionCode } from '@/types'

// ─── Nav item definition ─────────────────────────────────────────────────────

interface NavItem {
  label: string
  icon: React.ReactNode
  path: string
  /**
   * The user must hold this permission for the item to appear.
   * Omit for items visible to all authenticated users (e.g. Dashboard).
   */
  permission?: PermissionCode
  /**
   * Alternative: visible if the user holds ANY of these codes.
   */
  anyOf?: PermissionCode[]
  /** Visual group heading rendered above the first item in each section. */
  group?: string
}

// ─── Complete nav map — each item declares its own permission requirement ────
//
// The sidebar renders ONLY the items the current user is allowed to see.
// No hidden menus, no greyed-out locks — unlisted items simply don't exist
// in the DOM. This matches the Moka/Majoo UX pattern.
//
// Permission matrix summary:
//   Owner / Manager / Admin / Supervisor → see everything
//   Kasir      → Dashboard, Transactions, Shifts
//   Pelayan    → Transactions (no payment button — guarded in the page)
//   Koki       → (redirected to KDS in Flutter; web shows Transactions read-only)
//   Gudang     → Inventory section only
//   Kurir      → Transactions read-only

const NAV_ITEMS: NavItem[] = [
  // ── Overview ─────────────────────────────────────────────────────────────
  {
    group: 'Overview',
    label: 'Dashboard',
    icon: <LayoutDashboard size={15} />,
    path: '/',
    permission: PERMS.REPORTS_VIEW,
  },

  // ── POS Operations ───────────────────────────────────────────────────────
  {
    group: 'Operasional',
    label: 'Semua Transaksi',
    icon: <ShoppingCart size={15} />,
    path: '/transactions',
    permission: PERMS.POS_CREATE_ORDER,
  },
  {
    label: 'Shift',
    icon: <Clock size={15} />,
    path: '/shifts',
    permission: PERMS.POS_OPEN_SHIFT,
  },
  {
    label: 'Pelanggan',
    icon: <UserCircle size={15} />,
    path: '/customers',
    permission: PERMS.POS_CREATE_ORDER,
  },

  // ── Reports ──────────────────────────────────────────────────────────────
  {
    group: 'Laporan',
    label: 'Laporan Umum',
    icon: <TrendingUp size={15} />,
    path: '/reports',
    permission: PERMS.REPORTS_VIEW,
  },
  {
    label: 'Laporan Keuangan',
    icon: <DollarSign size={15} />,
    path: '/reports/financial',
    permission: PERMS.REPORTS_FINANCIAL, // Gudang, Koki, Kasir → never see this
  },

  // ── Catalog ──────────────────────────────────────────────────────────────
  {
    group: 'Katalog',
    label: 'Produk',
    icon: <Package size={15} />,
    path: '/products',
    permission: PERMS.INVENTORY_VIEW,
  },
  {
    label: 'Library',
    icon: <Library size={15} />,
    path: '/library',
    permission: PERMS.INVENTORY_VIEW,
  },

  // ── Inventory ────────────────────────────────────────────────────────────
  {
    group: 'Inventori',
    label: 'Stok Saat Ini',
    icon: <Boxes size={15} />,
    path: '/inventory/current-stock',
    permission: PERMS.INVENTORY_VIEW,
  },
  {
    label: 'Transfer Stok',
    icon: <ArrowLeftRight size={15} />,
    path: '/inventory/transfers',
    permission: PERMS.INVENTORY_TRANSFER,
  },
  {
    label: 'Riwayat Stok',
    icon: <History size={15} />,
    path: '/inventory/movements',
    permission: PERMS.INVENTORY_VIEW,
  },

  // ── Business Management ──────────────────────────────────────────────────
  {
    group: 'Manajemen',
    label: 'Outlet',
    icon: <GitBranch size={15} />,
    path: '/outlets',
    permission: PERMS.SETTINGS_VIEW,
  },
  {
    label: 'Karyawan',
    icon: <Users size={15} />,
    path: '/employees',
    permission: PERMS.EMPLOYEE_VIEW,
  },
  {
    label: 'Terminal',
    icon: <Monitor size={15} />,
    path: '/master/terminals',
    permission: PERMS.SETTINGS_VIEW,
  },
  {
    label: 'Meja',
    icon: <LayoutGrid size={15} />,
    path: '/master/tables',
    permission: PERMS.SETTINGS_VIEW,
  },

  // ── Settings / Admin ─────────────────────────────────────────────────────
  {
    group: 'Pengaturan',
    label: 'Membership',
    icon: <CreditCard size={15} />,
    path: '/membership',
    permission: PERMS.SETTINGS_VIEW,
  },
  {
    label: 'Hak Akses (RBAC)',
    icon: <ShieldCheck size={15} />,
    path: '/settings/rbac',
    permission: PERMS.RBAC_MANAGE, // Owner only
  },
  {
    label: 'Notifikasi',
    icon: <Bell size={15} />,
    path: '/notifications',
    // visible to all authenticated users
  },
  {
    label: 'Platform',
    icon: <Layers size={15} />,
    path: '/platform',
    permission: PERMS.SETTINGS_EDIT,
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all',
    isActive
      ? 'bg-blue-600 text-white shadow-sm'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  )

export default function Sidebar() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const { can, canAny } = usePermissions()
  const { selected: selectedOutlet } = useOutletStore()

  const { data: configData } = useQuery({
    queryKey: ['outlet-config', selectedOutlet?.id],
    queryFn: () => getOutletConfig(selectedOutlet!.id),
    enabled: !!selectedOutlet?.id,
  })
  const outletConfig = configData?.data?.data

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  // Filter items the current user is allowed to see + outlet feature flags
  const visibleItems = NAV_ITEMS.filter((item) => {
    // Feature flag gate: hide Meja when has_table is disabled for this outlet
    if (item.path === '/master/tables' && outletConfig && !outletConfig.has_table) return false
    if (item.anyOf && item.anyOf.length > 0) return canAny(...item.anyOf)
    if (item.permission) return can(item.permission)
    return true // no permission required
  })

  // Build grouped sections for rendering
  const sections: { group: string; items: NavItem[] }[] = []
  for (const item of visibleItems) {
    if (item.group) {
      sections.push({ group: item.group, items: [item] })
    } else {
      const last = sections[sections.length - 1]
      if (last) {
        last.items.push(item)
      } else {
        sections.push({ group: '', items: [item] })
      }
    }
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100 w-64 shrink-0">
      {/* Logo */}
      <div className="flex items-center px-5 py-4 border-gray-100">
        <img src="/logo.svg" alt="Loka Kasir" className="h-7 w-auto" />
      </div>

      {/* Outlet Selector */}
      <div className="px-3 py-3 border-b border-gray-100">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-1">
          Outlet Aktif
        </p>
        <OutletSelector />
      </div>

      {/* Nav — dynamically filtered by permissions */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {sections.map((section) => (
          <div key={section.group || '__root__'}>
            {section.group && (
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-1">
                {section.group}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/' || item.path === '/reports'}
                  className={linkClass}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User info + logout */}
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
