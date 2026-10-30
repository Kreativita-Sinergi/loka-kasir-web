import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DollarSign, Download, Info, Printer, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import QueryErrorState from '@/components/ui/QueryErrorState'
import ReportDateRange from '@/components/reports/ReportDateRange'
import PrintPortal from '@/components/accounting/PrintPortal'
import StatementTable from '@/components/accounting/StatementTable'
import { ACCOUNTING_QUERY_KEY, exportButtonClass } from '@/components/accounting/accountingUi'
import { getAccProfitLoss } from '@/api/accounting'
import type { ProfitLossCompare } from '@/api/accounting'
import { formatAccDate, profitLossLines, statementCsvRows } from '@/lib/accounting'
import { csvFilename, exportToCSV } from '@/lib/exportUtils'
import { monthStartISO } from '@/lib/reportRange'
import { formatCurrency, todayISODate } from '@/lib/utils'
import { t } from '@/lib/i18n'
import type { MessageKey } from '@/lib/messages'

const COMPARE_OPTIONS: { value: '' | ProfitLossCompare; label: MessageKey }[] = [
  { value: '', label: 'accCompareNone' },
  { value: 'previous_period', label: 'accComparePrevPeriod' },
  { value: 'previous_year', label: 'accComparePrevYear' },
]

/**
 * Laba Rugi bertingkat (Pendapatan → HPP → Laba Kotor → Beban → Laba Usaha
 * → Lain-lain → Laba Bersih), opsional dibandingkan dengan periode sebelumnya
 * atau tanggal yang sama tahun lalu. Klik perkiraan membuka buku besarnya.
 */
export default function ProfitLossPage() {
  const navigate = useNavigate()
  const [range, setRange] = useState(() => ({ from: monthStartISO(), to: todayISODate() }))
  const [compare, setCompare] = useState<'' | ProfitLossCompare>('')
  const [printing, setPrinting] = useState(false)
  const stopPrinting = useCallback(() => setPrinting(false), [])

  const query = useQuery({
    queryKey: [ACCOUNTING_QUERY_KEY, 'profit-loss', range.from, range.to, compare],
    queryFn: () => getAccProfitLoss({ start_date: range.from, end_date: range.to, compare: compare || undefined }),
    select: res => res.data.data,
    enabled: !!range.from && !!range.to,
  })
  const pl = query.data
  const lines = pl ? profitLossLines(pl) : []
  const period = pl ? t('accPeriodRange', { from: formatAccDate(pl.start_date), to: formatAccDate(pl.end_date) }) : ''
  const comparePeriod = pl?.compare_start_date && pl.compare_end_date
    ? t('accPeriodRange', { from: formatAccDate(pl.compare_start_date), to: formatAccDate(pl.compare_end_date) })
    : undefined
  const net = pl?.summary.net_income ?? 0

  const openLedger = (accountId: string) => navigate(`/accounting/ledger?account_id=${accountId}&start_date=${range.from}&end_date=${range.to}`)

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header title={t('navAccProfitLoss')} subtitle={t('accProfitLossSubtitle')} />
      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <ReportDateRange from={range.from} to={range.to} onChange={setRange} />
          <div className="flex flex-wrap gap-2 bg-muted p-1 rounded-xl w-fit max-w-full" role="tablist" aria-label={t('accCompareLabel')}>
            {COMPARE_OPTIONS.map(option => (
              <button key={option.value || 'none'} type="button" role="tab" aria-selected={compare === option.value} onClick={() => setCompare(option.value)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition ${compare === option.value ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {t(option.label)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title={t('accTypeRevenue')} value={formatCurrency(pl?.summary.total_revenue ?? 0)} icon={<DollarSign size={18} />} color="blue" loading={query.isLoading} />
          <StatCard title={t('accGrossProfit')} value={formatCurrency(pl?.summary.gross_profit ?? 0)} icon={<TrendingUp size={18} />} color="green" loading={query.isLoading} />
          <StatCard title={t('accPlSectionExpense')} value={formatCurrency(pl?.summary.total_expense ?? 0)} icon={<TrendingDown size={18} />} color="orange" loading={query.isLoading} />
          <StatCard title={t('accNetIncome')} value={formatCurrency(net)} icon={<Wallet size={18} />} color={net < 0 ? 'red' : 'purple'} emphasis loading={query.isLoading} />
        </div>

        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{period}</p>
              {comparePeriod && <p className="text-xs text-muted-foreground">{t('accComparedWith', { period: comparePeriod })}</p>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPrinting(true)} disabled={!pl} className={exportButtonClass}><Printer size={14} /> {t('actionPrint')}</button>
              <button type="button" onClick={() => exportToCSV(statementCsvRows(lines, comparePeriod), csvFilename(`laba-rugi-${range.from}-${range.to}`), { withTotal: false })}
                disabled={!pl} className={exportButtonClass}><Download size={14} /> {t('exportCsv')}</button>
            </div>
          </div>
          <QueryErrorState error={query.error} onRetry={query.refetch} />
          {query.isLoading && <div className="p-5 space-y-3">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-4 animate-pulse rounded bg-muted" />)}</div>}
          {pl && <StatementTable lines={lines} currentLabel={t('accColAmount')} compareLabel={comparePeriod} onAccountClick={openLedger} />}
        </div>

        <div className="flex gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">{t('accProfitLossNote')}</p>
        </div>
      </div>

      {printing && pl && (
        <PrintPortal title={t('navAccProfitLoss')} period={period} onDone={stopPrinting}>
          <StatementTable lines={lines} currentLabel={t('accColAmount')} compareLabel={comparePeriod} print />
        </PrintPortal>
      )}
    </div>
  )
}
