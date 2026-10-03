import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { PackageCheck } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { updatePreOrderStatus } from '@/api/transactions'
import type { Transaction } from '@/types'
import { usePermissions, PERMS } from '@/hooks/usePermissions'
import { getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'

/** Label dan warna status pre-order. */
export function PreOrderBadge({ tx }: { tx: Pick<Transaction, 'is_pre_order' | 'pre_order_status'> }) {
  if (!tx.is_pre_order) return null
  const [label, variant] =
    tx.pre_order_status === 'READY'
      ? [t('poStatusReady'), 'blue' as const]
      : tx.pre_order_status === 'PICKED_UP'
        ? [t('poStatusPickedUp'), 'gray' as const]
        : [t('poStatusWaiting'), 'yellow' as const]
  return <Badge variant={variant}>{`${t('poBadge')} · ${label}`}</Badge>
}

/**
 * Panel nota pre-order di detail transaksi: status, perkiraan siap, dan
 * tindakan Tandai siap / Serahkan barang. Pelunasan sisa tagihan dilakukan
 * di aplikasi kasir — di sanalah uangnya diterima.
 */
export default function PreOrderPanel({ tx }: { tx: Transaction }) {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const [busy, setBusy] = useState(false)

  if (!tx.is_pre_order) return null
  const closed = tx.is_canceled || tx.is_refunded
  const done = tx.pre_order_status === 'PICKED_UP'
  const paid = tx.payment_status === 'paid'
  const canAct = can(PERMS.POS_DO_PAYMENT) && !closed && !done
  const readyDate = tx.pre_order_ready_date
    ? new Date(`${tx.pre_order_ready_date}T00:00:00`).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  const run = async (status: 'READY' | 'PICKED_UP', success: string) => {
    if (busy) return
    if (status === 'PICKED_UP' && !window.confirm(t('poHandOverConfirm'))) return
    setBusy(true)
    try {
      await updatePreOrderStatus(tx.transaction_id, status)
      toast.success(success)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transaction', tx.transaction_id] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      ])
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border border-warning/40 bg-warning-subtle/40 rounded-xl p-3 space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold">
          <PackageCheck size={14} />
          {t('poFilter')}
        </span>
        <PreOrderBadge tx={tx} />
      </div>
      {readyDate && (
        <p className="text-xs text-muted-foreground">{t('poReadyOn', { date: readyDate })}</p>
      )}
      {canAct && (
        <div className="flex flex-wrap gap-2 pt-1">
          {tx.pre_order_status === 'WAITING' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run('READY', t('poMarkedReady'))}
              className="h-8 px-3 rounded-lg border border-border bg-card text-xs font-semibold hover:border-primary/50 disabled:opacity-60"
            >
              {t('poMarkReady')}
            </button>
          )}
          <button
            type="button"
            disabled={busy || !paid}
            onClick={() => run('PICKED_UP', t('poHandedOver'))}
            className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-60"
          >
            {t('poHandOver')}
          </button>
        </div>
      )}
      {canAct && !paid && (
        <p className="text-xs text-muted-foreground">{t('poNeedsPayment')}</p>
      )}
    </div>
  )
}
