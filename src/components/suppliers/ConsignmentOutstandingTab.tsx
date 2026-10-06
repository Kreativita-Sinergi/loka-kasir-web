import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { HandCoins, ClipboardList } from 'lucide-react'
import { DataTable } from '@/components/ui/Table'
import { ActionButton } from '@/components/ui/RowActions'
import { getConsignorOutstanding, type ConsignorBalance } from '@/api/consignment'
import { formatCurrency, formatDate } from '@/lib/utils'
import { t } from '@/lib/i18n'
import PayConsignorModal from './PayConsignorModal'
import SettlementFormModal from './SettlementFormModal'
import { CS_KEYS } from './consignmentQueries'

type Row = ConsignorBalance & { id: string }

/**
 * Tab "Tagihan": penitip yang MASIH HARUS DIBAYAR. Kewajiban adalah saldo
 * seluruh waktu (hak dari semua penjualan − uang yang sudah diserahkan), bukan
 * angka satu periode. Dari sini uang diserahkan (per nominal) atau pelunasan
 * per barang dibuat.
 */
export default function ConsignmentOutstandingTab({ consignorId, canWrite, onOpenSettlement }: {
  consignorId?: string
  canWrite: boolean
  onOpenSettlement: (id: string) => void
}) {
  const [showSettled, setShowSettled] = useState(false)
  const [pay, setPay] = useState<ConsignorBalance | null>(null)
  const [settle, setSettle] = useState<{ id: string; name: string } | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [CS_KEYS.outstanding, showSettled],
    queryFn: () => getConsignorOutstanding({ all: showSettled }),
    select: (res) => res.data.data as ConsignorBalance[],
  })
  const rows: Row[] = (data ?? [])
    .filter((b) => !consignorId || b.supplier_id === consignorId)
    .map((b) => ({ ...b, id: b.supplier_id }))
  const total = rows.reduce((s, b) => s + Math.max(b.outstanding, 0), 0)

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{t('csOutstandingTitle')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('csOutstandingDesc')}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showSettled} onChange={(e) => setShowSettled(e.target.checked)} />
          {t('csShowSettled')}
        </label>
      </div>
      <DataTable<Row>
        loading={isLoading}
        error={error}
        onRetry={refetch}
        emptyMessage={t('csOutstandingEmpty')}
        data={rows}
        columns={[
          {
            key: 'supplier_name', label: t('csConsignor'),
            render: (b) => (
              <div className="min-w-0">
                <p className="font-medium text-foreground">{b.supplier_name}</p>
                <p className="text-xs text-muted-foreground">
                  {b.last_paid_at ? t('csLastPaid', { date: formatDate(b.last_paid_at) }) : t('csNeverPaid')}
                  {b.phone && ` · ${b.phone}`}
                </p>
              </div>
            ),
          },
          { key: 'owed', label: t('csColOwed'), className: 'text-right', render: (b) => <span className="text-muted-foreground">{formatCurrency(b.owed)}</span> },
          { key: 'paid', label: t('csColPaid'), className: 'text-right', render: (b) => <span className="text-muted-foreground">{formatCurrency(b.paid)}</span> },
          {
            key: 'outstanding', label: t('csColOutstanding'), className: 'text-right',
            render: (b) => <span className={`font-semibold ${b.outstanding >= 1 ? 'text-warning' : 'text-success'}`}>{formatCurrency(Math.max(b.outstanding, 0))}</span>,
          },
          {
            key: 'actions', label: t('labelActions'), className: 'text-right',
            render: (b) => canWrite ? (
              <div className="flex flex-wrap justify-end gap-1">
                <ActionButton onClick={() => setSettle({ id: b.supplier_id, name: b.supplier_name })}>
                  <ClipboardList size={14} className="mr-1" /> {t('csActionSettle')}
                </ActionButton>
                <ActionButton variant="edit" disabled={b.outstanding < 1} onClick={() => setPay(b)}>
                  <HandCoins size={14} className="mr-1" /> {t('csActionPay')}
                </ActionButton>
              </div>
            ) : <span className="text-muted-foreground">—</span>,
          },
        ]}
      />
      {rows.length > 1 && (
        <p className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground border-t border-border">
          {t('csTotalOutstanding', { amount: formatCurrency(total) })}
        </p>
      )}
      {pay && <PayConsignorModal balance={pay} onClose={() => setPay(null)} onPaid={onOpenSettlement} />}
      {settle && <SettlementFormModal consignor={settle} onClose={() => setSettle(null)} onCreated={onOpenSettlement} />}
    </div>
  )
}
