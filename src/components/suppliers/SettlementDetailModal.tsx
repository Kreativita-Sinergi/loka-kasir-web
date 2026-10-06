import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Printer } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import QueryErrorState from '@/components/ui/QueryErrorState'
import { Button } from '@/components/ui/button'
import {
  cancelConsignmentSettlement,
  getConsignmentSettlement,
  payConsignmentSettlement,
  type ConsignmentSettlement,
} from '@/api/consignment'
import { formatCurrency, formatDateTime, formatDate, getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { SettlementStatusBadge } from './consignmentShared'
import { isPaymentKind, qtyText, settlementStatus } from './consignmentUtils'
import { invalidateConsignmentMoney } from './consignmentQueries'

function SummaryLine({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-0.5 text-sm ${strong ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
      <span>{label}</span><span>{formatCurrency(value)}</span>
    </div>
  )
}

/** Dialog konfirmasi kecil untuk aksi yang tidak bisa dibatalkan. */
function ConfirmModal({ title, body, confirmLabel, destructive, pending, onConfirm, onClose }: {
  title: string; body: string; confirmLabel: string; destructive?: boolean; pending: boolean
  onConfirm: () => void; onClose: () => void
}) {
  return (
    <Modal open onClose={onClose} title={title} size="sm">
      <p className="text-sm text-foreground">{body}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={pending}>{t('actionCancel')}</Button>
        <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} disabled={pending}>{pending ? t('saving') : confirmLabel}</Button>
      </div>
    </Modal>
  )
}

/**
 * Rincian satu pelunasan: angka utama, kewajiban sebelum/sisa (penyerahan
 * uang) atau omzet/laba toko (per barang), baris barang, dan aksinya —
 * cetak bukti bila lunas; tandai lunas / batalkan bila masih draft.
 */
export default function SettlementDetailModal({ id, canWrite, onClose, onPrint }: {
  id: string
  canWrite: boolean
  onClose: () => void
  onPrint: (s: ConsignmentSettlement) => void
}) {
  const qc = useQueryClient()
  const [confirm, setConfirm] = useState<'pay' | 'cancel' | null>(null)
  const { data: s, isLoading, error, refetch } = useQuery({
    queryKey: ['consignment-settlement', id],
    queryFn: () => getConsignmentSettlement(id),
    select: (res) => res.data.data as ConsignmentSettlement,
  })

  const mut = useMutation({
    mutationFn: (action: 'pay' | 'cancel') => (action === 'pay' ? payConsignmentSettlement(id) : cancelConsignmentSettlement(id)),
    onSuccess: (_res, action) => {
      toast.success(action === 'pay' ? t('csMarkedPaid') : t('csCanceled'))
      invalidateConsignmentMoney(qc)
      setConfirm(null)
      if (action === 'cancel') onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const payment = s ? isPaymentKind(s) : false
  const status = settlementStatus(s?.status)
  const when = s?.paid_at ?? s?.end_date
  const title = s ? (payment ? t('csDetailPaymentTitle', { name: s.consignor_name }) : t('csDetailSettlementTitle', { name: s.consignor_name })) : t('csTabSettlements')

  return (
    <>
      <Modal open onClose={onClose} title={title} size="md">
        <QueryErrorState error={error} onRetry={refetch} />
        {error && !s && <p className="text-sm text-muted-foreground">{t('csDetailLoadFailed')}</p>}
        {isLoading && <div className="h-24 animate-pulse rounded-xl bg-muted" />}
        {s && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{when ? formatDateTime(s.paid_at ?? `${s.end_date}T00:00:00`) : '—'}{!payment && ` · ${t('csPeriodSale')}: ${formatDate(s.start_date)} – ${formatDate(s.end_date)}`}</span>
              <SettlementStatusBadge status={s.status} />
            </div>
            <div className="rounded-xl bg-muted p-4">
              <p className="text-xs text-muted-foreground">{payment ? t('csAmountHanded') : t('csTotalConsignor')}</p>
              <p className="mt-0.5 text-2xl font-bold text-primary tabular-nums">{formatCurrency(s.total)}</p>
            </div>
            <div>
              {payment ? (
                <>
                  {s.balance_before != null && <SummaryLine label={t('csBalanceBefore')} value={s.balance_before} />}
                  {s.balance_after != null && <SummaryLine label={t('csBalanceAfter')} value={s.balance_after} strong />}
                </>
              ) : s.revenue != null && (
                <>
                  <SummaryLine label={t('csStoreRevenue')} value={s.revenue} />
                  <SummaryLine label={t('csProfit')} value={s.profit ?? 0} strong />
                </>
              )}
              {s.note?.trim() && <p className="mt-1 text-xs text-muted-foreground">{t('csPrintNoteLine', { note: s.note.trim() })}</p>}
            </div>
            {(s.items?.length ?? 0) > 0 && (
              <ul className="divide-y divide-border border-t border-border">
                {s.items!.map((line, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-foreground">{line.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {line.type === 'REFUND' && `${t('csRefundTag')} · `}{qtyText(line.quantity)} × {formatCurrency(line.deposit_price)}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-foreground">{formatCurrency(line.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              {status === 'PAID' && (
                <Button variant="outline" onClick={() => onPrint(s)}><Printer /> {t('csActionPrintReceipt')}</Button>
              )}
              {status === 'DRAFT' && canWrite && (
                <>
                  <Button variant="outline" onClick={() => setConfirm('cancel')} disabled={mut.isPending}>{t('csActionCancelSettlement')}</Button>
                  <Button onClick={() => setConfirm('pay')} disabled={mut.isPending}>{t('csActionMarkPaid')}</Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
      {s && confirm === 'pay' && (
        <ConfirmModal title={t('csConfirmMarkPaidTitle')} body={t('csConfirmMarkPaid', { name: s.consignor_name, amount: formatCurrency(s.total) })}
          confirmLabel={t('csActionMarkPaid')} pending={mut.isPending} onConfirm={() => mut.mutate('pay')} onClose={() => setConfirm(null)} />
      )}
      {s && confirm === 'cancel' && (
        <ConfirmModal title={t('csConfirmCancelTitle')} body={t('csConfirmCancel', { name: s.consignor_name })}
          confirmLabel={t('csActionCancelSettlement')} destructive pending={mut.isPending} onConfirm={() => mut.mutate('cancel')} onClose={() => setConfirm(null)} />
      )}
    </>
  )
}
