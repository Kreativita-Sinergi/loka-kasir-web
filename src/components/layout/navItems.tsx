import type React from 'react'
import {
  ArrowLeftRight, BarChart3, Bell, Boxes, Calculator, CalendarCheck,
  ClipboardList, Clock, CreditCard, DollarSign, FlaskConical, Gift,
  GitBranch, History, KeyRound, Layers, LayoutDashboard, LayoutGrid,
  Library, Monitor, Package, Search, ShieldCheck, ShoppingCart, Sparkles,
  TrendingUp, Truck, UserCircle, Users,
} from 'lucide-react'
import { PERMS } from '@/hooks/usePermissions'
import type { PermissionCode } from '@/types'

// Definisi menu navigasi bersama — dipakai Sidebar dan CommandPalette.
// Dipisah ke file non-komponen agar React Fast Refresh tetap bekerja.

export interface NavItem {
  label: string
  icon: React.ReactNode
  path: string
  permission?: PermissionCode
  anyOf?: PermissionCode[]
  group?: string
  planRequired?: 'lite' | 'pro'
}

export const NAV_ITEMS: NavItem[] = [
  {
    group: 'Overview',
    label: 'Dashboard',
    icon: <LayoutDashboard size={15} />,
    path: '/',
    permission: PERMS.REPORTS_VIEW,
  },
  {
    group: 'Operasional',
    label: 'Kasir',
    icon: <Calculator size={15} />,
    path: '/pos',
    permission: PERMS.POS_CREATE_ORDER,
  },
  {
    label: 'Semua Transaksi',
    icon: <ShoppingCart size={15} />,
    path: '/transactions',
    permission: PERMS.POS_CREATE_ORDER,
  },
  {
    label: 'Tagihan Kasbon',
    icon: <Layers size={15} />,
    path: '/kasbon',
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
    planRequired: 'lite',
  },
  {
    group: 'Laporan',
    label: 'Laporan Umum',
    icon: <TrendingUp size={15} />,
    path: '/reports',
    permission: PERMS.REPORTS_VIEW,
    planRequired: 'pro',
  },
  {
    label: 'Laporan Keuangan',
    icon: <DollarSign size={15} />,
    path: '/reports/financial',
    permission: PERMS.REPORTS_FINANCIAL,
    planRequired: 'lite',
  },
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
    planRequired: 'pro',
  },
  {
    label: 'Riwayat Stok',
    icon: <History size={15} />,
    path: '/inventory/movements',
    permission: PERMS.INVENTORY_VIEW,
    planRequired: 'pro',
  },
  {
    label: 'Bahan Baku',
    icon: <FlaskConical size={15} />,
    path: '/inventory/raw-materials',
    permission: PERMS.INVENTORY_VIEW,
    planRequired: 'pro',
  },
  {
    label: 'Supplier',
    icon: <Truck size={15} />,
    path: '/inventory/suppliers',
    permission: PERMS.INVENTORY_SUPPLIER,
    planRequired: 'pro',
  },
  {
    label: 'Purchase Order',
    icon: <ClipboardList size={15} />,
    path: '/inventory/purchase-orders',
    permission: PERMS.INVENTORY_PURCHASE_ORDER,
    planRequired: 'pro',
  },
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
    label: 'Absensi',
    icon: <CalendarCheck size={15} />,
    path: '/attendance',
    permission: PERMS.EMPLOYEE_VIEW,
    planRequired: 'pro',
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
    planRequired: 'lite',
  },
  {
    group: 'Pengaturan',
    label: 'Audit Log',
    icon: <Search size={15} />,
    path: '/audit-log',
    permission: PERMS.SETTINGS_VIEW,
  },
  {
    label: 'Membership',
    icon: <CreditCard size={15} />,
    path: '/membership',
    permission: PERMS.SETTINGS_VIEW,
  },
  {
    label: 'Daftar Hak Akses',
    icon: <ShieldCheck size={15} />,
    path: '/settings/privilege-list',
    permission: PERMS.RBAC_MANAGE,
  },
  {
    label: 'Pengaturan Hak Akses',
    icon: <KeyRound size={15} />,
    path: '/settings/rbac',
    permission: PERMS.RBAC_MANAGE,
  },
  {
    label: 'Notifikasi',
    icon: <Bell size={15} />,
    path: '/notifications',
  },
  {
    label: 'Profil & Akun',
    icon: <UserCircle size={15} />,
    path: '/profile',
  },
  {
    label: 'Pengaturan Keuangan',
    icon: <Calculator size={15} />,
    path: '/settings/finance',
    permission: PERMS.SETTINGS_VIEW,
    planRequired: 'pro',
  },
  {
    label: 'Program Loyalty',
    icon: <Gift size={15} />,
    path: '/settings/loyalty',
    permission: PERMS.SETTINGS_VIEW,
    planRequired: 'pro',
  },
  {
    label: 'Rekomendasi Harga',
    icon: <Sparkles size={15} />,
    path: '/pricing/insights',
    permission: PERMS.INVENTORY_VIEW,
    planRequired: 'pro',
  },
  {
    label: 'Profitabilitas HPP',
    icon: <BarChart3 size={15} />,
    path: '/reports/profitability',
    permission: PERMS.REPORTS_PROFITABILITY,
    planRequired: 'pro',
  },
  {
    label: 'Platform',
    icon: <Layers size={15} />,
    path: '/platform',
    permission: PERMS.SETTINGS_EDIT,
  },
]
