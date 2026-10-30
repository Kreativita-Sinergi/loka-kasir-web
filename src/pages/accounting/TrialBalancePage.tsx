import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Download, Info, Printer } from 'lucide-react'
import Header from '@/components/layout/Header'
import Switch from '@/components/ui/Switch'
import QueryErrorState from '@/components/ui/QueryErrorState'
import ReportDateRange from '@/components/reports/ReportDateRange'
import PrintPortal from '@/components/accounting/PrintPortal'
import { ACCOUNTING_QUERY_KEY, exportButtonClass, thClass } from '@/components/accounting/accountingUi'
import { getAccTrialBalance } from '@/api/accounting'
import type { AccTrialBalance, AccTrialBalanceAmounts } from '@/api/accounting'
import { formatAccDate, groupTrialBalance, trialBalanceCsvRows, typeLabel } from '@/lib/accounting'
import { csvFilename, exportToCSV } from '@/lib/exportUtils'
import { monthStartISO } from '@/lib/reportRange'
import { cn, formatCurrency, todayISODate } from '@/lib/utils'
import { t } from '@/lib/i18n'

const money = (value: number) => (value ? formatCurrency(value) : '')

function AmountCells({ a, strong }: { a: AccTrialBalanceAmounts; strong?: boolean }) {
  const cell = cn('px-3 py-2 text-right tabular-nums whitespace-nowrap', strong && 'font-semibold')
  return (
    <>
      <td className={cell}>{money(a.opening_debit)}</td>
      <td className={cell}>{money(a.opening_credit)}</td>
      <td className={cell}>{money(a.debit)}</td>
      <td className={cell}>{money(a.credit)}</td>
      <td className={cell}>{money(a.closing_debit)}</td>
      <td className={cell}>{money(a.closing_credit)}</td>
    </>
  )
}

/** Tabel Neraca Saldo per jenis + subtotal; dipakai layar dan area cetak. */
function TrialBalanceTable({ tb, onRowClick, print }: { tb: AccTrialBalance; onRowClick?: (accountId: string) => void; print?: boolean }) {
  const groups = groupTrialBalance(tb.rows)
  const border = print ? 'border-black' : 'border-border'
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className={cn('border-b', border, !print && 'bg-muted/30')}>
          <th scope="col" rowSpan={2} className={thClass}>{t('accColAccount')}</th>
          <th scope="colgroup" colSpan={2} className={cn(thClass, 'text-center')}>{t('accOpeningBalance')}</th>
          <th scope="colgroup" colSpan={2} className={cn(thClass, 'text-center')}>{t('accMovement')}</th>
          <th scope="colgroup" colSpan={2} className={cn(thClass, 'text-center')}>{t('accClosingBalance')}</th>
        </tr>
        <tr className={cn('border-b', border, !print && 'bg-muted/30')}>
          {[0, 1, 2].flatMap(i => [
            <th key={`d${i}`} scope="col" className={cn(thClass, 'text-right')}>{t('accDebit')}</th>,
            <th key={`c${i}`} scope="col" className={cn(thClass, 'text-right')}>{t('accCredit')}</th>,
          ])}
        </tr>
      </thead>
      <tbody>
        {groups.map(group => [
          <tr key={`h-${group.type}`} className={cn('border-t', border)}>
            <td colSpan={7} className="px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{typeLabel(group.type)}</td>
          </tr>,
          ...group.rows.map(row => (
            <tr key={row.account_id} onClick={!print && onRowClick ? () => onRowClick(row.account_id) : undefined}
              className={cn(!print && onRowClick && 'cursor-pointer hover:bg-muted/40')}>
              <td className="px-3 py-2"><span className="mr-2 font-mono text-xs text-muted-foreground">{row.code}</span>{row.name}</td>
              <AmountCells a={row} />
            </tr>
          )),
          <tr key={`s-${group.type}`} className={cn('border-t border-dashed', border)}>
            <td className="px-3 py-2 font-semibold">{t('accTotalOf', { label: typeLabel(group.type) })}</td>
            <AmountCells a={group.subtotal} strong />
          </tr>,
        ])}
        <tr className={cn('border-t-2', border, !print && 'bg-muted/40')}>
          <td className="px-3 py-2 font-bold">{t('exportTotalRow')}</td>
          <AmountCells a={tb.totals} strong />
        </tr>
      </tbody>
    </table>
  )
}

/**
 * Neraca Saldo: saldo awal, mutasi periode, dan saldo akhir setiap perkiraan
 * bukan-induk, dikelompokkan per jenis. Baris bernilai nol disembunyikan
 * kecuali diminta.
 */
export default function TrialBalancePage() {
  const navigate = useNavigate()
  const [range, setRange] = useState(() => ({ from: monthStartISO(), to: todayISODate() }))
  const [includeZero, setIncludeZero] = useState(false)
  const [printing, setPrinting] = useState(false)
  const stopPrinting = useCallback(() => setPrinting(false), [])

  const query = useQuery({
    queryKey: [ACCOUNTING_QUERY_KEY, 'trial-balance', range.from, range.to, includeZero],
    queryFn: () => getAccTrialBalance({ start_date: range.from, end_date: range.to, include_zero: includeZero || undefined }),
    select: res => res.data.data,
    enabled: !!range.from && !!range.to,
  })
  const tb = query.data
  const period = tb ? t('accPeriodRange', { from: formatAccDate(tb.start_date), to: formatAccDate(tb.end_date) }) : ''

  const openLedger = (accountId: string) => navigate(`/accounting/ledger?account_id=${accountId}&start_date=${range.from}&end_date=${range.to}`)

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header title={t('navAccTrialBalance')} subtitle={t('accTrialBalanceSubtitle')} />
      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <ReportDateRange from={range.from} to={range.to} onChange={setRange} />
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            {t('accIncludeZero')}
            <Switch size="sm" checked={includeZero} onChange={setIncludeZero} label={t('accIncludeZero')} />
          </span>
        </div>

        {tb && !tb.balanced && (
          <p role="alert" className="flex items-center gap-2 rounded-xl border border-warning/20 bg-warning-subtle px-4 py-3 text-sm text-warning">
            <AlertTriangle size={16} className="shrink-0" /> {t('accNotBalancedWarn')}
          </p>
        )}

        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground min-w-0 flex-1">{period}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPrinting(true)} disabled={!tb} className={exportButtonClass}><Printer size={14} /> {t('actionPrint')}</button>
              <button type="button" onClick={() => tb && exportToCSV(trialBalanceCsvRows(tb), csvFilename(`neraca-saldo-${range.from}-${range.to}`), { withTotal: false })}
                disabled={!tb?.rows.length} className={exportButtonClass}><Download size={14} /> {t('exportCsv')}</button>
            </div>
          </div>
          <QueryErrorState error={query.error} onRetry={query.refetch} />
          {query.isLoading && <div className="p-5 space-y-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-4 animate-pulse rounded bg-muted" />)}</div>}
          {tb && tb.rows.length === 0 && <p className="px-5 py-12 text-center text-sm text-muted-foreground">{t('accReportEmpty')}</p>}
          {tb && tb.rows.length > 0 && (
            <div className="min-w-0 max-w-full overflow-x-auto"><TrialBalanceTable tb={tb} onRowClick={openLedger} /></div>
          )}
        </div>

        <div className="flex gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">{t('accTrialBalanceNote', { date: formatAccDate(tb?.fiscal_year_start) || '1 Jan' })}</p>
        </div>
      </div>

      {printing && tb && (
        <PrintPortal title={t('navAccTrialBalance')} period={period} onDone={stopPrinting}>
          <TrialBalanceTable tb={tb} print />
        </PrintPortal>
      )}
    </div>
  )
}
