import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer, RotateCcw } from 'lucide-react'
import { DataTable } from '@/components/ui/Table'
import { ActionButton } from '@/components/ui/RowActions'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/button'
import { getConsignmentReturns, type ConsignmentReturn } from '@/api/consignment'
import type { Supplier } from '@/types'
import { formatDateTime } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { PeriodInputs } from './consignmentShared'
import { firstOfMonth, iso } from './consignmentUtils'
import { CS_KEYS } from './consignmentQueries'
import ConsignmentReturnFormModal from './ConsignmentReturnFormModal'

/** Rincian satu retur: barang dan jumlahnya, catatan, dan bukti retur. */
function ReturnDetailModal({ r, onClose, onPrint }: { r: ConsignmentReturn; onClose: () => void; onPrint: (r: ConsignmentReturn) => void }) {
  return (
    <Modal open onClose={onClose} title={t('csReturnDetailTitle', { name: r.consignor_name })} size="sm">
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">{r.return_number} · {r.outlet_name} · {formatDateTime(r.created_at)}</p>
        {r.items.length === 0 ? (
          <p className="text-sm text-foreground">{t('csReturnItemsReturned', { n: r.total_quantity })}</p>
        ) : (
          <ul className="divide-y divide-border">
            {r.items.map((i, idx) => (
              <li key={idx} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-foreground">{i.variant_name ? `${i.product_name} (${i.variant_name})` : i.product_name}</span>
                <span className="font-bold text-foreground">{i.quantity}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">{t('csReturnTotalItems')}</span>
          <span className="font-bold text-foreground">{r.total_quantity}</span>
        </div>
        {r.notes?.trim() && <p className="text-xs text-muted-foreground">{t('csPrintNoteLine', { note: r.notes.trim() })}</p>}
        <div className="flex justify-end pt-1">
          <Button variant="outline" onClick={() => onPrint(r)}><Printer /> {t('csActionPrintReceipt')}</Button>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Tab "Retur": daftar retur barang ke penitip (GET /consignment-return) pada
 * periode pilihan, dengan rincian, bukti cetak, dan form buat retur.
 */
export default function ConsignmentReturnsTab({ consignorId, outlet, consignors, canWrite, onPrint }: {
  consignorId?: string
  outlet: { id: string; name: string } | null
  consignors: Supplier[]
  canWrite: boolean
  onPrint: (r: ConsignmentReturn) => void
}) {
  const [start, setStart] = useState(firstOfMonth)
  const [end, setEnd] = useState(() => iso(new Date()))
  const [detailId, setDetailId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [CS_KEYS.returns, start, end, outlet?.id],
    queryFn: () => getConsignmentReturns({ start_date: start, end_date: end, outlet_id: outlet?.id || undefined }),
    select: (res) => res.data.data as ConsignmentReturn[],
    enabled: !!start && !!end && start <= end,
  })
  const rows = (data ?? []).filter((r) => !consignorId || r.consignor_id === consignorId)
  const detail = detailId ? (data ?? []).find((r) => r.id === detailId) ?? null : null

  // Retur yang baru dibuat hari ini harus langsung terlihat — geser akhir
  // periode ke hari ini bila pengguna sedang melihat masa lalu.
  const onCreated = (id: string) => {
    const today = iso(new Date())
    if (end < today) setEnd(today)
    setDetailId(id)
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
        <p className="flex-1 min-w-0 text-sm font-semibold text-foreground">{t('csTabReturns')}</p>
        <PeriodInputs start={start} end={end} onStart={setStart} onEnd={setEnd} />
        {canWrite && (
          <Button size="sm" onClick={() => setFormOpen(true)} disabled={consignors.length === 0} title={consignors.length === 0 ? t('csReturnNeedConsignor') : undefined}>
            <RotateCcw /> {t('csCreateReturn')}
          </Button>
        )}
      </div>
      <DataTable<ConsignmentReturn>
        loading={isLoading}
        error={error}
        onRetry={refetch}
        data={rows}
        onRowClick={(r) => setDetailId(r.id)}
        emptySlot={<EmptyState icon={<RotateCcw size={26} />} title={t('csReturnsEmptyTitle')} description={t('csReturnsEmptyBody')} />}
        columns={[
          {
            key: 'consignor_name', label: t('csConsignor'),
            render: (r) => (
              <div className="min-w-0">
                <p className="font-medium text-foreground">{r.consignor_name}</p>
                <p className="font-mono text-xs text-muted-foreground">{r.return_number}</p>
              </div>
            ),
          },
          { key: 'created_at', label: t('labelDate'), render: (r) => <span className="text-muted-foreground">{formatDateTime(r.created_at)}</span> },
          { key: 'outlet_name', label: t('labelOutlet'), render: (r) => <span className="text-muted-foreground">{r.outlet_name}</span> },
          {
            key: 'total_quantity', label: t('csColItems'), className: 'text-right',
            render: (r) => (
              <div className="text-right">
                <p className="font-semibold text-foreground">{t('csItemsN', { n: r.total_quantity })}</p>
                {r.items.length > 0 && <p className="max-w-56 truncate text-xs text-muted-foreground" title={r.items.map((i) => i.product_name).join(', ')}>{r.items.map((i) => i.product_name).join(', ')}</p>}
              </div>
            ),
          },
          {
            key: 'actions', label: t('labelActions'), className: 'text-right',
            render: (r) => (
              <div className="flex justify-end gap-1">
                <ActionButton onClick={() => setDetailId(r.id)}>{t('actionView')}</ActionButton>
                <ActionButton variant="edit" onClick={() => onPrint(r)}><Printer size={14} className="mr-1" /> {t('actionPrint')}</ActionButton>
              </div>
            ),
          },
        ]}
      />
      {detail && <ReturnDetailModal r={detail} onClose={() => setDetailId(null)} onPrint={onPrint} />}
      {formOpen && (
        <ConsignmentReturnFormModal outlet={outlet} consignors={consignors} initialConsignorId={consignorId}
          onClose={() => setFormOpen(false)} onCreated={onCreated} />
      )}
    </div>
  )
}
