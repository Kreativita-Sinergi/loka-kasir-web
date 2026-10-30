import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowDownCircle, ArrowUpCircle, Download, Landmark, Users, Wallet, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import { DataTable } from '@/components/ui/Table'
import ReportDateRange from '@/components/reports/ReportDateRange'
import {
  depositKindIsIn, getDepositBalances, getDepositMutations,
  type DepositHolder, type DepositKind, type DepositMutation,
} from '@/api/moneyReports'
import { defaultLedgerRange } from '@/lib/cashBook'
import { csvFilename, exportToCSV } from '@/lib/exportUtils'
import { cn, formatCurrency, formatDateTime, getErrorMessage, toTitleCase } from '@/lib/utils'
import { formatQuantity } from '@/lib/money'
import { t } from '@/lib/i18n'
import type { MessageKey } from '@/lib/messages'

const LIMIT = 50

const KIND_LABEL: Record<DepositKind, MessageKey> = {
  top_up: 'dprKindTopUp',
  reward: 'dprKindReward',
  returned: 'dprKindReturned',
  used: 'dprKindUsed',
  withdrawn: 'dprKindWithdrawn',
}

const tabClass = (active: boolean) => cn(
  'px-4 py-2 text-sm font-medium rounded-xl border transition',
  active ? 'border-primary bg-primary/8 text-primary' : 'border-border text-muted-foreground hover:bg-muted',
)

/**
 * Saldo Deposit — uang pelanggan yang dititipkan di toko: mutasi semua
 * pelanggan pada satu periode (dengan saldo awal & akhirnya) dan saldo per
 * pelanggan hari ini. Klik pemegang saldo membuka mutasinya sendiri.
 */
export default function DepositReportPage() {
  const [tab, setTab] = useState<'mutations' | 'balances'>('mutations')
  const [range, setRange] = useState(defaultLedgerRange)
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null)
  const [page, setPage] = useState(1)
  const [holderPage, setHolderPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  // Cari dijalankan server; jeda supaya tidak satu permintaan per huruf.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(id)
  }, [search])
  const [exporting, setExporting] = useState(false)

  const mutationsQuery = useQuery({
    queryKey: ['deposit-mutations', range.start, range.end, customer?.id ?? null, page],
    queryFn: () => getDepositMutations({ start_date: range.start || undefined, end_date: range.end || undefined, customer_id: customer?.id, page, limit: LIMIT }),
    select: res => res.data.data,
    enabled: tab === 'mutations',
  })
  const balancesQuery = useQuery({
    queryKey: ['deposit-balances', debouncedSearch, holderPage],
    queryFn: () => getDepositBalances({ search: debouncedSearch || undefined, page: holderPage, limit: LIMIT }),
    select: res => res.data.data,
    enabled: tab === 'balances',
  })
  const report = mutationsQuery.data
  const balances = balancesQuery.data

  // Ekspor membaca SELURUH rentang dari server (export=1), bukan hanya
  // halaman yang sedang tampil.
  const handleExport = async () => {
    setExporting(true)
    try {
      if (tab === 'mutations') {
        const res = await getDepositMutations({ start_date: range.start || undefined, end_date: range.end || undefined, customer_id: customer?.id, export: 1 })
        exportToCSV(res.data.data.entries.map(e => ({
          [t('labelTime')]: formatDateTime(e.created_at),
          [t('ragColCustomer')]: e.customer_name,
          [t('ragColPhone')]: e.customer_phone ?? '',
          [t('dprColKind')]: t(KIND_LABEL[e.kind]),
          [t('cashAccIn')]: depositKindIsIn(e.kind) ? e.amount : '',
          [t('cashAccOut')]: depositKindIsIn(e.kind) ? '' : e.amount,
          [t('dprColBalanceAfter')]: e.balance_after,
          [t('dprColBill')]: e.bill_number ?? '',
          [t('dprColNotes')]: e.notes ?? '',
          [t('dprColBy')]: e.created_by ?? '',
        })), csvFilename('mutasi-saldo-deposit'), { withTotal: false })
      } else {
        const res = await getDepositBalances({ search: debouncedSearch || undefined, export: 1 })
        exportToCSV(res.data.data.holders.map(h => ({
          [t('ragColCustomer')]: h.name,
          [t('ragColPhone')]: h.phone ?? '',
          [t('dprColBalance')]: h.deposit_balance,
          [t('dprColLastMovement')]: h.last_movement_at ? formatDateTime(h.last_movement_at) : '',
        })), csvFilename('saldo-deposit-pelanggan'))
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  const mutationColumns = [
    {
      key: 'created_at', label: t('labelTime'),
      render: (row: DepositMutation) => (
        <div>
          <p className="text-xs text-foreground">{formatDateTime(row.created_at)}</p>
          {row.created_by && <p className="text-xs text-muted-foreground">{row.created_by}</p>}
        </div>
      ),
    },
    {
      key: 'customer', label: t('ragColCustomer'),
      render: (row: DepositMutation) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{toTitleCase(row.customer_name)}</p>
          <p className="text-xs text-muted-foreground">{[t(KIND_LABEL[row.kind]), row.bill_number && `#${row.bill_number}`, row.notes].filter(Boolean).join(' · ')}</p>
        </div>
      ),
    },
    {
      key: 'in', label: t('cashAccIn'), className: 'text-right',
      render: (row: DepositMutation) => depositKindIsIn(row.kind)
        ? <span className="tabular-nums font-medium text-green-600 dark:text-green-400">{formatCurrency(row.amount)}</span>
        : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'out', label: t('cashAccOut'), className: 'text-right',
      render: (row: DepositMutation) => depositKindIsIn(row.kind)
        ? <span className="text-muted-foreground">—</span>
        : <span className="tabular-nums font-medium text-red-600 dark:text-red-400">{formatCurrency(row.amount)}</span>,
    },
    {
      key: 'balance_after', label: t('dprColBalanceAfter'), className: 'text-right',
      render: (row: DepositMutation) => <span className="tabular-nums text-foreground">{formatCurrency(row.balance_after)}</span>,
    },
  ]

  const holderColumns = [
    {
      key: 'name', label: t('ragColCustomer'),
      render: (row: DepositHolder) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{toTitleCase(row.name)}</p>
          {row.phone && <p className="text-xs text-muted-foreground">{row.phone}</p>}
        </div>
      ),
    },
    {
      key: 'last', label: t('dprColLastMovement'),
      render: (row: DepositHolder) => <span className="text-xs text-muted-foreground">{row.last_movement_at ? formatDateTime(row.last_movement_at) : '—'}</span>,
    },
    {
      key: 'balance', label: t('dprColBalance'), className: 'text-right',
      render: (row: DepositHolder) => <span className="tabular-nums font-semibold text-foreground">{formatCurrency(row.deposit_balance)}</span>,
    },
  ]

  const breakdown = report
    ? ([['top_up', report.top_up], ['reward', report.from_rewards], ['returned', report.returned], ['used', report.used], ['withdrawn', report.withdrawn]] as [DepositKind, number][])
        .filter(([, v]) => v > 0)
    : []
  const canExport = tab === 'mutations' ? !!report?.entries.length : !!balances?.holders.length

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      <Header title={t('navDepositReport')} subtitle={t('dprSubtitle')} />
      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-2">
            <button type="button" className={tabClass(tab === 'mutations')} onClick={() => setTab('mutations')}>{t('dprTabMutations')}</button>
            <button type="button" className={tabClass(tab === 'balances')} onClick={() => setTab('balances')}>{t('dprTabBalances')}</button>
          </div>
          {tab === 'mutations' && (
            <ReportDateRange from={range.start} to={range.end} onChange={({ from, to }) => { setRange({ start: from, end: to }); setPage(1) }} />
          )}
          {tab === 'mutations' && customer && (
            <button type="button" onClick={() => { setCustomer(null); setPage(1) }} title={t('dprClearFilter')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border border-primary bg-primary/8 text-primary">
              {t('dprFilterCustomer', { name: toTitleCase(customer.name) })} <X size={14} />
            </button>
          )}
        </div>

        {tab === 'mutations' ? (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <StatCard title={t('cashAccOpening')} value={formatCurrency(report?.opening_balance ?? 0)} icon={<Landmark size={20} />} color="blue" loading={mutationsQuery.isLoading} />
              <StatCard title={t('cashAccIn')} value={formatCurrency(report?.total_in ?? 0)} icon={<ArrowDownCircle size={20} />} color="green" loading={mutationsQuery.isLoading} />
              <StatCard title={t('cashAccOut')} value={formatCurrency(report?.total_out ?? 0)} icon={<ArrowUpCircle size={20} />} color="orange" loading={mutationsQuery.isLoading} />
              <StatCard title={t('cashAccClosing')} value={formatCurrency(report?.closing_balance ?? 0)} icon={<Wallet size={20} />} color="purple" emphasis loading={mutationsQuery.isLoading} />
            </div>
            <div className="bg-card rounded-2xl border border-border">
              <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
                <div className="w-full min-w-0 xl:w-auto xl:flex-1">
                  <p className="text-sm font-semibold text-foreground">{t('dprTabMutations')}</p>
                  {breakdown.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">{breakdown.map(([k, v]) => `${t(KIND_LABEL[k])} ${formatCurrency(v)}`).join(' · ')}</p>
                  )}
                </div>
                <ExportButton onClick={handleExport} disabled={!canExport || exporting} />
              </div>
              <DataTable columns={mutationColumns as never[]} data={(report?.entries ?? []) as never[]} loading={mutationsQuery.isLoading}
                error={mutationsQuery.error} onRetry={mutationsQuery.refetch}
                emptySlot={<EmptyState icon={<Wallet size={26} />} title={t('dprEmptyMutations')} />} />
              <Pagination page={page} total={report?.pagination.total ?? 0} limit={LIMIT} onChange={setPage} />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 max-w-2xl">
              <StatCard title={t('dprOutstanding')} value={formatCurrency(balances?.outstanding ?? 0)} icon={<Wallet size={20} />} color="blue" emphasis loading={balancesQuery.isLoading} />
              <StatCard title={t('dprHolderCount')} value={formatQuantity(balances?.holder_count ?? 0)} icon={<Users size={20} />} color="purple" loading={balancesQuery.isLoading} />
            </div>
            <div className="bg-card rounded-2xl border border-border">
              <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
                <div className="w-full min-w-0 xl:w-auto xl:flex-1">
                  <p className="text-sm font-semibold text-foreground">{t('dprTabBalances')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('dprHolderHint')}</p>
                </div>
                <input type="text" value={search} onChange={e => { setSearch(e.target.value); setHolderPage(1) }} placeholder={t('dprSearch')}
                  className="flex-1 min-w-[12rem] px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <ExportButton onClick={handleExport} disabled={!canExport || exporting} />
              </div>
              <DataTable columns={holderColumns as never[]} data={(balances?.holders ?? []) as never[]} loading={balancesQuery.isLoading}
                error={balancesQuery.error} onRetry={balancesQuery.refetch}
                onRowClick={(row: DepositHolder) => { setCustomer({ id: row.customer_id, name: row.name }); setPage(1); setTab('mutations') }}
                emptySlot={<EmptyState icon={<Users size={26} />} title={t('dprEmptyHolders')} />} />
              <Pagination page={holderPage} total={balances?.pagination.total ?? 0} limit={LIMIT} onChange={setHolderPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ExportButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted disabled:opacity-40 transition shrink-0">
      <Download size={14} />
      {t('exportCsv')}
    </button>
  )
}
