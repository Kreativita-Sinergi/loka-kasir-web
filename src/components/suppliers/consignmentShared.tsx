import Badge, { type BadgeVariant } from '@/components/ui/Badge'
import type { ConsignmentSettlementStatus } from '@/api/consignment'
import { t } from '@/lib/i18n'
import { settlementStatus } from './consignmentUtils'

// Komponen kecil yang dipakai bersama oleh semua tab konsinyasi supaya cara
// memilih periode dan membaca status sama di mana pun. Fungsi murninya ada di
// consignmentUtils.ts (dipisah agar fast refresh tetap bekerja).

export function PeriodInputs({ start, end, onStart, onEnd }: {
  start: string; end: string; onStart: (v: string) => void; onEnd: (v: string) => void
}) {
  const cls = 'py-1.5 px-2 text-sm border border-border rounded-xl bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500'
  return (
    <div className="flex items-center gap-1.5">
      <input type="date" value={start} max={end} onChange={(e) => onStart(e.target.value)} className={cls} aria-label={t('csFrom')} />
      <span className="text-muted-foreground text-xs">—</span>
      <input type="date" value={end} min={start} onChange={(e) => onEnd(e.target.value)} className={cls} aria-label={t('csTo')} />
    </div>
  )
}

export function SettlementStatusBadge({ status }: { status: string | undefined }) {
  const s = settlementStatus(status)
  const map: Record<ConsignmentSettlementStatus, { variant: BadgeVariant; label: string }> = {
    PAID: { variant: 'green', label: t('csStatusPaid') },
    CANCELED: { variant: 'red', label: t('csStatusCanceled') },
    DRAFT: { variant: 'yellow', label: t('csStatusDraft') },
  }
  return <Badge variant={map[s].variant}>{map[s].label}</Badge>
}
