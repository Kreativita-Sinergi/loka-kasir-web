// Dynamic QRIS checkout (Duitku milik merchant): create the transaction (unpaid)
// then create a Duitku QRIS charge with the merchant's own account. The cashier
// shows the QR; the Duitku webhook settles the transaction server-side and the
// QR modal detects it via polling. Requires an online connection + outlet in
// dynamic mode with Duitku creds configured.

import { useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useOutletStore } from '@/store/outletStore'
import { usePosSessionStore } from '@/store/posSessionStore'
import { useCartStore } from '@/store/cartStore'
import { createTransaction, createPosQrisCharge } from '@/api/pos'
import { toItemPayload, type CartItem, type CreateTransactionPayload } from '@/pages/pos/types'

export interface QrisChargeResult {
  ok: boolean
  orderId?: string
  paymentUrl?: string | null
  error?: string
}

export function useQrisCheckout() {
  const user = useAuthStore((s) => s.user)
  const outlet = useOutletStore((s) => s.selected)
  const session = usePosSessionStore()
  const cartItems = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clear)

  return useCallback(async (): Promise<QrisChargeResult> => {
    if (!navigator.onLine) return { ok: false, error: 'QRIS dinamis butuh koneksi internet' }
    if (!user || !outlet) return { ok: false, error: 'Sesi tidak valid' }
    if (cartItems.length === 0) return { ok: false, error: 'Keranjang kosong' }
    if (!session.orderTypeId) return { ok: false, error: 'Pilih tipe order' }

    const items = cartItems.map((i: CartItem) => toItemPayload(i))
    const create: CreateTransactionPayload = {
      business_id: user.business.id,
      cashier_id: session.cashierId ?? user.id,
      customer_name: session.customer?.name ?? session.customerName ?? null,
      service_type: session.orderTypeId,
      table: session.tableId ?? null,
      items,
      notes: null,
    }

    try {
      const txRes = await createTransaction(create)
      const txId = txRes.data.data.transaction_id
      const chargeRes = await createPosQrisCharge(txId, user.email ?? undefined)
      const order = chargeRes.data.data
      clearCart()
      session.resetAfterSale()
      return { ok: true, orderId: order.id, paymentUrl: order.payment_url }
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string; message?: string } } })?.response?.data
      return { ok: false, error: msg?.error || msg?.message || 'Gagal membuat tagihan QRIS' }
    }
  }, [user, outlet, session, cartItems, clearCart])
}
