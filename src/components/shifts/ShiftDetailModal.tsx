import { AlertTriangle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import type { Shift } from '@/types'
import { formatCurrency, formatDateTime } from '@/lib/utils'

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
    <Modal open onClose={onClose} title="Detail Shift" size="md">
      {/* Section A — Ringkasan Shift */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ringkasan Shift</p>
        <div className="bg-muted rounded-xl px-4 py-1">
          <InfoRow label="Kasir" value={shift.cashier?.name ?? '-'} />
          <InfoRow label="Terminal" value={shift.terminal?.name ?? '-'} />
          <InfoRow label="Outlet" value={shift.outlet?.name ?? '-'} />
          <InfoRow label="Waktu Buka" value={formatDateTime(shift.opened_at)} />
          <InfoRow
            label="Waktu Tutup"
            value={shift.closed_at ? formatDateTime(shift.closed_at) : 'Sedang Berjalan'}
          />
          <InfoRow
            label="Status"
            value={
              <Badge variant={shift.status === 'open' ? 'green' : 'gray'}>
                {shift.status === 'open' ? 'Buka' : 'Tutup'}
              </Badge>
            }
          />
        </div>
      </div>

      {/* Section B — Rekap Kas (only when closed) */}
      {isClosed && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Rekap Kas</p>
          <div className="bg-muted rounded-xl px-4 py-1">
            <InfoRow label="Kas Awal" value={formatCurrency(shift.opening_cash ?? 0)} />
            <InfoRow label="Total Penjualan" value={formatCurrency(shift.total_sales ?? 0)} />
            <InfoRow label="Total Refund" value={formatCurrency(shift.total_refunds ?? 0)} />
            <InfoRow label="Kas Masuk (titip)" value={formatCurrency(shift.total_cash_in ?? 0)} />
            <InfoRow label="Kas Keluar" value={formatCurrency(shift.total_cash_out ?? 0)} />
            <InfoRow label="Kas yang Diharapkan" value={formatCurrency(shift.expected_cash ?? 0)} />
            <InfoRow label="Kas Aktual" value={formatCurrency(shift.closing_cash ?? 0)} />
            <InfoRow label="Selisih Kas" value={discrepancyDisplay} />
          </div>
        </div>
      )}
    </Modal>
  )
}
