import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { DataTable } from '@/components/ui/Table'
import { ActionButton } from '@/components/ui/RowActions'
import { getConsignmentSettlement, getConsignmentSettlements, type ConsignmentSettlement } from '@/api/consignment'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { PeriodInputs, SettlementStatusBadge } from './consignmentShared'
import { firstOfMonth, iso, isPaymentKind, kindLabel, settlementStatus } from './consignmentUtils'
import { CS_KEYS } from './consignmentQueries'

/**
 * Tab "Pelunasan": riwayat penyerahan uang dan settlement per barang pada
 * periode pilihan. Yang dibatalkan disembunyikan secara bawaan — tidak pernah
 * menjadi penyerahan uang dan hanya membuat riwayat sulit dibaca.
 */
export default function ConsignmentSettlementsTab({ consignorId, onOpenSettlement, onPrint }: {
  consignorId?: string
  onOpenSettlement: (id: string) => void
  onPrint: (s: ConsignmentSettlement) => void
}) {
  const [start, setStart] = useState(firstOfMonth)
  const [end, setEnd] = useState(() => iso(new Date()))
  const [showCanceled, setShowCanceled] = useState(false)
  const [printing, setPrinting] = useState<string | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [CS_KEYS.settlements, start, end],
    queryFn: () => getConsignmentSettlements({ start_date: start, end_date: end }),
    select: (res) => res.data.data as ConsignmentSettlement[],
    enabled: !!start && !!end && start <= end,
  })
  const rows = (data ?? [])
    .filter((s) => !consignorId || s.supplier_id === consignorId)
    .filter((s) => showCanceled || settlementStatus(s.status) !== 'CANCELED')

  // Daftar tidak membawa rincian barang; struk butuh rinciannya.
  const print = async (s: ConsignmentSettlement) => {
    setPrinting(s.id)
    try {
      const res = await getConsignmentSettlement(s.id)
      onPrint(res.data.data)
    } catch {
      onPrint(s)
    } finally {
      setPrinting(null)
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
        <p className="flex-1 min-w-0 text-sm font-semibold text-foreground">{t('csHistoryTitle')}</p>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showCanceled} onChange={(e) => setShowCanceled(e.target.checked)} />
          {t('csShowCanceled')}
        </label>
        <PeriodInputs start={start} end={end} onStart={setStart} onEnd={setEnd} />
      </div>
      <DataTable<ConsignmentSettlement>
        loading={isLoading}
        error={error}
        onRetry={refetch}
        emptyMessage={t('csHistoryEmpty')}
        data={rows}
        onRowClick={(s) => onOpenSettlement(s.id)}
        columns={[
          {
            key: 'consignor_name', label: t('csConsignor'),
            render: (s) => (
              <div className="min-w-0">
                <p className="font-medium text-foreground">{s.consignor_name}</p>
                <p className="text-xs text-muted-foreground">{kindLabel(s)}</p>
              </div>
            ),
          },
          {
            key: 'paid_at', label: t('labelDate'),
            render: (s) => <span className="text-muted-foreground">{s.paid_at ? formatDateTime(s.paid_at) : formatDate(s.end_date)}</span>,
          },
          {
            key: 'period', label: t('csPeriodSale'),
            render: (s) => <span className="text-muted-foreground">{isPaymentKind(s) ? '—' : `${formatDate(s.start_date)} – ${formatDate(s.end_date)}`}</span>,
          },
          { key: 'status', label: t('labelStatus'), render: (s) => <SettlementStatusBadge status={s.status} /> },
          { key: 'total', label: t('labelTotal'), className: 'text-right', render: (s) => <span className="font-semibold">{formatCurrency(s.total)}</span> },
          {
            key: 'actions', label: t('labelActions'), className: 'text-right',
            render: (s) => (
              <div className="flex justify-end gap-1">
                <ActionButton onClick={() => onOpenSettlement(s.id)}>{t('actionView')}</ActionButton>
                {settlementStatus(s.status) === 'PAID' && (
                  <ActionButton variant="edit" disabled={printing === s.id} onClick={() => { void print(s) }}>
                    <Printer size={14} className="mr-1" /> {t('actionPrint')}
                  </ActionButton>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
