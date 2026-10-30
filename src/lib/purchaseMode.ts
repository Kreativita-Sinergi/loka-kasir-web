import type { POPaymentMethod, POPaymentPayload } from '@/api/purchasePayables'
import type { MessageKey } from '@/lib/messages'
import type { Business } from '@/types'

/**
 * Saklar "Pakai Purchase Order" usaha ini.
 *
 * Bawaan NYALA, sama dengan server: hanya `false` yang mematikannya, supaya
 * sesi yang disimpan sebelum kolom ini ada (atau server lama) tetap melihat
 * alur PO seperti biasa, bukan tiba-tiba "Pembelian".
 */
export function purchaseOrdersEnabled(business?: Pick<Business, 'purchase_orders_enabled'> | null): boolean {
  return business?.purchase_orders_enabled !== false
}

/**
 * Bagian "Bayar sekarang" Pembelian langsung → payload `payment`.
 *
 * Tidak dibayar = null (seluruhnya jadi hutang supplier). Nominal harus > 0
 * dan tidak melebihi total — server menolak hal yang sama, tetapi menolaknya
 * di sini menjaga formulir tetap terisi tanpa perjalanan ke server.
 */
export function directPurchasePayment(input: {
  payNow: boolean
  amount: number
  total: number
  method: POPaymentMethod
  accountId?: string
}): { payment: POPaymentPayload | null } | { error: MessageKey } {
  if (!input.payNow) return { payment: null }
  if (!Number.isFinite(input.amount) || input.amount <= 0) return { error: 'dpurPayAmountRequired' }
  if (input.amount > input.total + 0.004) return { error: 'dpurPayExceeds' }
  return {
    payment: {
      amount: input.amount,
      method: input.method,
      cash_account_id: input.accountId || null,
    },
  }
}
