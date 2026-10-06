import type { ConsignmentSettlement, ConsignmentSettlementStatus } from '@/api/consignment'
import { todayISODate } from '@/lib/utils'
import { t } from '@/lib/i18n'

// Fungsi murni yang dipakai bersama oleh semua tab konsinyasi. Komponen
// bersamanya (PeriodInputs, SettlementStatusBadge) ada di consignmentShared.tsx.

// Tanggal LOKAL, bukan UTC — toISOString atas tengah malam lokal di WIB jatuh ke hari sebelumnya.
export const iso = (d: Date) => todayISODate(d)
export const firstOfMonth = () => {
  const n = new Date()
  return iso(new Date(n.getFullYear(), n.getMonth(), 1))
}
export const qtyText = (q: number) => (Number.isInteger(q) ? String(q) : q.toFixed(2))

/** Backend menulis 'CANCELED'; aplikasi lama pernah mengirim 'CANCELLED'. */
export function settlementStatus(raw: string | undefined): ConsignmentSettlementStatus {
  const upper = (raw ?? '').toUpperCase()
  if (upper === 'PAID' || upper === 'LUNAS') return 'PAID'
  if (upper === 'CANCELED' || upper === 'CANCELLED' || upper === 'BATAL') return 'CANCELED'
  return 'DRAFT'
}

export const isPaymentKind = (s: Pick<ConsignmentSettlement, 'kind'>) => (s.kind ?? 'ITEMS').toUpperCase() === 'PAYMENT'

export const kindLabel = (s: Pick<ConsignmentSettlement, 'kind'>) => (isPaymentKind(s) ? t('csKindPayment') : t('csKindItems'))

/** Kelas input teks standar di form-form konsinyasi. */
export const inputCls = 'w-full border border-border rounded-lg px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500'
