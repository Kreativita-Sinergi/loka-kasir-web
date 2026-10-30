import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowDownCircle, ArrowUpCircle, ChevronDown, ChevronRight, Download, Info, NotebookPen, Plus, ScrollText } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import Badge from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import QueryErrorState from '@/components/ui/QueryErrorState'
import SearchableSelect from '@/components/ui/SearchableSelect'
import ReportDateRange from '@/components/reports/ReportDateRange'
import JournalFormModal from '@/components/accounting/JournalFormModal'
import SourceDrillDown from '@/components/accounting/SourceDrillDown'
import { ACCOUNTING_QUERY_KEY, exportButtonClass, primaryButtonClass, thClass } from '@/components/accounting/accountingUi'
import { getAccJournal, JOURNAL_SOURCES } from '@/api/accounting'
import type { AccJournalEntry } from '@/api/accounting'
import { formatAccDate, journalCsvRows, sourceLabel } from '@/lib/accounting'
import { PERMS, usePermissions } from '@/hooks/usePermissions'
import { csvFilename, exportToCSV } from '@/lib/exportUtils'
import { monthStartISO } from '@/lib/reportRange'
import { formatQuantity } from '@/lib/money'
import { cn, formatCurrency, getErrorMessage, todayISODate } from '@/lib/utils'
import { t } from '@/lib/i18n'

const LIMIT = 20

/**
 * Data Jurnal — seluruh jurnal otomatis (diturunkan dari nota, PO, kas,
 * shift, stok) dan Jurnal Umum, terbaru dulu. Jurnal otomatis hanya-baca;
 * Jurnal Umum dibuka untuk dilihat/dibatalkan.
 */
export default function JournalPage() {
  const { can } = usePermissions()
  const canWrite = can(PERMS.FINANCE_ACCOUNTING)
  const [range, setRange] = useState(() => ({ from: monthStartISO(), to: todayISODate() }))
  const [source, setSource] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [allOpen, setAllOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const query = useQuery({
    queryKey: [ACCOUNTING_QUERY_KEY, 'journal', range.from, range.to, source, page],
    queryFn: () => getAccJournal({ start_date: range.from, end_date: range.to, source: source || undefined, page, limit: LIMIT }),
    select: res => res.data.data,
    enabled: !!range.from && !!range.to,
  })
  const data = query.data
  const entries = data?.entries ?? []

  const isOpen = (entry: AccJournalEntry) => allOpen !== expanded.has(entry.key)
  const toggle = (key: string) => setExpanded(current => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  // CSV membaca SELURUH entri rentang ini (export=1), bukan hanya halaman
  // yang tampil. Total ditulis dari angka server yang sudah tanpa jurnal batal.
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await getAccJournal({ start_date: range.from, end_date: range.to, source: source || undefined, export: 1 })
      const all = res.data.data
      const rows = journalCsvRows(all?.entries ?? [])
      if (!rows.length) return
      const keys = Object.keys(rows[0])
      const total = Object.fromEntries(keys.map(key => [key, '' as string | number]))
      total[keys[0]] = t('exportTotalRow')
      total[t('accDebit')] = all?.total_debit ?? 0
      total[t('accCredit')] = all?.total_credit ?? 0
      exportToCSV([...rows, total], csvFilename(`jurnal-${range.from}-${range.to}`), { withTotal: false })
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  const sourceOptions = JOURNAL_SOURCES.map(value => ({ value, label: sourceLabel(value) }))

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header title={t('navAccJournal')} subtitle={t('accJournalSubtitle')} />
      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <ReportDateRange from={range.from} to={range.to} onChange={next => { setRange(next); setPage(1) }} />
            <label className="flex flex-col gap-1 min-w-[12rem]">
              <span className="text-xs font-medium text-muted-foreground">{t('accColSource')}</span>
              <SearchableSelect size="sm" value={source} onChange={next => { setSource(next); setPage(1) }} options={sourceOptions}
                placeholder={t('accSourceAll')} label={t('accColSource')} className="w-full" />
            </label>
          </div>
          {canWrite && (
            <button type="button" onClick={() => setFormOpen(true)} className={primaryButtonClass}>
              <Plus size={15} /> {t('accJournalNew')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-4">
          <StatCard title={t('accTotalDebit')} value={formatCurrency(data?.total_debit ?? 0)} icon={<ArrowDownCircle size={18} />} color="blue" loading={query.isLoading} />
          <StatCard title={t('accTotalCredit')} value={formatCurrency(data?.total_credit ?? 0)} icon={<ArrowUpCircle size={18} />} color="purple" loading={query.isLoading} />
          <StatCard title={t('accEntryCount')} value={formatQuantity(data?.pagination?.total ?? 0)} icon={<ScrollText size={18} />} color="green" loading={query.isLoading} />
        </div>

        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => { setAllOpen(open => !open); setExpanded(new Set()) }} disabled={!entries.length}
              className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40">
              {allOpen ? t('accCollapseAll') : t('accExpandAll')}
            </button>
            <button type="button" onClick={handleExport} disabled={!entries.length || exporting} className={exportButtonClass}>
              <Download size={14} /> {t('exportCsv')}
            </button>
          </div>
          <QueryErrorState error={query.error} onRetry={query.refetch} />
          {query.isLoading && <div className="p-5 space-y-3">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />)}</div>}
          {!query.isLoading && !query.error && entries.length === 0 && (
            <EmptyState icon={<NotebookPen size={26} />} title={t('accJournalEmpty')} description={t('accJournalEmptyBody')} />
          )}
          <ul className="divide-y divide-border">
            {entries.map(entry => {
              const open = isOpen(entry)
              const struck = entry.voided && 'line-through text-muted-foreground'
              return (
                <li key={entry.key}>
                  <div className="flex flex-wrap items-start gap-3 px-5 py-3">
                    <button type="button" onClick={() => toggle(entry.key)} aria-expanded={open}
                      aria-label={open ? t('accCollapseEntry') : t('accExpandEntry')}
                      className="flex min-w-0 flex-1 items-start gap-2 text-left">
                      {open ? <ChevronDown size={16} className="mt-0.5 shrink-0 text-muted-foreground" /> : <ChevronRight size={16} className="mt-0.5 shrink-0 text-muted-foreground" />}
                      <span className="min-w-0">
                        <span className={cn('flex flex-wrap items-center gap-1.5', struck)}>
                          <span className="text-xs text-muted-foreground">{formatAccDate(entry.date)}</span>
                          {entry.ref_no && <span className="font-mono text-xs font-semibold text-foreground">{entry.ref_no}</span>}
                          <Badge variant={entry.source === 'manual' ? 'blue' : 'gray'}>{sourceLabel(entry.source, entry.source_label, entry.key)}</Badge>
                        </span>
                        <span className={cn('block text-sm text-foreground mt-0.5', struck)}>{entry.description}</span>
                        {entry.voided && (
                          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <Badge variant="red">{t('accVoided')}</Badge>
                            {entry.void_reason && <span>{t('accVoidedReason', { reason: entry.void_reason })}</span>}
                          </span>
                        )}
                      </span>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm font-semibold tabular-nums text-foreground whitespace-nowrap', struck)}>{formatCurrency(entry.total_debit)}</span>
                      <SourceDrillDown refType={entry.ref_type} refId={entry.ref_id} refNo={entry.ref_no} journalId={entry.journal_id} />
                    </div>
                  </div>
                  {open && (
                    <div className="px-5 pb-4">
                      <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th scope="col" className={thClass}>{t('accColAccount')}</th>
                              <th scope="col" className={cn(thClass, 'text-right')}>{t('accDebit')}</th>
                              <th scope="col" className={cn(thClass, 'text-right')}>{t('accCredit')}</th>
                            </tr>
                          </thead>
                          <tbody className={cn(struck)}>
                            {entry.lines.map((line, index) => (
                              <tr key={index} className="border-b border-border last:border-0">
                                {/* Baris kredit menjorok seperti jurnal di buku: mudah dibedakan sekali lihat. */}
                                <td className={cn('px-4 py-2', line.credit > 0 && 'pl-10')}>
                                  <span className="mr-2 font-mono text-xs text-muted-foreground">{line.account_code}</span>{line.account_name}
                                  {line.memo && <span className="block text-xs text-muted-foreground">{line.memo}</span>}
                                </td>
                                <td className="px-4 py-2 text-right tabular-nums">{line.debit ? formatCurrency(line.debit) : ''}</td>
                                <td className="px-4 py-2 text-right tabular-nums">{line.credit ? formatCurrency(line.credit) : ''}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          <Pagination page={page} total={data?.pagination?.total ?? 0} limit={LIMIT} onChange={setPage} />
        </div>

        <div className="flex gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">{t('accJournalNote')}</p>
        </div>
      </div>

      {formOpen && <JournalFormModal onClose={() => setFormOpen(false)} />}
    </div>
  )
}
