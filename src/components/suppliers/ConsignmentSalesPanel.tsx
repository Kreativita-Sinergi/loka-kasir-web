import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, PackageCheck, ChevronRight } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { getConsignmentSales, type ConsignmentSales } from '@/api/suppliers'
import { formatCurrency } from '@/lib/utils'
import { exportToCSV, csvFilename } from '@/lib/exportUtils'
import { t } from '@/lib/i18n'
import { PeriodInputs } from './consignmentShared'
import { firstOfMonth, iso, qtyText } from './consignmentUtils'

/**
 * Barang titipan yang terjual per penitip.
 *
 * Kriterianya sama persis dengan settlement (nota lunas, bukan refund/batal),
 * jadi "belum di-settle" di sini adalah angka yang akan muncul saat settlement
 * periode yang sama dibuat. Klik penitip untuk rincian per produk.
 */
export default function ConsignmentSalesPanel({ outletId }: { outletId?: string }) {
  const [start, setStart] = useState(firstOfMonth)
  const [end, setEnd] = useState(() => iso(new Date()))
  const [detail, setDetail] = useState<{ id: string; name: string } | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['consignment-sales', start, end, outletId],
    queryFn: () => getConsignmentSales({ start_date: start, end_date: end, outlet_id: outletId || undefined }),
    select: (res) => res.data.data as ConsignmentSales,
    enabled: !!start && !!end,
  })
  const rows = data?.suppliers ?? []

  const handleExport = () =>
    exportToCSV(
      rows.map((r) => ({
        [t('csConsignor')]: r.supplier_name,
        [t('csProductCount')]: r.product_count,
        [t('csSold')]: r.quantity,
        [t('csRevenue')]: r.revenue,
        [t('csOwed')]: r.owed,
        [t('csProfit')]: r.profit,
        [t('csUnsettled')]: r.unsettled,
      })),
      csvFilename('penjualan-titipan'),
    )

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2"><PackageCheck size={16} /> {t('csTitle')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('csDesc')}</p>
        </div>
        <PeriodInputs start={start} end={end} onStart={setStart} onEnd={setEnd} />
        <button
          onClick={handleExport}
          disabled={!rows.length}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted disabled:opacity-40 transition"
        >
          <Download size={14} /> {t('exportCsv')}
        </button>
      </div>

      {isError && <p className="px-4 py-3 text-sm text-destructive">{t('csLoadFailed')}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted text-muted-foreground text-xs uppercase">
            <tr>
              <th className="px-4 py-2.5 text-left">{t('csConsignor')}</th>
              <th className="px-4 py-2.5 text-right">{t('csSold')}</th>
              <th className="px-4 py-2.5 text-right">{t('csRevenue')}</th>
              <th className="px-4 py-2.5 text-right">{t('csOwed')}</th>
              <th className="px-4 py-2.5 text-right">{t('csProfit')}</th>
              <th className="px-4 py-2.5 text-right">{t('csUnsettled')}</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="animate-pulse"><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-muted rounded" /></td></tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">{t('csEmpty')}</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.supplier_id} onClick={() => setDetail({ id: r.supplier_id, name: r.supplier_name })} className="hover:bg-muted transition-colors cursor-pointer">
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {r.supplier_name}
                    <span className="block text-xs text-muted-foreground font-normal">{t('csProductsN', { n: r.product_count })}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-foreground">{qtyText(r.quantity)}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{formatCurrency(r.revenue)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-foreground">{formatCurrency(r.owed)}</td>
                  <td className="px-4 py-2.5 text-right text-green-600 dark:text-green-400">{formatCurrency(r.profit)}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${r.unsettled > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                    {formatCurrency(r.unsettled)}
                  </td>
                  <td className="px-4 py-2.5 text-right"><ChevronRight size={14} className="inline text-muted-foreground" /></td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 1 && data && (
            <tfoot className="border-t border-border font-semibold">
              <tr>
                <td className="px-4 py-2.5">{t('labelTotal')}</td>
                <td className="px-4 py-2.5 text-right">{qtyText(data.total.quantity)}</td>
                <td className="px-4 py-2.5 text-right">{formatCurrency(data.total.revenue)}</td>
                <td className="px-4 py-2.5 text-right">{formatCurrency(data.total.owed)}</td>
                <td className="px-4 py-2.5 text-right">{formatCurrency(data.total.profit)}</td>
                <td className="px-4 py-2.5 text-right">{formatCurrency(data.total.unsettled)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="px-4 py-2.5 text-xs text-muted-foreground">{t('csNote')}</p>

      {detail && (
        <ConsignmentSalesModal
          supplierId={detail.id}
          supplierName={detail.name}
          outletId={outletId}
          initialStart={start}
          initialEnd={end}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}

/** Rincian barang terjual satu penitip, per produk. */
export function ConsignmentSalesModal({ supplierId, supplierName, outletId, initialStart, initialEnd, onClose }: {
  supplierId: string
  supplierName: string
  outletId?: string
  initialStart?: string
  initialEnd?: string
  onClose: () => void
}) {
  const [start, setStart] = useState(initialStart ?? firstOfMonth())
  const [end, setEnd] = useState(initialEnd ?? iso(new Date()))
  const { data, isLoading } = useQuery({
    queryKey: ['consignment-sales', start, end, outletId, supplierId],
    queryFn: () => getConsignmentSales({ start_date: start, end_date: end, supplier_id: supplierId, outlet_id: outletId || undefined }),
    select: (res) => res.data.data as ConsignmentSales,
  })
  const products = data?.products ?? []
  const total = data?.suppliers[0]

  return (
    <Modal open onClose={onClose} title={t('csDetailTitle', { name: supplierName })} size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PeriodInputs start={start} end={end} onStart={setStart} onEnd={setEnd} />
          <button
            onClick={() => exportToCSV(products.map((p) => ({
              [t('csProduct')]: p.product_name, [t('csSold')]: p.quantity, [t('csRevenue')]: p.revenue,
              [t('csOwed')]: p.owed, [t('csProfit')]: p.profit, [t('csUnsettled')]: p.unsettled,
            })), csvFilename(`titipan-${supplierName}`))}
            disabled={!products.length}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted disabled:opacity-40 transition"
          >
            <Download size={14} /> {t('exportCsv')}
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">{t('csProduct')}</th>
                <th className="px-3 py-2 text-right">{t('csSold')}</th>
                <th className="px-3 py-2 text-right">{t('csRevenue')}</th>
                <th className="px-3 py-2 text-right">{t('csOwed')}</th>
                <th className="px-3 py-2 text-right">{t('csProfit')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">…</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">{t('csEmptySupplier')}</td></tr>
              ) : products.map((p) => (
                <tr key={p.product_id}>
                  <td className="px-3 py-2 text-foreground">{p.product_name}</td>
                  <td className="px-3 py-2 text-right">{qtyText(p.quantity)}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(p.revenue)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{formatCurrency(p.owed)}</td>
                  <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">{formatCurrency(p.profit)}</td>
                </tr>
              ))}
            </tbody>
            {total && (
              <tfoot className="border-t border-border font-semibold">
                <tr>
                  <td className="px-3 py-2">{t('labelTotal')}</td>
                  <td className="px-3 py-2 text-right">{qtyText(total.quantity)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(total.revenue)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(total.owed)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(total.profit)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {total && (
          <p className={`text-sm font-semibold ${total.unsettled > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
            {t('csUnsettledLine', { amount: formatCurrency(total.unsettled) })}
          </p>
        )}
      </div>
    </Modal>
  )
}
