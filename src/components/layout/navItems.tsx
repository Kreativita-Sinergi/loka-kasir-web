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
  | 'Aktivitas Harian'
  | 'Laporan Usaha'
  | 'Produk & Harga'
  | 'Stok & Pemasok'
  | 'Tim & Outlet'
  | 'Pengaturan'

/** Urutan grup saat dirender di Sidebar. */
export const NAV_GROUPS: NavGroup[] = [
  'Ringkasan',
  'Aktivitas Harian',
  'Laporan Usaha',
  'Produk & Harga',
  'Stok & Pemasok',
  'Tim & Outlet',
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
  /** Istilah lain yang mungkin diketik pengguna saat mencari menu. */
  keywords?: string[]
}

export const NAV_ITEMS: NavItem[] = [
  // ─── Ringkasan ─────────────────────────────────────────────────────────────
  {
    group: 'Ringkasan',
    label: 'Beranda',
    icon: <LayoutDashboard size={15} />,
    path: '/',
    permission: PERMS.REPORTS_VIEW,
    description: 'Lihat ringkasan penjualan dan aktivitas usaha hari ini.',
    keywords: ['dashboard', 'ringkasan', 'utama'],
  },

  // ─── Operasional ───────────────────────────────────────────────────────────
  {
    group: 'Aktivitas Harian',
    label: 'Riwayat Transaksi',
    icon: <ShoppingCart size={15} />,
    path: '/transactions',
    permission: PERMS.POS_CREATE_ORDER,
    description: 'Periksa penjualan, pembayaran, pembatalan, dan pengembalian dana.',
    keywords: ['transaksi', 'penjualan', 'struk', 'order', 'pesanan', 'refund'],
  },
  {
    group: 'Aktivitas Harian',
    label: 'Shift Kasir',
    icon: <Clock size={15} />,
    path: '/shifts',
    permission: PERMS.POS_OPEN_SHIFT,
    description: 'Pantau jam kerja, kas awal, dan kas akhir setiap kasir.',
    keywords: ['shift', 'sesi kasir', 'jam kerja'],
  },
  {
    group: 'Aktivitas Harian',
    label: 'Tagihan Kasbon',
    icon: <Layers size={15} />,
    path: '/kasbon',
    permission: PERMS.POS_CREATE_ORDER,
    advanced: true,
    description: 'Lihat transaksi yang belum lunas dan catat pelunasannya.',
    keywords: ['kasbon', 'utang', 'piutang', 'belum lunas'],
  },
  {
    group: 'Aktivitas Harian',
    label: 'Pelanggan',
    icon: <UserCircle size={15} />,
    path: '/customers',
    permission: PERMS.POS_CREATE_ORDER,
    planRequired: 'lite',
    advanced: true,
    description: 'Simpan data pelanggan dan pantau poin belanja mereka.',
    keywords: ['customer', 'pembeli', 'loyalty', 'poin'],
  },

  // ─── Laporan ───────────────────────────────────────────────────────────────
  {
    group: 'Laporan Usaha',
    label: 'Laporan Keuangan',
    icon: <DollarSign size={15} />,
    path: '/reports/financial',
    permission: PERMS.REPORTS_FINANCIAL,
    planRequired: 'lite',
    description: 'Lihat pemasukan, pengeluaran, pajak, dan arus kas.',
    keywords: ['uang', 'pendapatan', 'pengeluaran', 'arus kas', 'refund'],
  },
  {
    group: 'Laporan Usaha',
    label: 'Laporan Penjualan',
    icon: <TrendingUp size={15} />,
    path: '/reports',
    permission: PERMS.REPORTS_VIEW,
    planRequired: 'pro',
    advanced: true,
    description: 'Analisis tren penjualan, produk terlaris, dan jam ramai.',
    keywords: ['analitik', 'omzet', 'performa', 'produk terlaris'],
  },
  {
    group: 'Laporan Usaha',
    label: 'Keuntungan per Produk',
    icon: <BarChart3 size={15} />,
    path: '/reports/profitability',
    permission: PERMS.REPORTS_PROFITABILITY,
    planRequired: 'pro',
    advanced: true,
    description: 'Bandingkan omzet, modal, laba, dan margin setiap produk.',
    keywords: ['untung', 'laba', 'hpp', 'margin', 'profit'],
  },

  // ─── Katalog ───────────────────────────────────────────────────────────────
  {
    group: 'Produk & Harga',
    label: 'Daftar Produk',
    icon: <Package size={15} />,
    path: '/products',
    permission: PERMS.INVENTORY_VIEW,
    description: 'Tambah produk, harga, varian, dan ketersediaannya.',
    keywords: ['produk', 'menu', 'barang', 'harga'],
  },
  {
    group: 'Produk & Harga',
    label: 'Kategori, Merek & Satuan',
    icon: <Library size={15} />,
    path: '/catalog/attributes',
    permission: PERMS.INVENTORY_VIEW,
    advanced: true,
    description: 'Rapikan pengelompokan dan satuan produk.',
    keywords: ['kategori', 'brand', 'merek', 'satuan', 'library'],
  },
  // Diskon dikeluarkan dari halaman gabungan yang dulu bernama "Library".
  // Ia salah satu menu yang paling sering dicari lewat namanya, dan sebagai
  // tab keempat di dalam menu lain ia praktis tidak bisa ditemukan.
  {
    group: 'Produk & Harga',
    label: 'Diskon',
    icon: <Gift size={15} />,
    path: '/discounts',
    permission: PERMS.INVENTORY_VIEW,
    description: 'Buat potongan harga dan tentukan produk yang mendapat diskon.',
    keywords: ['promo', 'potongan harga', 'voucher'],
  },
  {
    group: 'Produk & Harga',
    label: 'Saran Harga Jual',
    icon: <Sparkles size={15} />,
    path: '/pricing/insights',
    permission: PERMS.INVENTORY_VIEW,
    planRequired: 'pro',
    advanced: true,
    description: 'Dapatkan saran harga berdasarkan modal dan target keuntungan.',
    keywords: ['rekomendasi harga', 'harga jual', 'margin', 'hpp'],
  },

  // ─── Inventori ─────────────────────────────────────────────────────────────
  {
    group: 'Stok & Pemasok',
    label: 'Stok Produk',
    icon: <Boxes size={15} />,
    path: '/inventory/current-stock',
    permission: PERMS.INVENTORY_VIEW,
    description: 'Cek jumlah stok dan ketersediaan produk per outlet.',
    keywords: ['stok', 'persediaan', 'barang'],
  },
  {
    group: 'Stok & Pemasok',
    label: 'Transfer Stok',
    icon: <ArrowLeftRight size={15} />,
    path: '/inventory/transfers',
    permission: PERMS.INVENTORY_TRANSFER,
    planRequired: 'pro',
    advanced: true,
    description: 'Pindahkan persediaan dari satu outlet ke outlet lain.',
    keywords: ['pindah stok', 'mutasi stok'],
  },
  {
    group: 'Stok & Pemasok',
    label: 'Riwayat Perubahan Stok',
    icon: <History size={15} />,
    path: '/inventory/movements',
    permission: PERMS.INVENTORY_VIEW,
    planRequired: 'pro',
    advanced: true,
    description: 'Telusuri stok masuk, keluar, penyesuaian, dan transfer.',
    keywords: ['keluar masuk stok', 'pergerakan', 'mutasi', 'riwayat stok'],
  },
  {
    group: 'Stok & Pemasok',
    label: 'Bahan Baku',
    icon: <FlaskConical size={15} />,
    path: '/inventory/raw-materials',
    permission: PERMS.INVENTORY_VIEW,
    planRequired: 'pro',
    advanced: true,
    description: 'Kelola bahan pembentuk produk dan pemakaiannya.',
    keywords: ['resep', 'komposisi', 'bahan', 'bom'],
  },
  {
    group: 'Stok & Pemasok',
    label: 'Pemasok',
    icon: <Truck size={15} />,
    path: '/inventory/suppliers',
    permission: PERMS.INVENTORY_SUPPLIER,
    planRequired: 'pro',
    advanced: true,
    description: 'Simpan data pemasok bahan dan barang.',
    keywords: ['supplier', 'vendor'],
  },
  {
    group: 'Stok & Pemasok',
    label: 'Pesanan Pembelian',
    icon: <ClipboardList size={15} />,
    path: '/inventory/purchase-orders',
    permission: PERMS.INVENTORY_PURCHASE_ORDER,
    planRequired: 'pro',
    advanced: true,
    description: 'Buat dan pantau pesanan barang kepada pemasok.',
    keywords: ['purchase order', 'po', 'pesanan supplier', 'belanja stok'],
  },

  // ─── Manajemen ─────────────────────────────────────────────────────────────
  {
    group: 'Tim & Outlet',
    label: 'Daftar Outlet',
    icon: <GitBranch size={15} />,
    path: '/outlets',
    permission: PERMS.SETTINGS_VIEW,
    description: 'Kelola lokasi usaha dan pengaturan setiap cabang.',
    keywords: ['outlet', 'cabang', 'toko', 'lokasi usaha'],
  },
  {
    group: 'Tim & Outlet',
    label: 'Daftar Karyawan',
    icon: <Users size={15} />,
    path: '/employees',
    permission: PERMS.EMPLOYEE_VIEW,
    description: 'Tambah karyawan dan atur peran kerjanya.',
    keywords: ['karyawan', 'pegawai', 'staf', 'kasir', 'pin'],
  },
  {
    group: 'Tim & Outlet',
    label: 'Kehadiran Karyawan',
    icon: <CalendarCheck size={15} />,
    path: '/attendance',
    permission: PERMS.EMPLOYEE_VIEW,
    planRequired: 'pro',
    advanced: true,
    description: 'Periksa jam masuk, jam pulang, dan foto kehadiran.',
    keywords: ['absensi', 'presensi', 'hadir', 'jam kerja'],
  },
  {
    group: 'Tim & Outlet',
    label: 'Perangkat Kasir',
    icon: <Monitor size={15} />,
    path: '/master/terminals',
    permission: PERMS.SETTINGS_VIEW,
    advanced: true,
    description: 'Daftarkan perangkat yang dipakai untuk aplikasi kasir.',
    keywords: ['terminal', 'pos', 'device', 'hp kasir', 'tablet kasir'],
  },
  {
    group: 'Tim & Outlet',
    label: 'Meja & QR Menu',
    icon: <LayoutGrid size={15} />,
    path: '/master/tables',
    permission: PERMS.SETTINGS_VIEW,
    planRequired: 'lite',
    advanced: true,
    description: 'Atur meja makan dan QR untuk pemesanan mandiri.',
    keywords: ['meja', 'dine in', 'qr', 'scan menu'],
  },

  // ─── Pengaturan ────────────────────────────────────────────────────────────
  // Satu pintu masuk di Sidebar; sisanya jadi kartu di halaman hub /settings.
  {
    group: 'Pengaturan',
    label: 'Semua Pengaturan',
    icon: <Settings size={15} />,
    path: '/settings',
    description: 'Temukan seluruh pengaturan akun, usaha, dan karyawan.',
    keywords: ['pengaturan', 'setting', 'konfigurasi'],
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
    label: 'Peran & Hak Akses',
    icon: <KeyRound size={15} />,
    path: '/settings/rbac',
    permission: PERMS.RBAC_MANAGE,
    sidebar: false,
    description: 'Atur peran karyawan dan izin per menu.',
    keywords: ['hak akses', 'role', 'peran', 'izin karyawan'],
  },
  {
    group: 'Pengaturan',
    label: 'Panduan Hak Akses',
    icon: <ShieldCheck size={15} />,
    path: '/settings/privilege-list',
    permission: PERMS.RBAC_MANAGE,
    sidebar: false,
    description: 'Daftar lengkap izin yang bisa diberikan ke karyawan.',
    keywords: ['daftar izin', 'permission', 'akses karyawan'],
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
    label: 'Pemberitahuan',
    icon: <Bell size={15} />,
    path: '/notifications',
    sidebar: false,
    description: 'Riwayat pemberitahuan dari sistem.',
    keywords: ['notifikasi', 'pesan', 'info'],
  },
  {
    group: 'Pengaturan',
    label: 'Panduan Aplikasi & Web',
    icon: <Layers size={15} />,
    path: '/platform',
    permission: PERMS.SETTINGS_EDIT,
    sidebar: false,
    description: 'Pahami pembagian fungsi aplikasi kasir dan web pengelola.',
    keywords: ['platform', 'panduan', 'cara pakai', 'aplikasi kasir'],
  },
]
