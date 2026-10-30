import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Download, Info, Landmark, Printer, Scale, Wallet } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import QueryErrorState from '@/components/ui/QueryErrorState'
import PrintPortal from '@/components/accounting/PrintPortal'
import StatementTable from '@/components/accounting/StatementTable'
import { ACCOUNTING_QUERY_KEY, exportButtonClass } from '@/components/accounting/accountingUi'
import { getAccBalanceSheet } from '@/api/accounting'
import { balanceSheetLines, formatAccDate, statementCsvRows } from '@/lib/accounting'
import { csvFilename, exportToCSV } from '@/lib/exportUtils'
import { cn, formatCurrency, todayISODate } from '@/lib/utils'
import { t } from '@/lib/i18n'

/**
 * Neraca per tanggal: Aset di satu sisi, Kewajiban + Ekuitas di sisi lain.
 * Ekuitas selalu memuat Laba Ditahan (laba tahun-tahun lalu) dan Laba Tahun
 * Berjalan (dihitung, bukan dijurnal) — jadi tidak perlu jurnal penutup.
 */
export default function BalanceSheetPage() {
  const navigate = useNavigate()
  const [asOf, setAsOf] = useState(() => todayISODate())
  const [printing, setPrinting] = useState(false)
  const stopPrinting = useCallback(() => setPrinting(false), [])

  const query = useQuery({
    queryKey: [ACCOUNTING_QUERY_KEY, 'balance-sheet', asOf],
    queryFn: () => getAccBalanceSheet({ as_of: asOf || undefined }),
    select: res => res.data.data,
  })
  const bs = query.data
  const lines = bs ? balanceSheetLines(bs) : []
  const period = bs ? t('accAsOf', { date: formatAccDate(bs.as_of) }) : ''

  // Buku besar dibuka dari awal tahun buku sampai tanggal neraca.
  const openLedger = (accountId: string) => navigate(`/accounting/ledger?account_id=${accountId}&start_date=${bs?.fiscal_year_start ?? asOf}&end_date=${asOf}`)

  const check = bs && (
    <div className={cn('flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3 text-sm',
      bs.balanced ? 'border-success/20 bg-success-subtle text-success' : 'border-warning/20 bg-warning-subtle text-warning')}
      role={bs.balanced ? 'status' : 'alert'}>
      {bs.balanced ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />}
      <span className="font-medium">{bs.balanced ? t('accBalancedCheck') : t('accNotBalancedWarn')}</span>
      <span className="tabular-nums">
        {t('accBalanceEquation', {
          assets: formatCurrency(bs.total_assets),
          liabilities: formatCurrency(bs.total_liabilities),
          equity: formatCurrency(bs.total_equity),
        })}
      </span>
    </div>
  )

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header title={t('navAccBalanceSheet')} subtitle={t('accBalanceSheetSubtitle')} />
      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <label className="flex flex-col gap-1 w-fit">
          <span className="text-xs font-medium text-muted-foreground">{t('accAsOfLabel')}</span>
          <input type="date" value={asOf} onChange={event => setAsOf(event.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground" />
        </label>

        <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-4">
          <StatCard title={t('accTotalAssets')} value={formatCurrency(bs?.total_assets ?? 0)} icon={<Landmark size={18} />} color="blue" loading={query.isLoading} />
          <StatCard title={t('accTotalLiabilities')} value={formatCurrency(bs?.total_liabilities ?? 0)} icon={<Scale size={18} />} color="orange" loading={query.isLoading} />
          <StatCard title={t('accTotalEquity')} value={formatCurrency(bs?.total_equity ?? 0)} icon={<Wallet size={18} />} color="purple" loading={query.isLoading} />
        </div>

        {check}

        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground min-w-0 flex-1">{period}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPrinting(true)} disabled={!bs} className={exportButtonClass}><Printer size={14} /> {t('actionPrint')}</button>
              <button type="button" onClick={() => exportToCSV(statementCsvRows(lines), csvFilename(`neraca-${asOf}`), { withTotal: false })}
                disabled={!bs} className={exportButtonClass}><Download size={14} /> {t('exportCsv')}</button>
            </div>
          </div>
          <QueryErrorState error={query.error} onRetry={query.refetch} />
          {query.isLoading && <div className="p-5 space-y-3">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-4 animate-pulse rounded bg-muted" />)}</div>}
          {bs && <StatementTable lines={lines} currentLabel={t('accColAmount')} onAccountClick={openLedger} />}
        </div>

        <div className="flex gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">{t('accBalanceSheetNote')}</p>
        </div>
      </div>

      {printing && bs && (
        <PrintPortal title={t('navAccBalanceSheet')} period={period} onDone={stopPrinting}>
          <StatementTable lines={lines} currentLabel={t('accColAmount')} print />
          <p className="mt-3">{t('accBalanceEquation', {
            assets: formatCurrency(bs.total_assets),
            liabilities: formatCurrency(bs.total_liabilities),
            equity: formatCurrency(bs.total_equity),
          })}</p>
        </PrintPortal>
      )}
    </div>
  )
}
