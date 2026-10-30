import type React from 'react'
import {
  AlertTriangle, Archive, BadgePercent, ArrowLeftRight, Banknote, BarChart3, Bell, Boxes, Calculator, CalendarCheck, CalendarDays, ClipboardCheck, ClipboardList, Clock, CreditCard, Cross, FlaskConical, Gift, HandHeart, Handshake, IdCard, History, KeyRound, Landmark, LandPlot, Layers, Monitor, Package, PackageMinus, Percent, Pill, Radar, Search, ShieldCheck, Sparkles, Store, TrendingUp, Trophy, Truck, UserCircle, Users, Wallet, Warehouse, ScrollText, Hourglass, PiggyBank, FileDown, ShoppingBag, Factory, BookOpen, NotebookPen, Scale, Sigma, ListTree, Link2 } from 'lucide-react'
import { IconDashboard, IconEmployee, IconHistory, IconLibrary, IconSettings, IconTable } from '@/components/icons/LokaIcons'
import { PERMS } from '@/hooks/usePermissions'
import { t } from '@/lib/i18n'
import type { MessageKey } from '@/lib/messages'
import type { PermissionCode } from '@/types'

// Definisi menu navigasi bersama — dipakai Sidebar dan CommandPalette.
// Dipisah ke file non-komponen agar React Fast Refresh tetap bekerja.

/**
 * Grup menu, ditulis sebagai KODE — bukan judulnya.
 *
 * Judulnya berubah mengikuti bahasa, jadi memakainya sebagai identitas berarti
 * pengelompokan sidebar rusak begitu pengguna memilih bahasa Inggris: tidak ada
 * item yang cocok dengan grup mana pun, dan semuanya jatuh keluar. Kode di sini
 * tetap sama di semua bahasa; judulnya diambil lewat [navGroupLabel].
 */
export type NavGroup =
  | 'overview'
  | 'daily'
  | 'reports'
  | 'products'
  | 'inventory'
  | 'team'
  | 'settings'

/** Urutan grup saat dirender di Sidebar. */
export const NAV_GROUPS: NavGroup[] = [
  'overview',
  'daily',
  'reports',
  'products',
  'inventory',
  'team',
  'settings',
]

const NAV_GROUP_KEYS: Record<NavGroup, MessageKey> = {
  overview: 'navGroupOverview',
  daily: 'navGroupDaily',
  reports: 'navGroupReports',
  products: 'navGroupProducts',
  inventory: 'navGroupInventory',
  team: 'navGroupTeam',
  settings: 'navGroupSettings',
}

/** Judul grup dalam bahasa yang sedang aktif. */
export function navGroupLabel(group: NavGroup): string {
  return t(NAV_GROUP_KEYS[group])
}

/**
 * Bagian sidebar — susunannya sama dengan sidebar tablet di aplikasi:
 * Beranda tanpa judul, lalu Transaksi, Toko, dan Lainnya. Grup web yang lebih
 * rinci tetap dipakai untuk judul kecil di header dan Command Palette; di
 * sidebar, satu judul per menu hanya menghabiskan tinggi layar.
 */
export type SidebarSection = 'home' | 'transactions' | 'store' | 'other'

export const SIDEBAR_SECTIONS: SidebarSection[] = ['home', 'transactions', 'store', 'other']

const SIDEBAR_SECTION_OF: Record<NavGroup, SidebarSection> = {
  overview: 'home',
  daily: 'transactions',
  reports: 'transactions',
  products: 'store',
  inventory: 'store',
  team: 'store',
  settings: 'other',
}

const SIDEBAR_SECTION_KEYS: Record<SidebarSection, MessageKey | null> = {
  home: null,
  transactions: 'navSectionTransactions',
  store: 'navSectionStore',
  other: 'navSectionOther',
}

export function sidebarSectionOf(group: NavGroup): SidebarSection {
  return SIDEBAR_SECTION_OF[group]
}

export function sidebarSectionLabel(section: SidebarSection): string | null {
  const key = SIDEBAR_SECTION_KEYS[section]
  return key ? t(key) : null
}

/**
 * Kelompok di dalam halaman hub Pengaturan — sejajar dengan aplikasi kasir.
 *
 * Bukan [NavGroup]: yang itu mengatur Sidebar. Yang ini menjawab pertanyaan
 * yang paling sering salah dijawab pemilik, "setelan ini berlaku ke mana" —
 * ia mengubah sesuatu di satu tempat lalu heran kasir sebelah tidak ikut
 * berubah. Urutan dan judulnya sengaja sama dengan `_SettingsGroup` di
 * loka-kasir-app supaya pemilik yang berpindah layar tidak perlu belajar dua
 * peta yang berbeda.
 */
export type SettingsGroup = 'store' | 'people' | 'payment' | 'account' | 'other'

export const SETTINGS_GROUPS: SettingsGroup[] = [
  'store',
  'people',
  'payment',
  'account',
  'other',
]

const SETTINGS_GROUP_KEYS: Record<
  SettingsGroup,
  { title: MessageKey; scope: MessageKey }
> = {
  store: { title: 'setStore', scope: 'setStoreScope' },
  people: { title: 'setGroupPeople', scope: 'setGroupPeopleHint' },
  payment: { title: 'setGroupPayment', scope: 'setGroupPaymentHint' },
  account: { title: 'setAccountApp', scope: 'setAccountAppHint' },
  other: { title: 'setGroupOther', scope: 'setGroupOtherHint' },
}

export function settingsGroupLabel(group: SettingsGroup): string {
  return t(SETTINGS_GROUP_KEYS[group].title)
}

export function settingsGroupScope(group: SettingsGroup): string {
  return t(SETTINGS_GROUP_KEYS[group].scope)
}

/// Seluruh sub-jenis usaha di bawah pilar RENTAL.
///
/// Didaftarkan sebagai daftar, bukan dibaca dari arketipe, karena penyaringan
/// menu di sini bekerja pada kode vertical. Menambah cabang olahraga baru
/// menuntut satu baris di sini — harga yang dibayar agar menu tidak perlu tahu
/// apa pun tentang arketipe.
const RENTAL_VERTICALS = [
  'PADEL',
  'MINI_SOCCER',
  'FUTSAL',
  'BADMINTON',
  'BILIAR',
  'RENTAL_LAINNYA',
]

export interface NavItem {
  /** Kunci judul menu di katalog pesan; teksnya diambil lewat [navLabel]. */
  labelKey: MessageKey
  icon: React.ReactNode
  path: string
  /** Grup tempat item ini dirender. Wajib ada di setiap item. */
  group: NavGroup
  permission?: PermissionCode
  anyOf?: PermissionCode[]
  planRequired?: 'pro'
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
  /** Kunci deskripsi singkat — dipakai kartu di halaman hub Pengaturan. */
  descriptionKey?: MessageKey
  /**
   * Kelompok kartunya di halaman hub Pengaturan.
   *
   * Item ber-`group: 'settings'` tanpa ini tidak dirender di hub sama sekali —
   * itulah cara hub-nya sendiri (`/settings`) tidak muncul sebagai kartu di
   * dalam dirinya.
   */
  settingsGroup?: SettingsGroup
  /** Istilah lain yang mungkin diketik pengguna saat mencari menu. */
  keywords?: string[]
  /**
   * Sub-jenis usaha yang berhak atas menu ini (`business_verticals.code`).
   *
   * Dipakai menu yang isinya tidak punya arti di jenis usaha lain — papan
   * kedaluwarsa obat di sebuah bengkel hanya menambah baris yang selalu
   * kosong. Kosong berarti berlaku untuk semua.
   */
  verticals?: string[]
  /**
   * Kode peran yang boleh melihat menu ini, di atas saringan izin. Dipakai
   * halaman yang server-nya memagari dengan peran, bukan izin — penggajian
   * hanya untuk OWNER (`AuthorizeOwner`), dan tidak ada kode izin untuknya.
   */
  roles?: string[]
  /** Kebalikannya: peran yang menu ini disembunyikan darinya. */
  hideForRoles?: string[]
  /**
   * `false` = jangan pernah dipakai sebagai halaman pendaratan (lihat
   * landingPathFor). Untuk halaman sesekali seperti Ekspor Data Master: ia
   * terbuka bagi hampir semua peran, tetapi bukan tempat kerja harian siapa
   * pun.
   */
  landing?: false
}

/**
 * Peran yang menunya dipersempit ke daftar path tertentu, di atas saringan izin.
 *
 * Staf Stok Masuk memegang `inventory.view`, dan izin itu juga membuka Produk,
 * Pustaka, Diskon, Riwayat Stok, dan seterusnya — menu yang bukan pekerjaannya
 * dan hanya membingungkan. Pekerjaannya satu layar: Stok Produk.
 */
const ROLE_NAV_ALLOWLIST: Record<string, string[]> = {
  STOCK_IN: ['/inventory/current-stock'],
}

/** Apakah peran ini boleh melihat menu [item]. Peran tanpa daftar: boleh. */
export function roleAllowsNav(item: NavItem, roleCode: string | undefined): boolean {
  const code = (roleCode ?? '').toUpperCase()
  if (item.roles && !item.roles.includes(code)) return false
  if (item.hideForRoles?.includes(code)) return false
  const allowed = ROLE_NAV_ALLOWLIST[code]
  return !allowed || allowed.includes(item.path)
}

/** Judul menu dalam bahasa yang sedang aktif. */
export function navLabel(item: NavItem): string {
  return t(item.labelKey)
}

/** Deskripsi menu dalam bahasa aktif, atau string kosong bila tidak ada. */
export function navDescription(item: NavItem): string {
  return item.descriptionKey ? t(item.descriptionKey) : ''
}

export const NAV_ITEMS: NavItem[] = [
  // ─── Ringkasan ─────────────────────────────────────────────────────────────
  {
    group: 'overview',
    labelKey: 'navHome',
    icon: <IconDashboard size={15} />,
    path: '/',
    permission: PERMS.REPORTS_VIEW,
    descriptionKey: 'navHomeDesc',
    keywords: ['dashboard', 'ringkasan', 'utama'],
  },

  // ─── Operasional ───────────────────────────────────────────────────────────
  {
    group: 'daily',
    labelKey: 'navTransactions',
    icon: <IconHistory size={15} />,
    path: '/transactions',
    permission: PERMS.POS_CREATE_ORDER,
    descriptionKey: 'navTransactionsDesc',
    keywords: ['transaksi', 'penjualan', 'struk', 'order', 'pesanan', 'refund'],
  },
  // Shift kini jadi tab di dalam Tim. Barisnya di sidebar dicabut, bukan
  // rutenya: dashboard tidak pernah MEMBUKA shift — ia meninjau shift orang
  // lain, dan itu urusan yang sama dengan kehadiran mereka.
  {
    group: 'daily',
    labelKey: 'navShifts',
    icon: <Clock size={15} />,
    path: '/shifts',
    permission: PERMS.POS_OPEN_SHIFT,
    sidebar: false,
    descriptionKey: 'navShiftsDesc',
    keywords: ['shift', 'sesi kasir', 'jam kerja'],
  },
  {
    group: 'daily',
    labelKey: 'navCredit',
    icon: <Layers size={15} />,
    path: '/kasbon',
    permission: PERMS.POS_CREATE_ORDER,
    advanced: true,
    descriptionKey: 'navCreditDesc',
    keywords: ['kasbon', 'utang', 'piutang', 'belum lunas'],
  },
  {
    group: 'daily',
    labelKey: 'navCustomers',
    icon: <UserCircle size={15} />,
    path: '/customers',
    permission: PERMS.POS_CREATE_ORDER,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navCustomersDesc',
    keywords: ['customer', 'pembeli', 'loyalty', 'poin'],
  },

  // ─── Laporan ───────────────────────────────────────────────────────────────
  {
    group: 'reports',
    labelKey: 'navFinancialReports',
    icon: <BarChart3 size={15} />,
    path: '/reports/financial',
    permission: PERMS.REPORTS_FINANCIAL,
    planRequired: 'pro',
    descriptionKey: 'navFinancialReportsDesc',
    keywords: ['uang', 'pendapatan', 'pengeluaran', 'arus kas', 'refund'],
  },
  {
    group: 'reports',
    labelKey: 'navCashAccounts',
    icon: <Wallet size={15} />,
    path: '/finance/accounts',
    permission: PERMS.FINANCE_CASH_BOOK,
    planRequired: 'pro',
    descriptionKey: 'navCashAccountsDesc',
    keywords: ['kas besar', 'kas kecil', 'rekening', 'bank', 'buku kas', 'mutasi rekening', 'mutasi', 'brankas', 'transfer', 'prive'],
  },
  {
    group: 'reports',
    labelKey: 'navSalesReports',
    icon: <TrendingUp size={15} />,
    path: '/reports',
    permission: PERMS.REPORTS_VIEW,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navSalesReportsDesc',
    keywords: ['analitik', 'omzet', 'performa', 'produk terlaris'],
  },
  {
    group: 'reports',
    labelKey: 'navSalesSummary',
    icon: <ClipboardList size={15} />,
    path: '/reports/sales-summary',
    permission: PERMS.REPORTS_VIEW,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navSalesSummaryDesc',
    keywords: ['ringkasan', 'rekap', 'per kasir', 'per kategori', 'metode bayar', 'transfer', 'rekening', 'channel', 'jenis pesanan'],
  },
  {
    group: 'reports',
    labelKey: 'navReceiptProfit',
    icon: <Percent size={15} />,
    path: '/reports/receipt-profit',
    permission: PERMS.REPORTS_FINANCIAL,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navReceiptProfitDesc',
    keywords: ['laba', 'untung', 'nota', 'struk', 'hpp', 'margin', 'laba kotor'],
  },
  {
    group: 'reports',
    labelKey: 'navProfitability',
    icon: <BarChart3 size={15} />,
    path: '/reports/profitability',
    permission: PERMS.REPORTS_PROFITABILITY,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navProfitabilityDesc',
    keywords: ['untung', 'laba', 'hpp', 'margin', 'profit'],
  },
  {
    group: 'reports',
    labelKey: 'rptStoreTitle',
    icon: <Trophy size={15} />,
    path: '/reports/store-card',
    permission: PERMS.REPORTS_FINANCIAL,
    planRequired: 'pro',
    descriptionKey: 'rptStoreHint',
    keywords: ['rapor', 'nilai toko', 'saran', 'insight', 'menu laris', 'tambah menu', 'kurangi menu'],
  },
  {
    group: 'reports',
    labelKey: 'rptCashierTitle',
    icon: <IdCard size={15} />,
    path: '/reports/cashier-card',
    permission: PERMS.REPORTS_FINANCIAL,
    planRequired: 'pro',
    descriptionKey: 'rptCashierHint',
    keywords: ['rapor kasir', 'kinerja kasir', 'karyawan terbaik', 'performa'],
  },
  {
    group: 'reports',
    labelKey: 'navStaffCommission',
    icon: <BadgePercent size={15} />,
    path: '/reports/staff-commission',
    permission: PERMS.REPORTS_FINANCIAL,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navStaffCommissionDesc',
    keywords: ['komisi', 'insentif', 'bonus penjualan', 'sales', 'karyawan', 'penjual'],
  },
  {
    group: 'reports',
    labelKey: 'lkrTitle',
    icon: <Radar size={15} />,
    path: '/reports/leak-radar',
    permission: PERMS.REPORTS_FINANCIAL,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'lkrHint',
    keywords: ['radar', 'kebocoran', 'curang', 'batal', 'refund', 'qris'],
  },
  {
    group: 'reports',
    labelKey: 'plbTitle',
    icon: <FlaskConical size={15} />,
    path: '/reports/price-lab',
    permission: PERMS.REPORTS_PROFITABILITY,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'plbHint',
    keywords: ['harga', 'naik harga', 'menu', 'laris', 'hpp'],
  },
  {
    group: 'reports',
    labelKey: 'wbkTitle',
    icon: <HandHeart size={15} />,
    path: '/reports/winback',
    permission: PERMS.CUSTOMER_MANAGE,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'wbkHint',
    keywords: ['pelanggan hilang', 'panggil balik', 'whatsapp', 'voucher', 'penilaian', 'rating'],
  },
  {
    group: 'reports',
    labelKey: 'tcxTitle',
    icon: <Landmark size={15} />,
    path: '/reports/tax',
    // Pojok Pajak milik pemilik (server: AuthorizeOwner). rbac.manage hanya
    // dipegang pemilik, jadi menu ini tidak ditawarkan ke peran lain.
    permission: PERMS.RBAC_MANAGE,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'tcxHint',
    keywords: ['pph', 'pajak umkm', 'npwp', 'setor pajak', 'coretax'],
  },
  {
    group: 'reports',
    labelKey: 'navCashDiscrepancy',
    icon: <AlertTriangle size={15} />,
    path: '/reports/cash-discrepancy',
    permission: PERMS.REPORTS_FINANCIAL,
    advanced: true,
    descriptionKey: 'navCashDiscrepancyDesc',
    keywords: ['selisih', 'kas', 'laci', 'kurang', 'kasir', 'shift'],
  },
  // Nilai Persediaan memperlihatkan HPP: server menerima reports.financial
  // ATAU inventory.hpp. Kartu Stok hanya jumlah, cukup inventory.view.
  {
    group: 'reports',
    labelKey: 'navInventoryValuation',
    icon: <Warehouse size={15} />,
    path: '/reports/inventory-valuation',
    anyOf: [PERMS.REPORTS_FINANCIAL, PERMS.INVENTORY_HPP],
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navInventoryValuationDesc',
    keywords: ['nilai', 'persediaan', 'stok', 'hpp', 'modal', 'aset', 'valuasi', 'inventory'],
  },
  // Laporan Perakitan memperlihatkan biaya produksi: server menerima
  // inventory.hpp, inventory.edit, atau reports.financial.
  {
    group: 'reports',
    labelKey: 'pdnReportTitle',
    icon: <Factory size={15} />,
    path: '/reports/production',
    anyOf: [PERMS.INVENTORY_HPP, PERMS.INVENTORY_EDIT, PERMS.REPORTS_FINANCIAL],
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'pdnReportHint',
    keywords: ['perakitan', 'produksi', 'laporan', 'biaya', 'komponen', 'hpp'],
  },
  // Grup 'inventory', bukan 'reports': peran Gudang memegang inventory.view,
  // dan item pertama yang lolos menentukan halaman pendaratannya (lib/landing)
  // — Gudang harus mendarat di Produk, bukan di laporan. Di sidebar ia tetap
  // tampil di hub Laporan lewat navigationHubs.
  {
    group: 'inventory',
    labelKey: 'navStockCard',
    icon: <ScrollText size={15} />,
    path: '/reports/stock-card',
    permission: PERMS.INVENTORY_VIEW,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navStockCardDesc',
    keywords: ['kartu', 'stok', 'saldo', 'mutasi', 'riwayat', 'barang', 'card'],
  },
  {
    group: 'reports',
    labelKey: 'navShrinkage',
    icon: <PackageMinus size={15} />,
    path: '/reports/shrinkage',
    permission: PERMS.REPORTS_FINANCIAL,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navShrinkageDesc',
    keywords: ['susut', 'hilang', 'stok', 'opname', 'penyesuaian'],
  },
  {
    group: 'reports',
    labelKey: 'navReceivableAging',
    icon: <Hourglass size={15} />,
    path: '/reports/receivable-aging',
    permission: PERMS.REPORTS_FINANCIAL,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navReceivableAgingDesc',
    keywords: ['piutang', 'kasbon', 'bon', 'utang pelanggan', 'jatuh tempo', 'aging', 'tagihan'],
  },
  {
    group: 'reports',
    labelKey: 'navDepositReport',
    icon: <PiggyBank size={15} />,
    path: '/reports/deposits',
    permission: PERMS.REPORTS_FINANCIAL,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navDepositReportDesc',
    keywords: ['deposit', 'saldo pelanggan', 'titipan', 'top up', 'isi saldo'],
  },
  {
    group: 'reports',
    labelKey: 'navMasterExport',
    icon: <FileDown size={15} />,
    path: '/reports/master-export',
    landing: false,
    anyOf: [PERMS.INVENTORY_VIEW, PERMS.CUSTOMER_MANAGE, PERMS.INVENTORY_SUPPLIER, PERMS.EMPLOYEE_VIEW],
    advanced: true,
    descriptionKey: 'navMasterExportDesc',
    keywords: ['ekspor', 'export', 'csv', 'excel', 'cadangan', 'backup', 'pelanggan', 'supplier', 'karyawan', 'bahan baku'],
  },
  // Akuntansi (pembukuan berpasangan): baca = finance.accounting ATAU
  // reports.financial, sama dengan server. `landing: false` — laporan ini
  // bukan halaman kerja harian siapa pun, jadi menambahkannya tidak boleh
  // menggeser halaman pendaratan peran yang hanya memegang salah satu izin.
  {
    group: 'reports',
    labelKey: 'navAccProfitLoss',
    icon: <TrendingUp size={15} />,
    path: '/accounting/profit-loss',
    landing: false,
    anyOf: [PERMS.FINANCE_ACCOUNTING, PERMS.REPORTS_FINANCIAL],
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navAccProfitLossDesc',
    keywords: ['laba rugi', 'rugi laba', 'profit loss', 'p&l', 'laba bersih', 'akuntansi', 'laporan keuangan'],
  },
  {
    group: 'reports',
    labelKey: 'navAccBalanceSheet',
    icon: <Scale size={15} />,
    path: '/accounting/balance-sheet',
    landing: false,
    anyOf: [PERMS.FINANCE_ACCOUNTING, PERMS.REPORTS_FINANCIAL],
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navAccBalanceSheetDesc',
    keywords: ['neraca', 'balance sheet', 'aset', 'kewajiban', 'ekuitas', 'modal', 'akuntansi'],
  },
  {
    group: 'reports',
    labelKey: 'navAccTrialBalance',
    icon: <Sigma size={15} />,
    path: '/accounting/trial-balance',
    landing: false,
    anyOf: [PERMS.FINANCE_ACCOUNTING, PERMS.REPORTS_FINANCIAL],
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navAccTrialBalanceDesc',
    keywords: ['neraca saldo', 'trial balance', 'saldo akun', 'akuntansi'],
  },
  {
    group: 'reports',
    labelKey: 'navAccLedger',
    icon: <BookOpen size={15} />,
    path: '/accounting/ledger',
    landing: false,
    anyOf: [PERMS.FINANCE_ACCOUNTING, PERMS.REPORTS_FINANCIAL],
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navAccLedgerDesc',
    keywords: ['buku besar', 'general ledger', 'ledger', 'mutasi akun', 'akuntansi'],
  },
  {
    group: 'reports',
    labelKey: 'navAccJournal',
    icon: <NotebookPen size={15} />,
    path: '/accounting/journal',
    landing: false,
    anyOf: [PERMS.FINANCE_ACCOUNTING, PERMS.REPORTS_FINANCIAL],
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navAccJournalDesc',
    keywords: ['jurnal', 'jurnal umum', 'data jurnal', 'journal', 'debit kredit', 'akuntansi'],
  },
  {
    group: 'reports',
    labelKey: 'navAccAccounts',
    icon: <ListTree size={15} />,
    path: '/accounting/accounts',
    landing: false,
    anyOf: [PERMS.FINANCE_ACCOUNTING, PERMS.REPORTS_FINANCIAL],
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navAccAccountsDesc',
    keywords: ['perkiraan', 'daftar perkiraan', 'daftar akun', 'coa', 'chart of accounts', 'akun', 'akuntansi'],
  },
  {
    group: 'reports',
    labelKey: 'navAccMappings',
    icon: <Link2 size={15} />,
    path: '/accounting/mappings',
    landing: false,
    anyOf: [PERMS.FINANCE_ACCOUNTING, PERMS.REPORTS_FINANCIAL],
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navAccMappingsDesc',
    keywords: ['pemetaan', 'pemetaan akun', 'mapping', 'perkiraan', 'coa', 'akuntansi'],
  },

  // ─── Katalog ───────────────────────────────────────────────────────────────
  {
    group: 'products',
    labelKey: 'navProducts',
    icon: <Archive size={15} />,
    path: '/products',
    permission: PERMS.INVENTORY_VIEW,
    descriptionKey: 'navProductsDesc',
    keywords: ['produk', 'menu', 'barang', 'harga', 'ekstra', 'topping', 'level', 'modifier'],
  },
  // Paket tepat di sebelah Produk: isinya produk, dan dulu tidak ada satu pun
  // layar untuk membuatnya — hanya menjualnya di kasir.
  {
    group: 'products',
    labelKey: 'bdlTab',
    icon: <Package size={15} />,
    path: '/products/bundles',
    permission: PERMS.INVENTORY_VIEW,
    planRequired: 'pro',
    descriptionKey: 'bdlNavDesc',
    keywords: ['paket', 'bundel', 'bundle', 'combo', 'hemat'],
  },
  {
    group: 'products',
    labelKey: 'navLibrary',
    icon: <IconLibrary size={15} />,
    path: '/catalog/attributes',
    permission: PERMS.INVENTORY_VIEW,
    advanced: true,
    descriptionKey: 'navLibraryDesc',
    keywords: ['kategori', 'brand', 'merek', 'satuan', 'library'],
  },
  // Diskon dikeluarkan dari halaman gabungan yang dulu bernama "Library".
  // Ia salah satu menu yang paling sering dicari lewat namanya, dan sebagai
  // tab keempat di dalam menu lain ia praktis tidak bisa ditemukan.
  {
    group: 'products',
    labelKey: 'navDiscounts',
    icon: <Gift size={15} />,
    path: '/discounts',
    permission: PERMS.INVENTORY_VIEW,
    descriptionKey: 'navDiscountsDesc',
    keywords: ['promo', 'potongan harga', 'voucher'],
  },
  {
    group: 'products',
    labelKey: 'navPricing',
    icon: <Sparkles size={15} />,
    path: '/pricing/insights',
    permission: PERMS.INVENTORY_VIEW,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navPricingDesc',
    keywords: ['rekomendasi harga', 'harga jual', 'margin', 'hpp'],
  },
  {
    group: 'products',
    labelKey: 'bpNavLabel',
    icon: <Calculator size={15} />,
    path: '/products/base-prices',
    permission: PERMS.INVENTORY_VIEW,
    advanced: true,
    descriptionKey: 'bpNavDesc',
    keywords: ['hpp', 'harga modal', 'modal', 'cost', 'harga pokok'],
  },

  // ─── Penyewaan lapangan ────────────────────────────────────────────────────
  //
  // Kalender duduk di kelompok TRANSAKSI, bukan pengaturan: di tempat padel,
  // inilah layar tempat pekerjaan sehari-hari terjadi. Lapangan dan tarifnya
  // adalah pengaturan usaha, jadi keduanya duduk di kelompoknya sendiri.
  {
    group: 'daily',
    labelKey: 'bkCalendar',
    icon: <CalendarDays size={15} />,
    path: '/booking/calendar',
    permission: PERMS.POS_CREATE_ORDER,
    verticals: RENTAL_VERTICALS,
    descriptionKey: 'bkCourtsHint',
    keywords: ['lapangan', 'kalender', 'booking', 'padel', 'futsal', 'sewa'],
  },
  {
    group: 'settings',
    labelKey: 'bkCourts',
    icon: <LandPlot size={15} />,
    path: '/booking/courts',
    permission: PERMS.SETTINGS_EDIT,
    settingsGroup: 'store',
    verticals: RENTAL_VERTICALS,
    descriptionKey: 'bkCourtsHint',
    keywords: ['lapangan', 'court', 'padel', 'futsal'],
  },
  {
    group: 'settings',
    labelKey: 'bkRates',
    icon: <Clock size={15} />,
    path: '/booking/rates',
    permission: PERMS.SETTINGS_EDIT,
    settingsGroup: 'store',
    verticals: RENTAL_VERTICALS,
    descriptionKey: 'bkRatesHint',
    keywords: ['tarif', 'prime time', 'jam sibuk', 'harga sewa'],
  },

  // ─── Inventori ─────────────────────────────────────────────────────────────
  {
    group: 'inventory',
    labelKey: 'navStock',
    icon: <Boxes size={15} />,
    path: '/inventory/current-stock',
    permission: PERMS.INVENTORY_VIEW,
    descriptionKey: 'navStockDesc',
    keywords: ['stok', 'persediaan', 'barang'],
  },
  // Papan kedaluwarsa hanya untuk apotek: obat yang lewat tanggal adalah
  // persoalan keselamatan, dan tidak dikunci paket berbayar dengan alasan yang
  // sama seperti di aplikasi kasirnya.
  {
    group: 'inventory',
    labelKey: 'pharmExpiryTitle',
    icon: <Cross size={15} />,
    path: '/inventory/expiry',
    permission: PERMS.INVENTORY_VIEW,
    verticals: ['APOTEK'],
    descriptionKey: 'pharmExpiryEmptyBody',
    keywords: ['kedaluwarsa', 'expired', 'batch', 'obat', 'apotek'],
  },
  {
    group: 'inventory',
    labelKey: 'navStockTransfer',
    icon: <ArrowLeftRight size={15} />,
    path: '/inventory/transfers',
    permission: PERMS.INVENTORY_TRANSFER,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navStockTransferDesc',
    keywords: ['pindah stok', 'mutasi stok'],
  },
  {
    group: 'inventory',
    labelKey: 'navStockHistory',
    icon: <History size={15} />,
    path: '/inventory/movements',
    permission: PERMS.INVENTORY_VIEW,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navStockHistoryDesc',
    keywords: ['keluar masuk stok', 'pergerakan', 'mutasi', 'riwayat stok'],
  },
  // Produksi / Perakitan: barang jadi dirakit dari resepnya sebelum dijual.
  {
    group: 'inventory',
    labelKey: 'pdnTitle',
    icon: <Factory size={15} />,
    path: '/inventory/production',
    anyOf: [PERMS.INVENTORY_HPP, PERMS.INVENTORY_EDIT],
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'pdnMenuHint',
    keywords: ['produksi', 'perakitan', 'rakit', 'resep', 'bom', 'barang jadi', 'assembly'],
  },
  {
    group: 'inventory',
    labelKey: 'navRawMaterials',
    icon: <FlaskConical size={15} />,
    path: '/inventory/raw-materials',
    permission: PERMS.INVENTORY_VIEW,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navRawMaterialsDesc',
    keywords: ['resep', 'komposisi', 'bahan', 'bom'],
  },
  {
    group: 'inventory',
    labelKey: 'navSuppliers',
    icon: <Truck size={15} />,
    path: '/inventory/suppliers',
    permission: PERMS.INVENTORY_SUPPLIER,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navSuppliersDesc',
    keywords: ['supplier', 'vendor', 'penitip', 'konsinyasi', 'titipan'],
  },
  {
    group: 'inventory',
    labelKey: 'csPageTitle',
    icon: <Handshake size={15} />,
    path: '/inventory/consignment',
    permission: PERMS.INVENTORY_VIEW,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'csPageSubtitle',
    keywords: ['penitip', 'konsinyasi', 'titipan', 'settlement', 'pelunasan', 'retur'],
  },
  {
    group: 'inventory',
    labelKey: 'navStockOpname',
    icon: <ClipboardCheck size={15} />,
    path: '/inventory/stock-opname',
    permission: PERMS.INVENTORY_VIEW,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navStockOpnameDesc',
    keywords: ['opname', 'stok opname', 'hitung fisik', 'cek fisik', 'selisih stok'],
  },
  {
    group: 'inventory',
    labelKey: 'navPurchaseOrders',
    icon: <ClipboardList size={15} />,
    path: '/inventory/purchase-orders',
    permission: PERMS.INVENTORY_PURCHASE_ORDER,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navPurchaseOrdersDesc',
    keywords: ['purchase order', 'po', 'pesanan supplier', 'belanja stok'],
  },
  // Laporan Pembelian & Hutang Supplier: grup 'inventory' (di belakang PO)
  // supaya peran yang memegang inventory.purchase_order tetap mendarat di
  // halaman kerja, bukan laporan. Di sidebar keduanya tampil di hub Laporan
  // lewat navigationHubs. Server: Pro + inventory.purchase_order ATAU
  // reports.financial.
  {
    group: 'inventory',
    labelKey: 'navPurchaseReport',
    icon: <ShoppingBag size={15} />,
    path: '/reports/purchases',
    anyOf: [PERMS.INVENTORY_PURCHASE_ORDER, PERMS.REPORTS_FINANCIAL],
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navPurchaseReportDesc',
    keywords: ['pembelian', 'laporan pembelian', 'barang masuk', 'supplier', 'purchase'],
  },
  {
    group: 'inventory',
    labelKey: 'navSupplierPayables',
    icon: <Wallet size={15} />,
    path: '/reports/supplier-payables',
    anyOf: [PERMS.INVENTORY_PURCHASE_ORDER, PERMS.REPORTS_FINANCIAL],
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navSupplierPayablesDesc',
    keywords: ['hutang', 'utang', 'supplier', 'jatuh tempo', 'umur hutang', 'payable', 'kartu hutang'],
  },

  // ─── Manajemen ─────────────────────────────────────────────────────────────
  {
    group: 'team',
    labelKey: 'navOutlets',
    icon: <Store size={15} />,
    path: '/outlets',
    permission: PERMS.SETTINGS_VIEW,
    descriptionKey: 'navOutletsDesc',
    keywords: ['outlet', 'cabang', 'toko', 'lokasi usaha'],
  },
  // Tim — satu pintu untuk Karyawan · Kehadiran · Shift Kasir, sejajar dengan
  // shell "Tim" di aplikasi kasir. Ketiga rute aslinya tetap terdaftar di
  // bawah (`sidebar: false`) supaya tautan lama dan Command Palette tetap
  // bekerja, hanya saja tidak lagi memenuhi sidebar sebagai tiga baris yang
  // menjawab pertanyaan yang sama.
  {
    group: 'team',
    labelKey: 'navTeam',
    icon: <Users size={15} />,
    path: '/team',
    permission: PERMS.EMPLOYEE_VIEW,
    descriptionKey: 'navTeamDesc',
    keywords: ['tim', 'karyawan', 'pegawai', 'staf', 'absensi', 'kehadiran', 'shift'],
  },
  // Penggajian: server memagari /payroll dengan AuthorizeOwner, jadi menunya
  // hanya untuk OWNER; karyawan lain melihat slipnya sendiri di /payroll/me.
  {
    group: 'team',
    labelKey: 'payrollTitle',
    icon: <Banknote size={15} />,
    path: '/payroll',
    permission: PERMS.EMPLOYEE_VIEW,
    roles: ['OWNER'],
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'payrollSubtitle',
    keywords: ['gaji', 'payroll', 'slip gaji', 'penggajian', 'upah'],
  },
  {
    group: 'team',
    labelKey: 'payrollMyTitle',
    icon: <Banknote size={15} />,
    path: '/payroll/me',
    hideForRoles: ['OWNER'],
    planRequired: 'pro',
    descriptionKey: 'payrollMySubtitle',
    keywords: ['gaji', 'slip gaji', 'payroll'],
  },
  {
    group: 'team',
    labelKey: 'navEmployees',
    icon: <IconEmployee size={15} />,
    path: '/employees',
    permission: PERMS.EMPLOYEE_VIEW,
    sidebar: false,
    descriptionKey: 'navEmployeesDesc',
    keywords: ['karyawan', 'pegawai', 'staf', 'kasir', 'pin'],
  },
  {
    group: 'team',
    labelKey: 'navAttendance',
    icon: <CalendarCheck size={15} />,
    path: '/attendance',
    permission: PERMS.EMPLOYEE_VIEW,
    planRequired: 'pro',
    sidebar: false,
    descriptionKey: 'navAttendanceDesc',
    keywords: ['absensi', 'presensi', 'hadir', 'jam kerja'],
  },
  {
    group: 'team',
    labelKey: 'navTerminals',
    icon: <Monitor size={15} />,
    path: '/master/terminals',
    permission: PERMS.SETTINGS_VIEW,
    advanced: true,
    descriptionKey: 'navTerminalsDesc',
    keywords: ['terminal', 'pos', 'device', 'hp kasir', 'tablet kasir'],
  },
  {
    group: 'team',
    labelKey: 'navTables',
    icon: <IconTable size={15} />,
    path: '/master/tables',
    permission: PERMS.SETTINGS_VIEW,
    planRequired: 'pro',
    advanced: true,
    descriptionKey: 'navTablesDesc',
    keywords: ['meja', 'dine in', 'qr', 'scan menu'],
  },

  // ─── Pengaturan ────────────────────────────────────────────────────────────
  // Satu pintu masuk di Sidebar; sisanya jadi kartu di halaman hub /settings.
  {
    group: 'settings',
    labelKey: 'navSettingsHub',
    icon: <IconSettings size={15} />,
    path: '/settings',
    descriptionKey: 'navSettingsHubDesc',
    keywords: ['pengaturan', 'setting', 'konfigurasi'],
  },
  // Pengaturan Toko — pintu yang sama seperti di aplikasi kasir.
  //
  // Isinya memang halaman Outlet: di sanalah info outlet, struk, nomor
  // antrian, biaya pelayanan, pembulatan, kasbon, dan QRIS diatur, persis
  // seperti satu layar "Pengaturan Toko" di aplikasi. Yang berbeda hanya
  // dashboard mengelola BANYAK outlet sekaligus, jadi daftarnya tetap ada.
  {
    group: 'settings',
    labelKey: 'navStoreSettings',
    icon: <Store size={15} />,
    path: '/outlets',
    permission: PERMS.SETTINGS_VIEW,
    sidebar: false,
    settingsGroup: 'store',
    descriptionKey: 'navStoreSettingsDesc',
    keywords: ['struk', 'receipt', 'antrian', 'biaya pelayanan', 'pembulatan', 'qris', 'kasbon', 'outlet'],
  },
  {
    group: 'settings',
    labelKey: 'navPharmacySettings',
    icon: <Pill size={15} />,
    path: '/settings/pharmacy',
    permission: PERMS.SETTINGS_VIEW,
    sidebar: false,
    settingsGroup: 'store',
    verticals: ['APOTEK'],
    descriptionKey: 'navPharmacySettingsDesc',
    keywords: ['apotek', 'apoteker', 'sipa', 'resep', 'farmasi'],
  },
  {
    group: 'settings',
    labelKey: 'navProfile',
    icon: <UserCircle size={15} />,
    path: '/profile',
    settingsGroup: 'account',
    sidebar: false,
    descriptionKey: 'navProfileDesc',
  },
  {
    group: 'settings',
    labelKey: 'navMembership',
    icon: <CreditCard size={15} />,
    path: '/membership',
    permission: PERMS.SETTINGS_VIEW,
    settingsGroup: 'payment',
    sidebar: false,
    descriptionKey: 'navMembershipDesc',
  },
  {
    group: 'settings',
    labelKey: 'navFinanceSettings',
    icon: <Calculator size={15} />,
    path: '/settings/finance',
    permission: PERMS.SETTINGS_VIEW,
    planRequired: 'pro',
    settingsGroup: 'store',
    sidebar: false,
    descriptionKey: 'navFinanceSettingsDesc',
  },
  {
    group: 'settings',
    labelKey: 'navTaxSettings',
    icon: <Percent size={15} />,
    path: '/settings/tax',
    permission: PERMS.SETTINGS_VIEW,
    settingsGroup: 'store',
    sidebar: false,
    descriptionKey: 'navTaxSettingsDesc',
  },
  {
    group: 'settings',
    labelKey: 'navLoyaltySettings',
    icon: <Gift size={15} />,
    path: '/settings/loyalty',
    permission: PERMS.SETTINGS_VIEW,
    planRequired: 'pro',
    settingsGroup: 'store',
    sidebar: false,
    descriptionKey: 'navLoyaltySettingsDesc',
  },
  {
    group: 'settings',
    labelKey: 'navRbac',
    icon: <KeyRound size={15} />,
    path: '/settings/rbac',
    permission: PERMS.RBAC_MANAGE,
    settingsGroup: 'people',
    sidebar: false,
    descriptionKey: 'navRbacDesc',
    keywords: ['hak akses', 'role', 'peran', 'izin karyawan'],
  },
  {
    group: 'settings',
    labelKey: 'navPrivilegeList',
    icon: <ShieldCheck size={15} />,
    path: '/settings/privilege-list',
    permission: PERMS.RBAC_MANAGE,
    settingsGroup: 'people',
    sidebar: false,
    descriptionKey: 'navPrivilegeListDesc',
    keywords: ['daftar izin', 'permission', 'akses karyawan'],
  },
  {
    group: 'settings',
    labelKey: 'navActivityLog',
    icon: <Search size={15} />,
    path: '/audit-log',
    permission: PERMS.SETTINGS_VIEW,
    settingsGroup: 'other',
    sidebar: false,
    descriptionKey: 'navActivityLogDesc',
  },
  {
    group: 'settings',
    labelKey: 'navNotifications',
    icon: <Bell size={15} />,
    path: '/notifications',
    settingsGroup: 'other',
    sidebar: false,
    descriptionKey: 'navNotificationsDesc',
    keywords: ['notifikasi', 'pesan', 'info'],
  },
  {
    group: 'settings',
    labelKey: 'navPlatform',
    icon: <Layers size={15} />,
    path: '/platform',
    permission: PERMS.SETTINGS_EDIT,
    settingsGroup: 'account',
    sidebar: false,
    descriptionKey: 'navPlatformDesc',
    keywords: ['platform', 'panduan', 'cara pakai', 'aplikasi kasir'],
  },
]
