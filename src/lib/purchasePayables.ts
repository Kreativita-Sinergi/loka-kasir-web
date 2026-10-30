import type { BadgeVariant } from '@/components/ui/Badge'
import type { MessageKey } from '@/lib/messages'
import { t } from '@/lib/i18n'
import type {
  PayableAging, PayablesReport, POPaymentMethod, POPaymentStatus, PurchaseReport,
} from '@/api/purchasePayables'

// Label, warna, dan baris CSV hutang supplier & laporan pembelian — dipakai
// rincian PO dan dua halaman laporannya. Kolom CSV sama dengan ekspor aplikasi.

export const PAYMENT_STATUS_LABEL: Record<POPaymentStatus, MessageKey> = {
  none: 'htsStatusNone',
  unpaid: 'htsStatusUnpaid',
  partial: 'htsStatusPartial',
  paid: 'htsStatusPaid',
}

export const PAYMENT_STATUS_VARIANT: Record<POPaymentStatus, BadgeVariant> = {
  none: 'gray',
  unpaid: 'red',
  partial: 'yellow',
  paid: 'green',
}

export const PAYMENT_METHOD_LABEL: Record<POPaymentMethod, MessageKey> = {
  cash: 'htsMethodCash',
  transfer: 'htsMethodTransfer',
  other: 'htsMethodOther',
}

export const paymentStatusLabel = (s: POPaymentStatus | undefined) => t(PAYMENT_STATUS_LABEL[s ?? 'none'] ?? 'htsStatusNone')

/** Lima ember umur hutang, urut dari belum jatuh tempo sampai > 90 hari. */
export const AGING_BUCKETS: { key: keyof PayableAging; label: MessageKey }[] = [
  { key: 'current', label: 'htsAgingCurrent' },
  { key: 'days_1_30', label: 'htsAging1' },
  { key: 'days_31_60', label: 'htsAging31' },
  { key: 'days_61_90', label: 'htsAging61' },
  { key: 'days_over_90', label: 'htsAging91' },
]

export const agingTotal = (a: PayableAging) => AGING_BUCKETS.reduce((sum, b) => sum + (a[b.key] ?? 0), 0)

export const supplierLabel = (name: string | null | undefined) => (name?.trim() ? name : t('htsNoSupplier'))

/** Sisa hutang yang masih bisa dibayar (selisih di bawah satu sen dianggap lunas). */
export const canPay = (balance: number) => balance > 0.004

const round2 = (v: number) => Math.round(v * 100) / 100

/** Tanggal lokal YYYY-MM-DD dari waktu RFC3339 — Excel membacanya sebagai tanggal. */
export function localISODate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const two = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
}

export type PurchaseGroup = 'supplier' | 'item' | 'order'

export const PURCHASE_GROUP_LABEL: Record<PurchaseGroup, MessageKey> = {
  supplier: 'pbrTabSupplier',
  item: 'pbrTabItem',
  order: 'pbrTabOrder',
}

export function purchaseCsvRows(report: PurchaseReport, group: PurchaseGroup): Record<string, string | number>[] {
  switch (group) {
    case 'supplier':
      return report.by_supplier.map(r => ({
        [t('htsSupplierCount')]: supplierLabel(r.supplier_name),
        [t('pbrOrders')]: r.order_count,
        [t('pbrTotal')]: round2(r.total),
      }))
    case 'item':
      return report.by_item.map(r => ({
        [t('pbrColItem')]: r.variant_name ? `${r.name} — ${r.variant_name}` : r.name,
        [t('pbrColUnit')]: r.unit,
        [t('pbrColQty')]: round2(r.quantity),
        [t('pbrTotal')]: round2(r.total),
        // Rata-rata tidak dijumlah di baris TOTAL: ditulis sebagai teks.
        [t('pbrColAvg')]: String(round2(r.average_cost)),
      }))
    case 'order':
      return report.by_order.map(r => ({
        [t('pbrColPo')]: r.po_number,
        [t('htsSupplierCount')]: supplierLabel(r.supplier_name),
        [t('pbrColOutlet')]: r.outlet_name ?? '',
        [t('pbrColReceivedAt')]: localISODate(r.received_at),
        [t('pbrTotal')]: round2(r.total),
        [t('htsPaid')]: round2(r.paid_amount),
        [t('htsBalance')]: round2(r.balance),
        [t('pbrColStatus')]: paymentStatusLabel(r.payment_status),
      }))
  }
}

export function payablesCsvRows(report: PayablesReport): Record<string, string | number>[] {
  return report.suppliers.map(r => ({
    [t('htsSupplierCount')]: supplierLabel(r.supplier_name),
    [t('htsColOrders')]: r.open_order_count,
    [t('htsReceivedValue')]: round2(r.received_amount),
    [t('htsPaid')]: round2(r.paid_amount),
    [t('htsBalance')]: round2(r.balance),
    ...Object.fromEntries(AGING_BUCKETS.map(b => [t(b.label), round2(r.aging[b.key] ?? 0)])),
    [t('htsOldestDue')]: r.oldest_due_date ?? '',
  }))
}
