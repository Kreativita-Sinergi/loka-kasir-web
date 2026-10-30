import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Badge from '@/components/ui/Badge'
import { ActionButton } from '@/components/ui/RowActions'
import VoidReasonModal from '@/components/finance/VoidReasonModal'
import { getShiftCashFlows, voidShiftCashFlow } from '@/api/cashAccounts'
import type { ShiftCashFlow } from '@/api/cashAccounts'
import { PERMS, usePermissions } from '@/hooks/usePermissions'
import { cn, formatCurrency, formatDateTime, getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'

/** Kueri yang angkanya ikut berubah saat kas masuk/keluar shift dibatalkan. */
const AFFECTED_QUERIES = ['shift-cash-flows', 'shift-detail', 'shifts', 'shifts-financial', 'cash-discrepancy', 'dashboard-open-shifts', 'cash-accounts', 'cash-ledger']

function accountLine(flow: ShiftCashFlow): string | null {
  if (!flow.cash_account_name) return null
  return t(flow.type === 'OUT' ? 'shiftCashFlowDepositTo' : 'shiftCashFlowTakeFrom', { name: flow.cash_account_name })
}

function sourceLabel(flow: ShiftCashFlow): string | null {
  if (flow.source === 'settlement') return t('shiftCashFlowSourceSettlement')
  if (flow.source === 'deposit') return t('shiftCashFlowSourceDeposit')
  return null
}

/**
 * Daftar kas masuk/keluar satu shift beserta "Batalkan" — jalan untuk
 * membetulkan pengeluaran yang terinput dua kali. Baris tidak pernah hilang:
 * yang dibatalkan tampil dicoret dengan alasannya.
 */
export default function ShiftCashFlows({ shiftId }: { shiftId: string }) {
  const qc = useQueryClient()
  const { canAny } = usePermissions()
  const allowed = canAny(PERMS.POS_OPEN_SHIFT, PERMS.REPORTS_FINANCIAL, PERMS.REPORTS_SHIFT)
  const [target, setTarget] = useState<ShiftCashFlow | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shift-cash-flows', shiftId],
    queryFn: () => getShiftCashFlows(shiftId),
    enabled: allowed,
  })
  const flows: ShiftCashFlow[] = data?.data?.data ?? []

  const voidMut = useMutation({
    mutationFn: ({ flowId, reason }: { flowId: string; reason: string }) => voidShiftCashFlow(shiftId, flowId, reason),
    onSuccess: () => {
      toast.success(t('cashAccVoidDone'))
      setTarget(null)
      for (const key of AFFECTED_QUERIES) qc.invalidateQueries({ queryKey: [key] })
    },
    onError: err => toast.error(getErrorMessage(err)),
  })

  if (!allowed) return null

  return (
    <div className="mt-5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t('shiftCashFlowsTitle')}</p>
      <div className="bg-muted rounded-xl px-4 py-1">
        {isLoading ? (
          <div className="py-3 space-y-2">
            {[0, 1].map(index => <div key={index} className="h-4 animate-pulse rounded bg-foreground/8" />)}
          </div>
        ) : isError ? (
          <p className="py-2.5 text-sm text-muted-foreground">{t('shiftCashFlowsLoadFailed')}</p>
        ) : flows.length === 0 ? (
          <p className="py-2.5 text-sm text-muted-foreground">{t('shiftCashFlowsEmpty')}</p>
        ) : flows.map(flow => {
          const struck = flow.voided && 'line-through text-muted-foreground'
          const meta = [flow.created_by_name, formatDateTime(flow.created_at)].filter(Boolean).join(' · ')
          const extra = [sourceLabel(flow), accountLine(flow)].filter(Boolean).join(' · ')
          return (
            <div key={flow.id} data-testid="shift-cash-flow" className="flex items-start justify-between gap-3 py-2.5 border-b border-border last:border-0">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={flow.type === 'IN' ? 'green' : 'yellow'}>{t(flow.type === 'IN' ? 'cashAccIn' : 'cashAccOut')}</Badge>
                  <span className={cn('text-sm font-medium text-foreground break-words', struck)}>{flow.description || '—'}</span>
                </div>
                <p className={cn('text-xs text-muted-foreground', struck)}>{meta}</p>
                {extra && <p className={cn('text-xs text-muted-foreground', struck)}>{extra}</p>}
                {flow.voided && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <Badge variant="red">{t('cashAccVoided')}</Badge>
                    {flow.void_reason && <span className="text-xs text-muted-foreground">{t('cashAccVoidedReason', { reason: flow.void_reason })}</span>}
                    {flow.voided_by_name && <span className="text-xs text-muted-foreground">· {t('cashAccVoidedBy', { name: flow.voided_by_name })}</span>}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={cn('text-sm font-semibold tabular-nums', flow.type === 'IN' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400', struck)}>
                  {flow.type === 'IN' ? '+' : '−'}{formatCurrency(flow.amount)}
                </span>
                {flow.voidable && !flow.voided && (
                  <ActionButton variant="delete" onClick={() => setTarget(flow)}>{t('cashAccVoidAction')}</ActionButton>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {target && (
        <VoidReasonModal open onClose={() => setTarget(null)} pending={voidMut.isPending}
          hint={target.cash_account_name ? `${t('shiftCashFlowVoidHint')} ${t('shiftCashFlowLinkedHint', { name: target.cash_account_name })}` : t('shiftCashFlowVoidHint')}
          onConfirm={reason => voidMut.mutate({ flowId: target.id, reason })}
          summary={(
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{target.description || '—'}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(target.created_at)}</p>
              </div>
              <span className="font-semibold tabular-nums whitespace-nowrap">{target.type === 'IN' ? '+' : '−'}{formatCurrency(target.amount)}</span>
            </div>
          )} />
      )}
    </div>
  )
}
