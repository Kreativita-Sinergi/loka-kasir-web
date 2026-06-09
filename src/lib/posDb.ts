// IndexedDB layer for the web POS (kasir), powered by Dexie.
// This is the browser equivalent of the Flutter app's SQLite store
// (`local_database_controller.dart` + `pending_transaction_queue.dart`):
// it caches master data for offline catalog browsing and queues transactions
// created while offline for later sync.

import Dexie, { type Table } from 'dexie'
import type { Product, Category, Tax, Discount, PaymentMethod, OrderType } from '@/types'
import type { PendingTransaction, HeldOrder } from '@/pages/pos/types'

/** Key-value cursor store for delta-sync bookkeeping (per outlet). */
export interface SyncMeta {
  /** key = `products:<outletId>` → last_sync RFC3339 cursor. */
  key: string
  value: string
}

class PosDatabase extends Dexie {
  products!: Table<Product, string>
  categories!: Table<Category, string>
  taxes!: Table<Tax, string>
  discounts!: Table<Discount, string>
  paymentMethods!: Table<PaymentMethod, number>
  orderTypes!: Table<OrderType, number>
  pendingTransactions!: Table<PendingTransaction, string>
  heldOrders!: Table<HeldOrder, string>
  syncMeta!: Table<SyncMeta, string>

  constructor() {
    super('loka_pos')
    this.version(1).stores({
      // Only index fields we query on; the rest of each object is stored as-is.
      products: 'id, name, sku, is_active, is_available, updated_at',
      categories: 'id, name',
      taxes: 'id',
      discounts: 'id, scope, ref_id, is_active',
      paymentMethods: 'id, code',
      orderTypes: 'id, code',
      pendingTransactions: 'id, status, createdAtMs',
      heldOrders: 'id, heldAt',
      syncMeta: 'key',
    })
  }
}

export const posDb = new PosDatabase()

// ── SyncMeta helpers ─────────────────────────────────────────────────────────
export const getSyncCursor = async (key: string): Promise<string | null> => {
  const row = await posDb.syncMeta.get(key)
  return row?.value ?? null
}

export const setSyncCursor = (key: string, value: string) =>
  posDb.syncMeta.put({ key, value })

/** Wipe all cached + queued POS data (used on logout). */
export const clearPosDb = () =>
  posDb.transaction('rw', posDb.tables, async () => {
    await Promise.all(posDb.tables.map((t) => t.clear()))
  })

// ─── Pending transaction management (offline queue) ──────────────────────────

/** Semua transaksi di antrian offline, terbaru dulu. */
export const listPendingTransactions = () =>
  posDb.pendingTransactions.orderBy('createdAtMs').reverse().toArray()

/** Antrikan ulang transaksi yang CONFLICT agar dicoba lagi saat sync berikutnya. */
export const retryPendingTransaction = (id: string) =>
  posDb.pendingTransactions.update(id, { status: 'PENDING', conflictReason: null })

/** Buang transaksi dari antrian (mis. konflik yang sudah ditangani manual). */
export const discardPendingTransaction = (id: string) =>
  posDb.pendingTransactions.delete(id)
