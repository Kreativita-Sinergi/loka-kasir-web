import { AlertTriangle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import type { Shift } from '@/types'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface ShiftDetailModalProps {
  shift: Shift
  onClose: () => void
  onCorrectCash?: () => void
  notice?: string
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground shrink-0 w-40">{label}</span>
      <span className="text-sm text-foreground font-medium text-right">{value}</span>
    </div>
  )
}

export default function ShiftDetailModal({ shift, onClose, onCorrectCash, notice }: ShiftDetailModalProps) {
  const isClosed = shift.status === 'closed'
  // Older force-close responses expose this audit marker in notes rather than
  // a separate flag. A zero difference from these closures is not a cash count.
  const uncounted = shift.notes?.startsWith('Ditutup paksa oleh ') && shift.notes.includes('kas tidak dihitung fisik') && !shift.notes.includes('\nKoreksi kas penutup oleh ')
  const discrepancy = shift.discrepancy
  const hasDiscrepancy = discrepancy != null && Math.abs(discrepancy) > 0
  const amount = (value: number | null | undefined) => value == null ? '—' : formatCurrency(value)

  const discrepancyDisplay = uncounted ? t('shiftCashNotCounted') : discrepancy == null ? '—' : (
    <span className={`flex items-center gap-1 ${discrepancy >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} font-semibold`}>
      {hasDiscrepancy && <AlertTriangle size={14} />}
      {discrepancy >= 0 ? '+' : ''}
      {formatCurrency(discrepancy)}
    </span>
  )

  return (
    <Modal open onClose={onClose} title={t('shiftDetail')} size="md">
      {notice && <p role="status" className="text-sm text-muted-foreground mb-3">{notice}</p>}
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
            <InfoRow label={t('shiftOpeningCash')} value={amount(shift.opening_cash)} />
            <InfoRow label={t('shiftTotalSales')} value={amount(shift.total_sales)} />
            {shift.cash_amount != null && <InfoRow label={t('shiftPaidCash')} value={amount(shift.cash_amount)} />}
            {shift.qris_amount != null && <InfoRow label={t('shiftPaidQris')} value={amount(shift.qris_amount)} />}
            {shift.total_kasbon != null && <InfoRow label={t('shiftUnpaidDebt')} value={amount(shift.total_kasbon)} />}
            <InfoRow label={t('shiftRefunded')} value={amount(shift.total_refunds)} />
            <InfoRow label={t('shiftCashIn')} value={amount(shift.total_cash_in)} />
            {shift.total_settlement != null && <InfoRow label={t('shiftDebtSettlement')} value={amount(shift.total_settlement)} />}
            <InfoRow label={t('shiftCashOut')} value={amount(shift.total_cash_out)} />
            <InfoRow label={t('shiftExpectedCash')} value={amount(shift.expected_cash)} />
            <InfoRow label={t('shiftActualCash')} value={uncounted ? t('shiftCashNotCounted') : amount(shift.closing_cash)} />
            <InfoRow label={t('shiftCashDiff')} value={discrepancyDisplay} />
          </div>
        </div>
      )}
      {shift.notes && (
        <div className="mt-4 bg-muted rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-1">{t('labelNote')}</p>
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{shift.notes}</p>
        </div>
      )}
      {isClosed && onCorrectCash && (
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onCorrectCash} className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-xl hover:opacity-90">
            {t('shiftCorrectCash')}
          </button>
        </div>
      )}
    </Modal>
  )
}
