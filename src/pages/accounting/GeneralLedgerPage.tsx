import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowDownCircle, ArrowUpCircle, BookOpen, Download, Landmark, Wallet } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import QueryErrorState from '@/components/ui/QueryErrorState'
import SearchableSelect from '@/components/ui/SearchableSelect'
import ReportDateRange from '@/components/reports/ReportDateRange'
import SourceDrillDown from '@/components/accounting/SourceDrillDown'
import { ACCOUNTING_QUERY_KEY, exportButtonClass, thClass } from '@/components/accounting/accountingUi'
import { getAccAccounts, getAccLedger } from '@/api/accounting'
import { accountOptionLabel, formatAccDate, ledgerCsvRows, sourceLabel, typeLabel } from '@/lib/accounting'
import { csvFilename, exportToCSV } from '@/lib/exportUtils'
import { monthStartISO } from '@/lib/reportRange'
import { cn, formatCurrency, getErrorMessage, todayISODate } from '@/lib/utils'
import { t } from '@/lib/i18n'

const LIMIT = 50

/**
 * Buku Besar satu perkiraan: saldo awal, mutasi kronologis dengan saldo
 * berjalan, saldo akhir. Saldo berjalan dihitung server atas seluruh periode,
 * jadi halaman 2 melanjutkan halaman 1. Perkiraan dan rentang bisa dibawa
 * lewat URL (?account_id=&start_date=&end_date=) dari Daftar Perkiraan atau
 * Neraca Saldo.
 */
export default function GeneralLedgerPage() {
  const [params, setParams] = useSearchParams()
  const accountId = params.get('account_id') ?? ''
  const [range, setRange] = useState(() => ({ from: params.get('start_date') || monthStartISO(), to: params.get('end_date') || todayISODate() }))
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const accountsQuery = useQuery({
    queryKey: [ACCOUNTING_QUERY_KEY, 'accounts', { includeInactive: true, withBalance: false }],
    queryFn: () => getAccAccounts({ include_inactive: true }),
    select: res => res.data.data ?? [],
  })
  // Perkiraan induk tidak punya buku besar sendiri (server menolaknya).
  const options = (accountsQuery.data ?? []).filter(account => !account.is_group).map(account => ({
    value: account.id,
    label: accountOptionLabel(account) + (account.is_active ? '' : ` (${t('statusInactiveShort')})`),
    group: typeLabel(account.type),
  }))

  const query = useQuery({
    queryKey: [ACCOUNTING_QUERY_KEY, 'ledger', accountId, range.from, range.to, page],
    queryFn: () => getAccLedger({ account_id: accountId, start_date: range.from, end_date: range.to, page, limit: LIMIT }),
    select: res => res.data.data,
    enabled: !!accountId && !!range.from && !!range.to,
  })
  const ledger = query.data
  const lines = ledger?.lines ?? []

  const selectAccount = (id: string) => {
    const next = new URLSearchParams(params)
    if (id) next.set('account_id', id)
    else next.delete('account_id')
    setParams(next, { replace: true })
    setPage(1)
  }

  const handleExport = async () => {
    if (!accountId) return
    setExporting(true)
    try {
      const res = await getAccLedger({ account_id: accountId, start_date: range.from, end_date: range.to, export: 1 })
      const all = res.data.data
      if (!all) return
      exportToCSV(ledgerCsvRows(all), csvFilename(`buku-besar-${all.account.code}`), { withTotal: false })
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header title={t('navAccLedger')} subtitle={ledger ? accountOptionLabel(ledger.account) : t('accLedgerSubtitle')} />
      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 w-full sm:w-80">
            <span className="text-xs font-medium text-muted-foreground">{t('accColAccount')}</span>
            <SearchableSelect size="sm" value={accountId} onChange={selectAccount} options={options} searchable
              placeholder={accountsQuery.isLoading ? t('loading') : t('accSelectAccount')} label={t('accColAccount')} className="w-full" />
          </label>
          <ReportDateRange from={range.from} to={range.to} onChange={next => { setRange(next); setPage(1) }} />
        </div>

        {!accountId ? (
          <div className="bg-card rounded-2xl border border-border">
            <EmptyState icon={<BookOpen size={26} />} title={t('accLedgerPickTitle')} description={t('accLedgerPickBody')} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <StatCard title={t('accOpeningBalance')} value={formatCurrency(ledger?.opening_balance ?? 0)} icon={<Landmark size={20} />} color="blue" loading={query.isLoading} />
              <StatCard title={t('accDebit')} value={formatCurrency(ledger?.total_debit ?? 0)} icon={<ArrowDownCircle size={20} />} color="green" loading={query.isLoading} />
              <StatCard title={t('accCredit')} value={formatCurrency(ledger?.total_credit ?? 0)} icon={<ArrowUpCircle size={20} />} color="orange" loading={query.isLoading} />
              <StatCard title={t('accClosingBalance')} value={formatCurrency(ledger?.closing_balance ?? 0)} icon={<Wallet size={20} />} color="purple" emphasis loading={query.isLoading} />
            </div>

            <div className="bg-card rounded-2xl border border-border">
              <div className="px-5 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground min-w-0 flex-1">
                  {ledger ? t('accLedgerBalanceHint', { side: ledger.account.normal_balance === 'debit' ? t('accDebit') : t('accCredit') }) : ''}
                </p>
                <button type="button" onClick={handleExport} disabled={!ledger || exporting} className={exportButtonClass}>
                  <Download size={14} /> {t('exportCsv')}
                </button>
              </div>
              <QueryErrorState error={query.error} onRetry={query.refetch} />
              <div className="min-w-0 max-w-full overflow-x-auto" aria-busy={query.isLoading}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th scope="col" className={thClass}>{t('labelDate')}</th>
                      <th scope="col" className={thClass}>{t('accColNumber')}</th>
                      <th scope="col" className={thClass}>{t('accColDescription')}</th>
                      <th scope="col" className={cn(thClass, 'text-right')}>{t('accDebit')}</th>
                      <th scope="col" className={cn(thClass, 'text-right')}>{t('accCredit')}</th>
                      <th scope="col" className={cn(thClass, 'text-right')}>{t('accColBalance')}</th>
                      <th scope="col" className={thClass}><span className="sr-only">{t('accViewSource')}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.isLoading && Array.from({ length: 5 }, (_, i) => (
                      <tr key={i} className="border-b border-border">{Array.from({ length: 7 }, (_, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-muted" /></td>)}</tr>
                    ))}
                    {ledger && page === 1 && (
                      <tr className="border-b border-border bg-muted/20">
                        <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">{formatAccDate(ledger.start_date)}</td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2 font-medium text-foreground">{t('accOpeningBalance')}</td>
                        <td className="px-4 py-2" /><td className="px-4 py-2" />
                        <td className="px-4 py-2 text-right tabular-nums font-semibold">{formatCurrency(ledger.opening_balance)}</td>
                        <td className="px-4 py-2" />
                      </tr>
                    )}
                    {ledger && lines.map((line, index) => (
                      <tr key={`${line.entry_key}-${index}`} className="border-b border-border hover:bg-muted/40">
                        <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">{formatAccDate(line.date)}</td>
                        <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{line.ref_no ?? ''}</td>
                        <td className="px-4 py-2">
                          <span className="text-sm text-foreground">{line.description}</span>
                          <span className="block text-xs text-muted-foreground">{[sourceLabel(line.source, line.source_label, line.entry_key), line.memo].filter(Boolean).join(' · ')}</span>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">{line.debit ? formatCurrency(line.debit) : ''}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{line.credit ? formatCurrency(line.credit) : ''}</td>
                        <td className={cn('px-4 py-2 text-right tabular-nums font-medium', line.balance < 0 && 'text-red-600 dark:text-red-400')}>{formatCurrency(line.balance)}</td>
                        <td className="px-4 py-2 text-right"><SourceDrillDown refType={line.ref_type} refId={line.ref_id} refNo={line.ref_no} /></td>
                      </tr>
                    ))}
                    {ledger && lines.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">{t('accLedgerEmpty')}</td></tr>
                    )}
                    {ledger && (
                      <tr className="border-t border-border bg-muted/30 font-semibold">
                        <td className="px-4 py-2 text-xs whitespace-nowrap">{formatAccDate(ledger.end_date)}</td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2">{t('accClosingBalance')}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(ledger.total_debit)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(ledger.total_credit)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(ledger.closing_balance)}</td>
                        <td className="px-4 py-2" />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={ledger?.pagination?.total ?? 0} limit={LIMIT} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
