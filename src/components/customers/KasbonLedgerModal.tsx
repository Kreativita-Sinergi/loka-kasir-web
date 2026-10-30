import { useQuery } from '@tanstack/react-query'
import Modal from '@/components/ui/Modal'
import StatCard from '@/components/ui/StatCard'
import { DataTable } from '@/components/ui/Table'
import { getKasbonLedger, type KasbonLedgerEntry } from '@/api/moneyReports'
import { cn, formatCurrency, formatDate, formatDateTime, todayISODate } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react'

interface Props {
  customerId: string
  name: string
  /** Tanggal nota tertua yang belum lunas — awal rentang buku bon. */
  oldestAt?: string
  outletId?: string
  onClose: () => void
}

/** YYYY-MM-DD lokal dari stempel waktu ISO. */
function localDate(iso?: string): string | undefined {
  if (!iso) return undefined
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? undefined : todayISODate(d)
}

/**
 * Buku bon satu pelanggan: setiap bon dan setiap bayar, urut waktu, dengan
 * sisa utang berjalan — padanan tab Buku bon di aplikasi, yang dulu tidak ada
 * di dasbor. Rentangnya sejak nota tertua yang belum lunas sampai hari ini,
 * jadi sisa akhirnya sama dengan baris pelanggan di Umur Piutang.
 */
export default function KasbonLedgerModal({ customerId, name, oldestAt, outletId, onClose }: Props) {
  const start = localDate(oldestAt)
  const end = todayISODate()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['kasbon-ledger', customerId, start, end, outletId ?? null],
    queryFn: () => getKasbonLedger(customerId, { start_date: start, end_date: end, outlet_id: outletId }),
    select: res => res.data.data,
  })
  const entries = data?.entries ?? []

  const columns = [
    {
      key: 'at', label: t('labelTime'),
      render: (row: KasbonLedgerEntry) => <span className="text-xs text-foreground">{formatDateTime(row.at)}</span>,
    },
    {
      key: 'detail', label: t('cashAccColDetail'),
      render: (row: KasbonLedgerEntry) => row.type === 'bon'
        ? <span className="text-sm text-foreground">{t('ragLedgerBill', { bill: row.bill_number ?? '' })}</span>
        : (
          <div className="min-w-0">
            <p className="text-sm text-foreground">{[t('ragLedgerPayment'), row.payment_method].filter(Boolean).join(' · ')}</p>
            {(row.bill_numbers?.length || row.bill_number) && (
              <p className="text-xs text-muted-foreground">
                {t('ragLedgerPaymentFor', { bills: (row.bill_numbers?.length ? row.bill_numbers : [row.bill_number!]).map(b => `#${b}`).join(', ') })}
              </p>
            )}
          </div>
        ),
    },
    {
      key: 'bon', label: t('ragLedgerBon'), className: 'text-right',
      render: (row: KasbonLedgerEntry) => row.type === 'bon'
        ? <span className="tabular-nums font-medium text-orange-600 dark:text-orange-400">{formatCurrency(row.amount)}</span>
        : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'paid', label: t('ragLedgerPaid'), className: 'text-right',
      render: (row: KasbonLedgerEntry) => row.type === 'payment'
        ? <span className="tabular-nums font-medium text-green-600 dark:text-green-400">{formatCurrency(row.amount)}</span>
        : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'balance', label: t('ragLedgerClosing'), className: 'text-right',
      render: (row: KasbonLedgerEntry) => <span className={cn('tabular-nums text-foreground', row.balance > 0 && 'font-semibold')}>{formatCurrency(row.balance)}</span>,
    },
  ]

  return (
    <Modal open onClose={onClose} title={t('ragLedgerTitle', { name })} size="lg">
      <div className="space-y-4">
        {start && <p className="text-xs text-muted-foreground">{t('ragLedgerRange', { date: formatDate(oldestAt!) })}</p>}
        <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-3">
          <StatCard title={t('ragLedgerTotalBon')} value={formatCurrency(data?.total_bon ?? 0)} icon={<ArrowUpCircle size={18} />} color="orange" loading={isLoading} />
          <StatCard title={t('ragLedgerTotalPaid')} value={formatCurrency(data?.total_paid ?? 0)} icon={<ArrowDownCircle size={18} />} color="green" loading={isLoading} />
          <StatCard title={t('ragLedgerClosing')} value={formatCurrency(data?.closing_balance ?? 0)} icon={<Wallet size={18} />} color="red" emphasis loading={isLoading} />
        </div>
        <div className="rounded-xl border border-border">
          <DataTable columns={columns as never[]} data={entries as never[]} loading={isLoading}
            error={error} onRetry={refetch} emptyMessage={t('ragLedgerEmpty')} />
        </div>
      </div>
    </Modal>
  )
}
