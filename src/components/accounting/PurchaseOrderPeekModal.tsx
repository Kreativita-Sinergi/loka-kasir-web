import { useQuery } from '@tanstack/react-query'
import Modal from '@/components/ui/Modal'
import QueryErrorState from '@/components/ui/QueryErrorState'
import POPaymentSection from '@/components/purchasing/POPaymentSection'
import { getPurchaseOrderById } from '@/api/purchaseOrders'
import type { PurchaseOrder } from '@/types'
import { formatAccDate } from '@/lib/accounting'
import { formatQuantity } from '@/lib/money'
import { cn, formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'
import type { MessageKey } from '@/lib/messages'
import { thClass } from './accountingUi'

const STATUS_LABEL: Record<PurchaseOrder['status'], MessageKey> = {
  draft: 'poStatusDraft',
  ordered: 'poStatusOrdered',
  partial_received: 'poPartiallyReceived',
  received: 'poStatusReceived',
  cancelled: 'statusCancelled',
}

/**
 * Ringkasan PO untuk telusur dari jurnal Pembelian / Pembayaran supplier.
 * Modal detail PO di halaman Pesanan ke Supplier memuat alur terima barang
 * yang tidak relevan di sini; yang dibutuhkan akuntan hanya barang, nilai,
 * dan riwayat pembayarannya (POPaymentSection yang sama).
 */
export default function PurchaseOrderPeekModal({ poId, onClose }: { poId: string; onClose: () => void }) {
  const query = useQuery({
    queryKey: ['purchase-order', poId],
    queryFn: () => getPurchaseOrderById(poId),
    select: res => res.data.data,
  })
  const po = query.data

  return (
    <Modal open onClose={onClose} title={po ? po.po_number : t('poNumber')} size="lg">
      <QueryErrorState error={query.error} onRetry={query.refetch} />
      {query.isLoading && <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-4 animate-pulse rounded bg-muted" />)}</div>}
      {po && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">{t('labelStatus')}</p><p className="font-medium text-foreground">{t(STATUS_LABEL[po.status])}</p></div>
            <div><p className="text-xs text-muted-foreground">{t('navSuppliers')}</p><p className="font-medium text-foreground">{po.supplier?.name || '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">{t('poOrderDate')}</p><p className="font-medium text-foreground">{formatAccDate(po.order_date)}</p></div>
            <div><p className="text-xs text-muted-foreground">{t('poTotalAmount')}</p><p className="font-semibold text-foreground">{formatCurrency(po.total_amount)}</p></div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th scope="col" className={thClass}>{t('labelItem')}</th>
                  <th scope="col" className={cn(thClass, 'text-right')}>{t('poReceivedQty')}</th>
                  <th scope="col" className={cn(thClass, 'text-right')}>{t('poPricePerUnit')}</th>
                  <th scope="col" className={cn(thClass, 'text-right')}>{t('labelSubtotalShort')}</th>
                </tr>
              </thead>
              <tbody>
                {po.items.map(item => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">{[item.name || item.raw_material_name, item.variant_name].filter(Boolean).join(' · ')}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatQuantity(item.quantity_received)} {item.unit_alias}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(item.unit_cost)}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(po.status !== 'cancelled' || (po.received_amount ?? 0) > 0) && <POPaymentSection po={po} />}
        </div>
      )}
    </Modal>
  )
}
