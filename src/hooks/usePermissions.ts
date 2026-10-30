import { useAuthStore } from '@/store/authStore'
import type { AppMode, PermissionCode } from '@/types'

/**
 * Primary hook for permission-based UI control.
 *
 * All UI visibility decisions should go through this hook — never read
 * raw role names or ids to drive conditional rendering.
 *
 * @example
 * const { can, canAny, appMode, roleCode } = usePermissions()
 *
 * if (can('reports.financial')) { ... }
 * if (canAny('pos.create_order', 'pos.do_payment')) { ... }
 * if (appMode === 'FNB') { showTableMap() }
 */
export function usePermissions() {
  const can     = useAuthStore((s) => s.can)
  const canAny  = useAuthStore((s) => s.canAny)
  const user    = useAuthStore((s) => s.user)

  return {
    /** True if the user holds the given permission code. */
    can,

    /** True if the user holds any of the given codes. */
    canAny,

    /** Stable uppercase role code, e.g. "KASIR", "KOKI". */
    roleCode: user?.role?.code ?? user?.role?.name?.toUpperCase() ?? '',

    /** Business archetype UI mode: "FNB" | "RETAIL" | "SERVICES". */
    appMode: (user?.app_mode ?? 'RETAIL') as AppMode,

    /** Convenience: true when the user is Owner or Manager-level. */
    isManager: (user?.role?.code === 'OWNER' || user?.role?.code === 'MANAGER' || user?.role?.code === 'ADMIN'),

    /**
     * Akses ke halaman berpaket Pro. Tidak ada lagi paket Gratis: setiap usaha
     * memegang fitur Pro — aktif (Trial/Pro) atau terkunci (EXPIRED). Usaha
     * terkunci tetap boleh MEMBUKA halaman Pro yang dipakainya selama trial
     * (lihat saja); penulisan dimatikan lewat useCanWrite() dan ditolak server.
     */
    isPro: true,

  }
}

/**
 * Typed permission code constants — mirrors entity/permission.go.
 * Use these instead of raw strings to catch typos at compile time.
 */
export const PERMS = {
  // POS
  POS_OPEN_SHIFT:    'pos.open_shift',
  POS_CREATE_ORDER:  'pos.create_order',
  POS_DO_PAYMENT:    'pos.do_payment',
  POS_REFUND:        'pos.refund',
  POS_CANCEL_ORDER:  'pos.cancel_order',
  POS_VIEW_KDS:      'pos.view_kds',
  POS_UPDATE_KDS:    'pos.update_kds',
  POS_VIEW_TABLES:   'pos.view_tables',
  POS_MANAGE_TABLES: 'pos.manage_tables', // tandai dipesan, duduk/pindah/gabung meja
  POS_SETUP_TABLES:  'pos.setup_tables',  // tambah/ubah/hapus meja & buat ulang QR
  POS_DELETE_TRANSACTION: 'pos.delete_transaction', // hapus permanen — tak bisa dibatalkan

  // Reports
  REPORTS_VIEW:      'reports.view',
  REPORTS_FINANCIAL: 'reports.financial',
  REPORTS_SHIFT:     'reports.shift',

  // Inventory
  INVENTORY_VIEW:          'inventory.view',
  INVENTORY_EDIT:          'inventory.edit',
  /** Hanya mencatat barang masuk — tanpa mengubah produk, tanpa penyesuaian stok. */
  INVENTORY_STOCK_IN:      'inventory.stock_in',
  INVENTORY_TRANSFER:      'inventory.transfer',
  INVENTORY_HPP:           'inventory.hpp',            // raw materials, BOM, waste, pricing
  INVENTORY_SUPPLIER:      'inventory.supplier',       // manage suppliers
  INVENTORY_PURCHASE_ORDER:'inventory.purchase_order', // create & receive purchase orders
  INVENTORY_OPNAME:        'inventory.opname',         // run & post physical stock counts

  // Reports (extra)
  REPORTS_PROFITABILITY:   'reports.profitability',    // HPP cost vs revenue analysis

  // Finance
  /** Kas & Rekening: saldo, mutasi, pindah dana, pembatalan catatan. */
  FINANCE_CASH_BOOK: 'finance.cash_book',
  /** Akuntansi: ubah Daftar Perkiraan & Pemetaan, buat & batalkan Jurnal Umum.
   *  Membaca laporan akuntansi cukup ini ATAU reports.financial. */
  FINANCE_ACCOUNTING: 'finance.accounting',

  // Employee
  EMPLOYEE_VIEW:     'employee.view',
  EMPLOYEE_MANAGE:   'employee.manage',

  // Settings
  SETTINGS_VIEW:     'settings.view',
  SETTINGS_EDIT:     'settings.edit',
  RBAC_MANAGE:       'rbac.manage',

  // Customer
  CUSTOMER_LOYALTY:  'customer.loyalty',
  CUSTOMER_MANAGE:   'customer.manage',
} as const satisfies Record<string, PermissionCode>
