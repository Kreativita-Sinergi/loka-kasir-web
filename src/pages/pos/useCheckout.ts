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
import { createTransaction, payTransaction, getActiveShiftForCashier, getActiveShiftByTerminal } from '@/api/pos'
import { getTerminalsByBusiness } from '@/api/terminals'
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
  /** Nomor antrian dari server (online). Null saat offline/tidak tersedia. */
  queueNumber?: string | null
  /** Nama pelanggan yang dicatat pada transaksi (untuk struk). */
  customerName?: string | null
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
        cashier_id: session.cashierId ?? user.id,
        customer_name: session.customer?.name ?? session.customerName ?? null,
        customer_id: session.customer?.id ?? null,
        customer_phone: session.customer?.phone ?? null,
        service_type: session.orderTypeId,
        table: session.tableId ?? null,
        items,
        notes: null,
        idempotency_key: idempotencyKey,
      }

      const payment: PaymentPayload = {
        cashier_id: session.cashierId ?? user.id,
        payment_method_id: input.paymentMethodId,
        amount_received: input.amountReceived,
        is_kasbon: input.isKasbon ?? false,
        reference: input.reference ?? null,
        edc_reference_no: input.edc?.referenceNo ?? null,
        edc_approval_code: input.edc?.approvalCode ?? null,
        edc_card_type: input.edc?.cardType ?? null,
        edc_acquirer: input.edc?.acquirer ?? null,
      }

      // Cari terminal yang punya shift OPEN untuk dipakai sebagai X-Terminal-Id.
      // Urutan: (1) shift kasir transaksi ini, (2) pindai terminal outlet. Tidak
      // bergantung pada terminal sesi yang bisa basi.
      const resolveActiveShiftTerminal = async (): Promise<string | null> => {
        try {
          const byCashier = (await getActiveShiftForCashier(create.cashier_id)).data.data
          if (byCashier?.status === 'open' && byCashier.terminal?.id) {
            return byCashier.terminal.id
          }
        } catch { /* lanjut ke pindai terminal */ }
        try {
          const terminals = (await getTerminalsByBusiness(user.business.id, { limit: 200 })).data.data ?? []
          for (const t of terminals) {
            if (t.outlet_id && t.outlet_id !== outlet.id) continue
            const s = (await getActiveShiftByTerminal(t.id)).data.data
            if (s?.status === 'open') return t.id
          }
        } catch { /* abaikan */ }
        return null
      }

      // ── Online path: create then settle ───────────────────────────────────
      // Bila gagal "NO_ACTIVE_SHIFT" (header X-Terminal-Id tak cocok dgn shift
      // aktif kasir), perbaiki terminal sesi dari shift aktif yang sebenarnya
      // lalu ulangi SEKALI. Aman dari duplikat karena idempotency_key.
      if (navigator.onLine) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const res = await createTransaction(create)
            const txId = res.data?.data?.transaction_id
            // Respons 200 tapi tanpa transaction_id ⇒ kontrak tidak valid.
            if (!txId) {
              return {
                ok: false,
                offline: false,
                error: 'Respons server tidak valid (transaction_id kosong). Coba lagi.',
              }
            }
            const queueNumber = res.data?.data?.queue_number ?? null
            await payTransaction(txId, payment)
            clearCart()
            void flushPending()
            return {
              ok: true,
              offline: false,
              serverTransactionId: txId,
              queueNumber,
              customerName: create.customer_name ?? null,
            }
          } catch (e) {
            if (isNetworkError(e)) break // → jatuh ke antrian offline

            // Bentuk error backend: { message, error: { code, field, details } }.
            const data = (e as {
              response?: {
                data?: {
                  message?: string
                  error?: { code?: string; details?: string } | string
                }
              }
            })?.response?.data
            const errObj = data?.error
            const code = typeof errObj === 'object' && errObj !== null ? errObj.code : undefined
            const errMsg = typeof errObj === 'object' && errObj !== null
              ? (errObj.details ?? errObj.code)
              : typeof errObj === 'string'
                ? errObj
                : undefined

            // Pemulihan sekali: header X-Terminal-Id tak menunjuk terminal yang
            // punya shift open. Cari terminal yang BENAR (tidak bergantung pada
            // sesi tersimpan yang bisa basi), samakan, lalu ulangi.
            if (code === 'NO_ACTIVE_SHIFT' && attempt === 0) {
              const realTerminal = await resolveActiveShiftTerminal()
              if (realTerminal) {
                usePosSessionStore.getState().setTerminal(realTerminal)
                continue // ulangi dgn header terminal yang benar
              }
            }

            return {
              ok: false,
              offline: false,
              error: errMsg || data?.message || 'Gagal memproses transaksi',
            }
          }
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
      // Penulisan IndexedDB bisa gagal (mode privat / kuota penuh). Tangkap agar
      // tidak melempar keluar dari checkout (yang membuat tombol bayar nyangkut).
      try {
        await posDb.pendingTransactions.put(pending)
      } catch {
        return {
          ok: false,
          offline: false,
          error: 'Gagal menyimpan transaksi offline. Periksa ruang penyimpanan browser.',
        }
      }
      clearCart()
      return { ok: true, offline: true }
    },
    [user, outlet, session, cartItems, clearCart],
  )
}
