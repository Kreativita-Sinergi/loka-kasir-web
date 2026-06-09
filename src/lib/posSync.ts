// Offline-first sync engine for the web POS. Browser equivalent of the app's
// `sync_service.dart` / `MasterDataSync` + `pending_transaction_queue`.
//
//  • pullProducts(): delta-sync the product catalog into IndexedDB.
//  • flushPending(): push queued offline transactions via /transaction/sync,
//    then settle each created transaction's payment via /transaction/payment/:id
//    (the offline create is unpaid on the server, exactly like the app).

import { posDb, getSyncCursor, setSyncCursor } from '@/lib/posDb'
import {
  syncProducts,
  syncTransactions,
  payTransaction,
  type SyncBatchItem,
} from '@/api/pos'
import type { PendingTransaction } from '@/pages/pos/types'

// ─── SHA-256 hex (matches app PendingTransaction.generateIdempotencyKey) ──────

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Deterministic idempotency key so an identical cart (same outlet, same ms,
 * same items) resolves to the same key — letting the backend detect resends.
 * Formula mirrors the Flutter app exactly.
 */
export async function generateIdempotencyKey(params: {
  outletId: string
  timestampMs: number
  items: { item_type: string; reference_id: string; quantity: number }[]
}): Promise<string> {
  const sorted = [...params.items].sort((a, b) =>
    (a.reference_id ?? '').localeCompare(b.reference_id ?? ''),
  )
  const cartComponents = sorted
    .map((i) => `${i.item_type}:${i.reference_id}:${i.quantity}`)
    .join('|')
  const cartHash = await sha256Hex(cartComponents)
  return sha256Hex(`${params.outletId}:${params.timestampMs}:${cartHash}`)
}

// ─── Master-data delta sync ──────────────────────────────────────────────────

const PRODUCTS_CURSOR = (outletId: string) => `products:${outletId}`

/** Returns the number of products upserted/removed. */
export async function pullProducts(outletId: string): Promise<number> {
  const lastSync = await getSyncCursor(PRODUCTS_CURSOR(outletId))
  const res = await syncProducts(outletId, lastSync)
  const list = res.data.data ?? []

  const toUpsert = list.filter((p) => !p.deleted_at)
  const toDelete = list.filter((p) => p.deleted_at).map((p) => p.id)

  await posDb.transaction('rw', posDb.products, async () => {
    if (toDelete.length) await posDb.products.bulkDelete(toDelete)
    if (toUpsert.length) await posDb.products.bulkPut(toUpsert)
  })

  // Advance cursor to now (server filters by updated_at > last_sync).
  await setSyncCursor(PRODUCTS_CURSOR(outletId), new Date().toISOString())
  return list.length
}

// ─── Pending transaction flush ───────────────────────────────────────────────

/**
 * Push all PENDING/CONFLICT offline transactions and settle their payments.
 * Safe to call repeatedly (idempotency key guards against duplicates).
 * Returns counts for UI feedback.
 */
export async function flushPending(): Promise<{
  synced: number
  conflicts: number
  settled: number
}> {
  const queued = await posDb.pendingTransactions
    .where('status')
    .anyOf('PENDING', 'CONFLICT')
    .toArray()

  if (queued.length === 0) return { synced: 0, conflicts: 0, settled: 0 }

  // Backend accepts max 50 per batch.
  const batch = queued.slice(0, 50)

  await posDb.pendingTransactions.bulkPut(
    batch.map((p) => ({ ...p, status: 'SYNCING' as const })),
  )

  const items: SyncBatchItem[] = batch.map((p) => ({
    local_id: p.id,
    idempotency_key: p.idempotencyKey,
    created_at_ms: p.createdAtMs,
    customer_name: p.create.customer_name ?? null,
    notes: p.create.notes ?? null,
    service_type: p.create.service_type,
    table: p.create.table ?? null,
    items: p.create.items,
  }))

  let synced = 0
  let conflicts = 0
  let settled = 0

  try {
    const res = await syncTransactions(items)
    const results = res.data.data?.results ?? []
    const byLocal = new Map(results.map((r) => [r.local_id, r]))

    for (const p of batch) {
      const r = byLocal.get(p.id)
      if (!r) {
        // No result → leave as PENDING for the next attempt.
        await posDb.pendingTransactions.update(p.id, { status: 'PENDING' })
        continue
      }

      if (r.status === 'CONFLICT') {
        conflicts++
        await posDb.pendingTransactions.update(p.id, {
          status: 'CONFLICT',
          conflictReason: r.reason ?? 'Ditolak server',
          retryCount: p.retryCount + 1,
        })
        continue
      }

      // SUCCESS or DUPLICATE → we have a server transaction id.
      const serverId = r.server_transaction_id ?? r.existing_tx_id ?? null
      synced++

      const didSettle = await settlePayment(p, serverId)
      if (didSettle) settled++

      await posDb.pendingTransactions.update(p.id, {
        status: 'SYNCED',
        serverTransactionId: serverId,
        settled: didSettle || p.settled,
      })
    }
  } catch {
    // Network failed mid-flush → roll SYNCING back to PENDING.
    await posDb.pendingTransactions.bulkPut(
      batch.map((p) => ({ ...p, status: 'PENDING' as const })),
    )
  }

  return { synced, conflicts, settled }
}

/** Settle a synced transaction's payment via the existing payment endpoint. */
async function settlePayment(
  p: PendingTransaction,
  serverId: string | null,
): Promise<boolean> {
  if (p.settled || !p.payment || !serverId) return false
  try {
    await payTransaction(serverId, p.payment)
    return true
  } catch {
    // Settlement can be retried on the next flush; the create is already saved.
    return false
  }
}

