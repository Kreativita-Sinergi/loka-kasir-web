import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Form from '@/components/ui/Form'
import QueryErrorState from '@/components/ui/QueryErrorState'
import { Button } from '@/components/ui/button'
import { createConsignmentSettlement, getConsignmentUnsettled, type ConsignmentUnsettledItem } from '@/api/consignment'
import { formatCurrency, formatDateTime, getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { PeriodInputs } from './consignmentShared'
import { firstOfMonth, iso, qtyText } from './consignmentUtils'
import { CS_KEYS, invalidateConsignmentMoney } from './consignmentQueries'

/**
 * Pelunasan per barang terjual (POST /consignment/settlements) — cermin
 * `createDraft` di aplikasi: periode, baris penjualan yang dibayar kali ini,
 * dan pilihan langsung lunas. Yang tidak dicentang tetap "belum di-settle"
 * untuk pelunasan berikutnya.
 */
export default function SettlementFormModal({ consignor, onClose, onCreated }: {
  consignor: { id: string; name: string }
  onClose: () => void
  onCreated: (settlementId: string) => void
}) {
  const qc = useQueryClient()
  const [start, setStart] = useState(firstOfMonth)
  const [end, setEnd] = useState(() => iso(new Date()))
  // Disimpan sebagai "yang tidak dipilih" supaya bawaannya semua tercentang
  // tanpa perlu menyinkronkan state saat data datang.
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set())
  const [payNow, setPayNow] = useState(true)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [CS_KEYS.unsettled, consignor.id, start, end],
    queryFn: () => getConsignmentUnsettled({ supplier_id: consignor.id, start_date: start, end_date: end }),
    select: (res) => res.data.data as ConsignmentUnsettledItem[],
    enabled: !!start && !!end && start <= end,
  })
  const items = data ?? []
  const selected = items.filter((i) => !excluded.has(i.transaction_item_id))
  const total = selected.reduce((s, i) => s + i.amount, 0)
  const allSelected = items.length > 0 && selected.length === items.length

  const toggle = (id: string) => setExcluded((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const mut = useMutation({
    mutationFn: () => createConsignmentSettlement({
      supplier_id: consignor.id,
      start_date: start,
      end_date: end,
      // Semua tercentang = kosongkan daftar: server memakai semua yang belum di-settle.
      ...(allSelected ? {} : { transaction_item_ids: selected.map((i) => i.transaction_item_id) }),
      pay: payNow,
    }),
    onSuccess: (res) => {
      toast.success(res.data.data.paid ? t('csSettleCreatedPaid') : t('csSettleCreatedDraft'))
      invalidateConsignmentMoney(qc)
      onCreated(res.data.data.id)
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <Modal open onClose={onClose} title={t('csSettleTitle', { name: consignor.name })} size="lg">
      <Form onSubmit={(e) => { e.preventDefault(); if (selected.length) mut.mutate() }} className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('csSettleDesc')}</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PeriodInputs start={start} end={end} onStart={(v) => { setStart(v); setExcluded(new Set()) }} onEnd={(v) => { setEnd(v); setExcluded(new Set()) }} />
          {items.length > 0 && (
            <button type="button" className="text-sm font-medium text-primary hover:underline"
              onClick={() => setExcluded(allSelected ? new Set(items.map((i) => i.transaction_item_id)) : new Set())}>
              {allSelected ? t('csDeselectAll') : t('csSelectAll')}
            </button>
          )}
        </div>

        <QueryErrorState error={error} onRetry={refetch} />
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase">
              <tr>
                <th className="w-8 px-3 py-2" />
                <th className="px-3 py-2 text-left">{t('csProduct')}</th>
                <th className="px-3 py-2 text-left">{t('csColBill')}</th>
                <th className="px-3 py-2 text-right">{t('csSold')}</th>
                <th className="px-3 py-2 text-right">{t('csColDepositPrice')}</th>
                <th className="px-3 py-2 text-right">{t('csColAmount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">{error ? t('csSettleUnsettledLoadFailed') : t('csSettleUnsettledEmpty')}</td></tr>
              ) : items.map((i) => {
                const checked = !excluded.has(i.transaction_item_id)
                return (
                  <tr key={i.transaction_item_id} className={checked ? '' : 'opacity-60'}>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={checked} onChange={() => toggle(i.transaction_item_id)}
                        aria-label={`${i.product_name} · ${formatCurrency(i.amount)}`} disabled={mut.isPending} />
                    </td>
                    <td className="px-3 py-2 text-foreground">{i.product_name}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      <span className="font-mono text-xs">{i.bill_number ?? '—'}</span>
                      <span className="block text-xs">{formatDateTime(i.sold_at)}</span>
                    </td>
                    <td className="px-3 py-2 text-right">{qtyText(i.quantity)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(i.deposit_price)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatCurrency(i.amount)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="text-sm font-semibold text-foreground">{t('csSettleSelectedTotal', { n: selected.length, amount: formatCurrency(total) })}</p>

        <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer">
          <input type="checkbox" checked={payNow} onChange={(e) => setPayNow(e.target.checked)} className="mt-0.5" disabled={mut.isPending} />
          <span>
            <span className="block text-sm font-medium">{t('csSettlePayNow')}</span>
            <span className="block text-xs text-muted-foreground mt-0.5">{t('csSettlePayNowHint')}</span>
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={mut.isPending}>{t('actionCancel')}</Button>
          <Button type="submit" disabled={mut.isPending || selected.length === 0}>
            {mut.isPending ? t('saving') : t('csSettleSubmit')}
          </Button>
        </div>
      </Form>
    </Modal>
  )
}
