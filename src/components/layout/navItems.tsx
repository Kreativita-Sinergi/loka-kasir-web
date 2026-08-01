import type React from 'react'
import {
  ArrowLeftRight, BarChart3, Bell, Boxes, Calculator, CalendarCheck,
  ClipboardList, Clock, CreditCard, DollarSign, FlaskConical, Gift,
  GitBranch, History, KeyRound, Layers, LayoutDashboard, LayoutGrid,
  Library, Monitor, Package, Percent, Search, Settings, ShieldCheck, ShoppingCart,
  Sparkles, TrendingUp, Truck, UserCircle, Users,
} from 'lucide-react'
import { PERMS } from '@/hooks/usePermissions'
import type { PermissionCode } from '@/types'

// Definisi menu navigasi bersama — dipakai Sidebar dan CommandPalette.
// Dipisah ke file non-komponen agar React Fast Refresh tetap bekerja.

export type NavGroup =
  | 'Ringkasan'
  | 'Operasional'
  | 'Laporan'
  | 'Katalog'
  | 'Inventori'
  | 'Manajemen'
  | 'Pengaturan'

/** Urutan grup saat dirender di Sidebar. */
export const NAV_GROUPS: NavGroup[] = [
  'Ringkasan',
  'Operasional',
  'Laporan',
  'Katalog',
  'Inventori',
  'Manajemen',
  'Pengaturan',
]

export interface NavItem {
  label: string
  icon: React.ReactNode
  path: string
  /** Grup tempat item ini dirender. Wajib ada di setiap item. */
  group: NavGroup
  permission?: PermissionCode
  anyOf?: PermissionCode[]
  planRequired?: 'lite' | 'pro'
  /**
   * Fitur lanjutan — disembunyikan dari Sidebar saat Mode Sederhana aktif.
   * Tetap bisa diakses lewat Command Palette (Cmd/Ctrl+K) dan URL langsung.
   */
  advanced?: boolean
  /**
   * `false` = tidak pernah tampil di Sidebar (sudah punya pintu masuk lain,
   * mis. halaman hub /settings, ikon lonceng di Header, atau blok user).
   * Tetap terdaftar di sini agar bisa dicari lewat Command Palette.
   */
  sidebar?: false
  /** Deskripsi singkat — dipakai kartu di halaman hub Pengaturan. */
  description?: string
}

export const NAV_ITEMS: NavItem[] = [
  // ─── Ringkasan ─────────────────────────────────────────────────────────────
  {
    group: 'Ringkasan',
    label: 'Beranda',
    icon: <LayoutDashboard size={15} />,
    path: '/',
    permission: PERMS.REPORTS_VIEW,
  },

  // ─── Operasional ───────────────────────────────────────────────────────────
  {
    group: 'Operasional',
    label: 'Transaksi',
    icon: <ShoppingCart size={15} />,
    path: '/transactions',
    permission: PERMS.POS_CREATE_ORDER,
  },
  {
    group: 'Operasional',
    label: 'Shift',
    icon: <Clock size={15} />,
    path: '/shifts',
    permission: PERMS.POS_OPEN_SHIFT,
  },
  {
    group: 'Operasional',
    label: 'Kasbon',
    icon: <Layers size={15} />,
    path: '/kasbon',
    permission: PERMS.POS_CREATE_ORDER,
    advanced: true,
  },
  {
    group: 'Operasional',
    label: 'Pelanggan',
    icon: <UserCircle size={15} />,
    path: '/customers',
    permission: PERMS.POS_CREATE_ORDER,
    planRequired: 'lite',
    advanced: true,
  },

  // ─── Laporan ───────────────────────────────────────────────────────────────
  {
    group: 'Laporan',
    label: 'Laporan Keuangan',
    icon: <DollarSign size={15} />,
    path: '/reports/financial',
    permission: PERMS.REPORTS_FINANCIAL,
    planRequired: 'lite',
  },
  {
    group: 'Laporan',
    label: 'Laporan Penjualan',
    icon: <TrendingUp size={15} />,
    path: '/reports',
    permission: PERMS.REPORTS_VIEW,
    planRequired: 'pro',
    advanced: true,
  },
  {
    group: 'Laporan',
    label: 'Untung per Produk',
    icon: <BarChart3 size={15} />,
    path: '/reports/profitability',
    permission: PERMS.REPORTS_PROFITABILITY,
    planRequired: 'pro',
    advanced: true,
  },

  // ─── Katalog ───────────────────────────────────────────────────────────────
  {
    group: 'Katalog',
    label: 'Produk',
    icon: <Package size={15} />,
    path: '/products',
    permission: PERMS.INVENTORY_VIEW,
  },
  {
    group: 'Katalog',
    label: 'Kategori & Satuan',
    icon: <Library size={15} />,
    path: '/catalog/attributes',
    permission: PERMS.INVENTORY_VIEW,
    advanced: true,
  },
  // Diskon dikeluarkan dari halaman gabungan yang dulu bernama "Library".
  // Ia salah satu menu yang paling sering dicari lewat namanya, dan sebagai
  // tab keempat di dalam menu lain ia praktis tidak bisa ditemukan.
  {
    group: 'Katalog',
    label: 'Diskon',
    icon: <Gift size={15} />,
    path: '/discounts',
    permission: PERMS.INVENTORY_VIEW,
  },
  {
    group: 'Katalog',
    label: 'Saran Harga',
    icon: <Sparkles size={15} />,
    path: '/pricing/insights',
    permission: PERMS.INVENTORY_VIEW,
    planRequired: 'pro',
    advanced: true,
  },

  // ─── Inventori ─────────────────────────────────────────────────────────────
  {
    group: 'Inventori',
    label: 'Stok',
    icon: <Boxes size={15} />,
    path: '/inventory/current-stock',
    permission: PERMS.INVENTORY_VIEW,
  },
  {
    group: 'Inventori',
    label: 'Transfer Stok',
    icon: <ArrowLeftRight size={15} />,
    path: '/inventory/transfers',
    permission: PERMS.INVENTORY_TRANSFER,
    planRequired: 'pro',
    advanced: true,
  },
  {
    group: 'Inventori',
    label: 'Keluar-Masuk Stok',
    icon: <History size={15} />,
    path: '/inventory/movements',
    permission: PERMS.INVENTORY_VIEW,
    planRequired: 'pro',
    advanced: true,
  },
  {
    group: 'Inventori',
    label: 'Bahan Baku',
    icon: <FlaskConical size={15} />,
    path: '/inventory/raw-materials',
    permission: PERMS.INVENTORY_VIEW,
    planRequired: 'pro',
    advanced: true,
  },
  {
    group: 'Inventori',
    label: 'Supplier',
    icon: <Truck size={15} />,
    path: '/inventory/suppliers',
    permission: PERMS.INVENTORY_SUPPLIER,
    planRequired: 'pro',
    advanced: true,
  },
  {
    group: 'Inventori',
    label: 'Pesanan ke Supplier',
    icon: <ClipboardList size={15} />,
    path: '/inventory/purchase-orders',
    permission: PERMS.INVENTORY_PURCHASE_ORDER,
    planRequired: 'pro',
    advanced: true,
  },

  // ─── Manajemen ─────────────────────────────────────────────────────────────
  {
    group: 'Manajemen',
    label: 'Outlet',
    icon: <GitBranch size={15} />,
    path: '/outlets',
    permission: PERMS.SETTINGS_VIEW,
  },
  {
    group: 'Manajemen',
    label: 'Karyawan',
    icon: <Users size={15} />,
    path: '/employees',
    permission: PERMS.EMPLOYEE_VIEW,
  },
  {
    group: 'Manajemen',
    label: 'Absensi',
    icon: <CalendarCheck size={15} />,
    path: '/attendance',
    permission: PERMS.EMPLOYEE_VIEW,
    planRequired: 'pro',
    advanced: true,
  },
  {
    group: 'Manajemen',
    label: 'Perangkat Kasir',
    icon: <Monitor size={15} />,
    path: '/master/terminals',
    permission: PERMS.SETTINGS_VIEW,
    advanced: true,
  },
  {
    group: 'Manajemen',
    label: 'Meja',
    icon: <LayoutGrid size={15} />,
    path: '/master/tables',
    permission: PERMS.SETTINGS_VIEW,
    planRequired: 'lite',
    advanced: true,
  },

  // ─── Pengaturan ────────────────────────────────────────────────────────────
  // Satu pintu masuk di Sidebar; sisanya jadi kartu di halaman hub /settings.
  {
    group: 'Pengaturan',
    label: 'Pengaturan',
    icon: <Settings size={15} />,
    path: '/settings',
  },
  {
    group: 'Pengaturan',
    label: 'Profil & Akun',
    icon: <UserCircle size={15} />,
    path: '/profile',
    sidebar: false,
    description: 'Data pemilik, kata sandi, dan informasi usaha.',
  },
  {
    group: 'Pengaturan',
    label: 'Langganan & Pembayaran',
    icon: <CreditCard size={15} />,
    path: '/membership',
    permission: PERMS.SETTINGS_VIEW,
    sidebar: false,
    description: 'Kelola paket, perpanjang, dan riwayat pembayaran.',
  },
  {
    group: 'Pengaturan',
    label: 'Pengaturan Keuangan',
    icon: <Calculator size={15} />,
    path: '/settings/finance',
    permission: PERMS.SETTINGS_VIEW,
    planRequired: 'pro',
    sidebar: false,
    description: 'Biaya operasional bulanan untuk menghitung saran harga jual.',
  },
  {
    group: 'Pengaturan',
    label: 'Pajak',
    icon: <Percent size={15} />,
    path: '/settings/tax',
    permission: PERMS.SETTINGS_VIEW,
    sidebar: false,
    description: 'Pajak yang ditambahkan ke tagihan pembeli.',
  },
  {
    group: 'Pengaturan',
    label: 'Poin Pelanggan',
    icon: <Gift size={15} />,
    path: '/settings/loyalty',
    permission: PERMS.SETTINGS_VIEW,
    planRequired: 'pro',
    sidebar: false,
    description: 'Aturan poin dan hadiah untuk pelanggan setia.',
  },
  {
    group: 'Pengaturan',
    label: 'Hak Akses',
    icon: <KeyRound size={15} />,
    path: '/settings/rbac',
    permission: PERMS.RBAC_MANAGE,
    sidebar: false,
    description: 'Atur peran karyawan dan izin per menu.',
  },
  {
    group: 'Pengaturan',
    label: 'Daftar Izin',
    icon: <ShieldCheck size={15} />,
    path: '/settings/privilege-list',
    permission: PERMS.RBAC_MANAGE,
    sidebar: false,
    description: 'Daftar lengkap izin yang bisa diberikan ke karyawan.',
  },
  {
    group: 'Pengaturan',
    label: 'Riwayat Aktivitas',
    icon: <Search size={15} />,
    path: '/audit-log',
    permission: PERMS.SETTINGS_VIEW,
    sidebar: false,
    description: 'Catatan siapa mengubah apa, di seluruh outlet.',
  },
  {
    group: 'Pengaturan',
    label: 'Notifikasi',
    icon: <Bell size={15} />,
    path: '/notifications',
    sidebar: false,
    description: 'Riwayat pemberitahuan dari sistem.',
  },
  {
    group: 'Pengaturan',
    label: 'Platform',
    icon: <Layers size={15} />,
    path: '/platform',
    permission: PERMS.SETTINGS_EDIT,
    sidebar: false,
    description: 'Integrasi dan konfigurasi tingkat platform.',
  },
]
