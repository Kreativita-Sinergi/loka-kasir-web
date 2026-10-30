import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarCheck, CalendarX, Download, Info, Wallet } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { DataTable } from '@/components/ui/Table'
import KasbonLedgerModal from '@/components/customers/KasbonLedgerModal'
import { AGING_BUCKETS, agingBucketOf, getReceivableAging, type AgingBucket, type AgingCustomer } from '@/api/moneyReports'
import { useOutletStore } from '@/store/outletStore'
import { csvFilename, exportToCSV } from '@/lib/exportUtils'
import { formatCurrency, formatDate, todayISODate, toTitleCase } from '@/lib/utils'
import { formatQuantity } from '@/lib/money'
import { t } from '@/lib/i18n'
import type { MessageKey } from '@/lib/messages'

const BUCKET_LABEL: Record<AgingBucket, MessageKey> = {
  current: 'ragBucketCurrent',
  days_1_30: 'ragBucket1to30',
  days_31_60: 'ragBucket31to60',
  days_61_90: 'ragBucket61to90',
  over_90: 'ragBucketOver90',
}

const BUCKET_COLOR: Record<AgingBucket, 'green' | 'orange' | 'red'> = {
  current: 'green',
  days_1_30: 'orange',
  days_31_60: 'orange',
  days_61_90: 'red',
  over_90: 'red',
}

const BUCKET_BADGE: Record<AgingBucket, 'green' | 'yellow' | 'red'> = {
  current: 'green',
  days_1_30: 'yellow',
  days_31_60: 'yellow',
  days_61_90: 'red',
  over_90: 'red',
}

const customerName = (c: AgingCustomer) => (c.name ? toTitleCase(c.name) : t('ragNoCustomer'))

/**
 * Umur Piutang — sisa kasbon setiap pelanggan dikelompokkan menurut lamanya
 * lewat jatuh tempo (belum jatuh tempo, 1–30, 31–60, 61–90, >90 hari).
 *
 * Daftar Kasbon menjawab "nota mana yang belum lunas"; halaman ini menjawab
 * "bon siapa yang sudah terlalu lama dibiarkan". Yang paling lama menunggak
 * di atas; klik baris membuka buku bon pelanggan itu.
 */
export default function ReceivableAgingPage() {
  const { selected: selectedOutlet } = useOutletStore()
  const outletId = selectedOutlet?.id
  const [search, setSearch] = useState('')
  const [ledgerOf, setLedgerOf] = useState<AgingCustomer | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['receivable-aging', outletId ?? null],
    queryFn: () => getReceivableAging({ outlet_id: outletId || undefined }),
    select: res => res.data.data,
  })

  const rows = useMemo(() => {
    const all = data?.customers ?? []
    const q = search.trim().toLowerCase()
    if (!q) return all
    return all.filter(c => c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q))
  }, [data, search])

  const handleExport = () => {
    exportToCSV(rows.map(c => ({
      [t('ragColCustomer')]: customerName(c),
      [t('ragColPhone')]: c.phone ?? '',
      [t('ragColBills')]: c.count,
      ...Object.fromEntries(AGING_BUCKETS.map(b => [t(BUCKET_LABEL[b]), c[b]])),
      [t('ragColTotal')]: c.outstanding,
      // Teks, bukan angka: hari tidak boleh ikut dijumlah di baris TOTAL.
      [t('ragColMaxDays')]: String(c.max_days_overdue),
      [t('ragColOldest')]: c.oldest_at ? todayISODate(new Date(c.oldest_at)) : '',
    })), csvFilename('umur-piutang'))
  }

  const columns = [
    {
      key: 'customer', label: t('ragColCustomer'),
      render: (row: AgingCustomer) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground">{customerName(row)}</p>
          <p className="text-xs text-muted-foreground">
            {[row.phone, t('ragBills', { count: formatQuantity(row.count) })].filter(Boolean).join(' · ')}
          </p>
        </div>
      ),
    },
    ...AGING_BUCKETS.map(bucket => ({
      key: bucket, label: t(BUCKET_LABEL[bucket]), className: 'text-right',
      render: (row: AgingCustomer) => row[bucket] > 0
        ? <span className="tabular-nums text-foreground">{formatCurrency(row[bucket])}</span>
        : <span className="text-muted-foreground">—</span>,
    })),
    {
      key: 'outstanding', label: t('ragColTotal'), className: 'text-right',
      render: (row: AgingCustomer) => (
        <div className="flex flex-col items-end gap-1">
          <span className="tabular-nums font-semibold text-foreground">{formatCurrency(row.outstanding)}</span>
          <Badge variant={BUCKET_BADGE[agingBucketOf(row.max_days_overdue)]}>
            {row.max_days_overdue > 0 ? t('ragOverdueDays', { days: row.max_days_overdue }) : t('ragBucketCurrent')}
          </Badge>
        </div>
      ),
    },
    {
      key: 'oldest_at', label: t('ragColOldest'),
      render: (row: AgingCustomer) => <span className="text-xs text-muted-foreground">{row.oldest_at ? formatDate(row.oldest_at) : '—'}</span>,
    },
  ]

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      <Header title={t('navReceivableAging')} subtitle={t('ragSubtitle', { date: data?.as_of ? formatDate(data.as_of) : formatDate(new Date()) })} />
      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard title={t('ragTotal')} value={formatCurrency(data?.outstanding ?? 0)} icon={<Wallet size={18} />} color="blue" emphasis loading={isLoading}
            subtitle={data ? t('ragTotalSub', { customers: formatQuantity(data.customer_count), bills: formatQuantity(data.count) }) : undefined} />
          {AGING_BUCKETS.map(bucket => (
            <StatCard key={bucket} title={t(BUCKET_LABEL[bucket])} value={formatCurrency(data?.[bucket] ?? 0)}
              icon={bucket === 'current' ? <CalendarCheck size={18} /> : <CalendarX size={18} />} color={BUCKET_COLOR[bucket]} loading={isLoading} />
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
            <div className="w-full min-w-0 xl:w-auto xl:flex-1">
              <p className="text-sm font-semibold text-foreground">{t('ragListTitle')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('ragListHint')}</p>
            </div>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('ragSearch')}
              className="flex-1 min-w-[12rem] px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={handleExport} disabled={!rows.length}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted disabled:opacity-40 transition shrink-0">
              <Download size={14} />
              {t('exportCsv')}
            </button>
          </div>
          <DataTable columns={columns as never[]} data={rows as never[]} loading={isLoading} error={error} onRetry={refetch}
            onRowClick={(row: AgingCustomer) => { if (row.customer_id) setLedgerOf(row) }}
            emptySlot={<EmptyState icon={<Wallet size={26} />} title={(data?.customers.length ?? 0) > 0 ? t('ragNoMatch') : t('ragEmpty')} />} />
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          <Info size={14} className="mt-0.5 shrink-0" />
          <p>{t('ragNote')}</p>
        </div>
      </div>

      {ledgerOf?.customer_id && (
        <KasbonLedgerModal customerId={ledgerOf.customer_id} name={customerName(ledgerOf)} oldestAt={ledgerOf.oldest_at}
          outletId={outletId || undefined} onClose={() => setLedgerOf(null)} />
      )}
    </div>
  )
}
