// Checkout orchestration for the web POS. Decides between the online path
// (create → settle payment immediately) and the offline path (queue to
// IndexedDB for later sync + settlement). Mirrors the app's create_order +
// payment + pending-queue flow.

import { useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useOutletStore } from '@/store/outletStore'
import { usePosSessionStore } from '@/store/posSessionStore'
import { useCartStore } from '@/store/cartStore'
import { posDb } from '@/lib/posDb'
import { generateIdempotencyKey, flushPending } from '@/lib/posSync'
import { createTransaction, payTransaction } from '@/api/pos'
import {
  toItemPayload,
  type CartItem,
  type CreateTransactionPayload,
  type PaymentPayload,
  type PendingTransaction,
} from '@/pages/pos/types'

export interface CheckoutInput {
  paymentMethodId: number
  amountReceived: number
  isKasbon?: boolean
  reference?: string | null
  edc?: {
    referenceNo?: string | null
    approvalCode?: string | null
    cardType?: string | null
    acquirer?: string | null
  } | null
}

export interface CheckoutResult {
  ok: boolean
  offline: boolean
  serverTransactionId?: string | null
  error?: string
}

function isNetworkError(e: unknown): boolean {
  if (!navigator.onLine) return true
  const err = e as { response?: unknown; code?: string }
  // Axios sets `response` on HTTP errors; its absence ⇒ transport failure.
  return !err?.response
}

export function useCheckout() {
  const user = useAuthStore((s) => s.user)
  const outlet = useOutletStore((s) => s.selected)
  const session = usePosSessionStore()
  const cartItems = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clear)

  return useCallback(
    async (input: CheckoutInput): Promise<CheckoutResult> => {
      if (!user || !outlet) return { ok: false, offline: false, error: 'Sesi tidak valid' }
      if (cartItems.length === 0) return { ok: false, offline: false, error: 'Keranjang kosong' }
      if (!session.orderTypeId) return { ok: false, offline: false, error: 'Pilih tipe order' }

      const items = cartItems.map((i: CartItem) => toItemPayload(i))
      const createdAtMs = Date.now()
      const idempotencyKey = await generateIdempotencyKey({
        outletId: outlet.id,
        timestampMs: createdAtMs,
        items: items.map((i) => ({
          item_type: i.item_type,
          reference_id: i.reference_id,
          quantity: i.quantity,
        })),
      })

      const create: CreateTransactionPayload = {
        business_id: user.business.id,
        cashier_id: user.id,
        customer_name: session.customer?.name ?? session.customerName ?? null,
        service_type: session.orderTypeId,
        table: session.tableId ?? null,
        items,
        notes: null,
        idempotency_key: idempotencyKey,
      }

      const payment: PaymentPayload = {
        cashier_id: user.id,
        payment_method_id: input.paymentMethodId,
        amount_received: input.amountReceived,
        is_kasbon: input.isKasbon ?? false,
        reference: input.reference ?? null,
        edc_reference_no: input.edc?.referenceNo ?? null,
        edc_approval_code: input.edc?.approvalCode ?? null,
        edc_card_type: input.edc?.cardType ?? null,
        edc_acquirer: input.edc?.acquirer ?? null,
      }

      // ── Online path: create then settle ───────────────────────────────────
      if (navigator.onLine) {
        try {
          const res = await createTransaction(create)
          const txId = res.data.data.transaction_id
          await payTransaction(txId, payment)
          clearCart()
          // Opportunistically flush anything queued earlier.
          void flushPending()
          return { ok: true, offline: false, serverTransactionId: txId }
        } catch (e) {
          if (!isNetworkError(e)) {
            const msg = (e as { response?: { data?: { error?: string; message?: string } } })
              ?.response?.data
            return { ok: false, offline: false, error: msg?.error || msg?.message || 'Gagal memproses transaksi' }
          }
          // Network dropped mid-request → fall through to offline queue.
        }
      }

      // ── Offline path: queue for later sync + settlement ───────────────────
      const pending: PendingTransaction = {
        id: crypto.randomUUID?.() ?? `${createdAtMs}`,
        idempotencyKey,
        createdAtMs,
        create,
        payment,
        status: 'PENDING',
        retryCount: 0,
        settled: false,
      }
      await posDb.pendingTransactions.put(pending)
      clearCart()
      return { ok: true, offline: true }
    },
    [user, outlet, session, cartItems, clearCart],
  )
}
