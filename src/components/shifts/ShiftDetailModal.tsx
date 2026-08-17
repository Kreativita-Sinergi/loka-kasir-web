import { AlertTriangle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import type { Shift } from '@/types'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface ShiftDetailModalProps {
  shift: Shift
  onClose: () => void
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground shrink-0 w-40">{label}</span>
      <span className="text-sm text-foreground font-medium text-right">{value}</span>
    </div>
  )
}

export default function ShiftDetailModal({ shift, onClose }: ShiftDetailModalProps) {
  const isClosed = shift.status === 'closed' || shift.closing_cash != null
  const discrepancy = shift.discrepancy ?? 0
  const hasDiscrepancy = Math.abs(discrepancy) > 0

  const discrepancyDisplay = (
    <span className={`flex items-center gap-1 ${discrepancy >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} font-semibold`}>
      {hasDiscrepancy && <AlertTriangle size={14} />}
      {discrepancy >= 0 ? '+' : ''}
      {formatCurrency(discrepancy)}
    </span>
  )

  return (
    <Modal open onClose={onClose} title={t('shiftDetail')} size="md">
      {/* Section A — Ringkasan Shift */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t('shiftSummary')}</p>
        <div className="bg-muted rounded-xl px-4 py-1">
          <InfoRow label={t('labelCashier')} value={shift.cashier?.name ?? '-'} />
          <InfoRow label={t('labelDevice')} value={shift.terminal?.name ?? '-'} />
          <InfoRow label={t('labelOutlet')} value={shift.outlet?.name ?? '-'} />
          <InfoRow label={t('shiftOpenedAt')} value={formatDateTime(shift.opened_at)} />
          <InfoRow
            label={t('shiftClosedAt')}
            value={shift.closed_at ? formatDateTime(shift.closed_at) : t('shiftOngoing')}
          />
          <InfoRow
            label={t('labelStatus')}
            value={
              <Badge variant={shift.status === 'open' ? 'green' : 'gray'}>
                {shift.status === 'open' ? t('shiftOpen') : t('shiftClosed')}
              </Badge>
            }
          />
        </div>
      </div>

      {/* Section B — Rekap Kas (only when closed) */}
      {isClosed && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t('shiftCashRecap')}</p>
          <div className="bg-muted rounded-xl px-4 py-1">
            <InfoRow label={t('shiftOpeningCash')} value={formatCurrency(shift.opening_cash ?? 0)} />
            <InfoRow label={t('shiftTotalSales')} value={formatCurrency(shift.total_sales ?? 0)} />
            <InfoRow label={t('shiftRefunded')} value={formatCurrency(shift.total_refunds ?? 0)} />
            <InfoRow label={t('shiftCashIn')} value={formatCurrency(shift.total_cash_in ?? 0)} />
            <InfoRow label={t('shiftCashOut')} value={formatCurrency(shift.total_cash_out ?? 0)} />
            <InfoRow label={t('shiftExpectedCash')} value={formatCurrency(shift.expected_cash ?? 0)} />
            <InfoRow label={t('shiftActualCash')} value={formatCurrency(shift.closing_cash ?? 0)} />
            <InfoRow label={t('shiftCashDiff')} value={discrepancyDisplay} />
          </div>
        </div>
      )}
    </Modal>
  )
}
