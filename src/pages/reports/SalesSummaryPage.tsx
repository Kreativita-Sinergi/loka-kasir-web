import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BadgePercent, DollarSign, Download, Info, Landmark, Receipt } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import { DataTable } from '@/components/ui/Table'
import ReportDateRange from '@/components/reports/ReportDateRange'
import {
  getSalesSummary, SALES_SUMMARY_GROUPS,
  type SalesSummaryGroup, type SalesSummaryRow,
} from '@/api/salesReports'
import { useOutletStore } from '@/store/outletStore'
import { formatCurrency, todayISODate } from '@/lib/utils'
import { formatQuantity } from '@/lib/money'
import { exportToCSV, csvFilename } from '@/lib/exportUtils'
import { monthStartISO } from '@/lib/reportRange'
import { t } from '@/lib/i18n'
import type { MessageKey } from '@/lib/messages'

const GROUP_LABEL: Record<SalesSummaryGroup, MessageKey> = {
  cashier: 'ssmGroupCashier',
  category: 'ssmGroupCategory',
  customer: 'ssmGroupCustomer',
  payment: 'ssmGroupPayment',
  order_type: 'ssmGroupOrderType',
  channel: 'ssmGroupChannel',
}

// Baris "tanpa ..." artinya berbeda per pengelompokan — nota tanpa pelanggan
// adalah pembeli umum, bukan "tanpa kategori".
const NONE_LABEL: Record<SalesSummaryGroup, MessageKey> = {
  cashier: 'ssmNoneCashier',
  customer: 'ssmNoneCustomer',
  category: 'ssmNoneCategory',
  order_type: 'ssmNoneOrderType',
  channel: 'ssmNoneChannel',
  payment: 'ssmNonePayment',
}

const CSV_SLUG: Record<SalesSummaryGroup, string> = {
  cashier: 'kasir',
  category: 'kategori',
  customer: 'pelanggan',
  payment: 'metode-bayar',
  order_type: 'jenis-pesanan',
  channel: 'channel',
}

/** Server mengosongkan label baris khusus; teksnya dipilih di sini menurut bahasa aktif. */
function salesSummaryRowLabel(group: SalesSummaryGroup, row: Pick<SalesSummaryRow, 'key' | 'label'>): string {
  if (row.label) return row.label
  if (row.key === 'others') return t('ssmOthers')
  if (row.key === 'unpaid') return t('ssmUnpaid')
  return t(NONE_LABEL[group])
}

const exportButtonClass =
  'flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted disabled:opacity-40 transition shrink-0'

const pct = (value: number) => `${value.toFixed(1)}%`

export default function SalesSummaryPage() {
  const { selected: selectedOutlet } = useOutletStore()
  const [range, setRange] = useState(() => ({ from: monthStartISO(), to: todayISODate() }))
  const [group, setGroup] = useState<SalesSummaryGroup>('cashier')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sales-summary', group, range.from, range.to, selectedOutlet?.id],
    queryFn: () => getSalesSummary({ group_by: group, start_date: range.from, end_date: range.to, outlet_id: selectedOutlet?.id }),
    select: (res) => res.data.data,
    enabled: !!range.from && !!range.to,
  })

  const rows = data?.rows ?? []
  const totals = data?.totals
  const label = (r: SalesSummaryRow) => salesSummaryRowLabel(group, r)

  // Baris TOTAL ditulis dari `totals` server, bukan dijumlah ulang: di
  // kategori & metode bayar satu nota muncul di beberapa baris, jadi jumlah
  // kolom "nota" akan melebihi jumlah nota yang sebenarnya.
  const handleExport = () => {
    if (!totals) return
    const groupCol = t(GROUP_LABEL[group])
    const toCsv = (name: string, detail: string, f: { transaction_count: number; qty: number; revenue: number; discount: number; tax: number; total: number }, share: string) => ({
      [groupCol]: name,
      [t('ssmColDetail')]: detail,
      [t('ssmColCount')]: f.transaction_count,
      [t('ssmColQty')]: Math.round(f.qty * 100) / 100,
      [t('ssmColRevenue')]: f.revenue,
      [t('ssmColDiscount')]: f.discount,
      [t('ssmColTax')]: f.tax,
      [t('ssmColTotal')]: f.total,
      [t('ssmColShare')]: share,
    })
    exportToCSV([
      ...rows.map((r) => toCsv(label(r), r.detail, r, pct(r.share))),
      toCsv(t('exportTotalRow'), '', totals, pct(100)),
    ], csvFilename(`ringkasan-penjualan-${CSV_SLUG[group]}`), { withTotal: false })
  }

  const columns = [
    {
      key: 'label',
      label: t(GROUP_LABEL[group]),
      render: (r: SalesSummaryRow) => (
        <div>
          <p className={`text-sm font-medium ${r.label ? 'text-foreground' : 'text-muted-foreground italic'}`}>{label(r)}</p>
          {r.detail && <p className="text-xs text-muted-foreground">{r.detail}</p>}
        </div>
      ),
    },
    { key: 'transaction_count', label: t('ssmColCount'), className: 'text-right', render: (r: SalesSummaryRow) => <span className="text-sm text-muted-foreground">{formatQuantity(r.transaction_count)}</span> },
    { key: 'qty', label: t('ssmColQty'), className: 'text-right', render: (r: SalesSummaryRow) => <span className="text-sm text-muted-foreground">{formatQuantity(r.qty)}</span> },
    { key: 'revenue', label: t('ssmColRevenue'), className: 'text-right', render: (r: SalesSummaryRow) => <span className="text-sm font-semibold text-foreground">{formatCurrency(r.revenue)}</span> },
    { key: 'discount', label: t('ssmColDiscount'), className: 'text-right', render: (r: SalesSummaryRow) => <span className="text-sm text-muted-foreground">{r.discount ? formatCurrency(r.discount) : '—'}</span> },
    { key: 'tax', label: t('ssmColTax'), className: 'text-right', render: (r: SalesSummaryRow) => <span className="text-sm text-muted-foreground">{r.tax ? formatCurrency(r.tax) : '—'}</span> },
    { key: 'share', label: t('ssmColShare'), className: 'text-right', render: (r: SalesSummaryRow) => <span className="text-sm text-muted-foreground">{pct(r.share)}</span> },
  ]

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header
        title={t('navSalesSummary')}
        subtitle={selectedOutlet ? t('ssmSubtitleOutlet', { outlet: selectedOutlet.name }) : t('ssmSubtitle')}
      />

      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <ReportDateRange from={range.from} to={range.to} onChange={setRange} />

        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title={t('ssmColCount')} value={formatQuantity(totals?.transaction_count ?? 0)} icon={<Receipt size={18} />} color="purple" loading={isLoading} />
          <StatCard title={t('ssmColRevenue')} value={formatCurrency(totals?.revenue ?? 0)} icon={<DollarSign size={18} />} color="blue" loading={isLoading} />
          <StatCard title={t('ssmColDiscount')} value={formatCurrency(totals?.discount ?? 0)} icon={<BadgePercent size={18} />} color="orange" loading={isLoading} />
          <StatCard title={t('ssmColTax')} value={formatCurrency(totals?.tax ?? 0)} icon={<Landmark size={18} />} color="green" loading={isLoading} />
        </div>

        <div className="flex flex-wrap gap-2 bg-muted p-1 rounded-xl w-fit max-w-full" role="tablist">
          {SALES_SUMMARY_GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              role="tab"
              aria-selected={group === g}
              onClick={() => setGroup(g)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition ${
                group === g ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(GROUP_LABEL[g])}
            </button>
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
            <div className="w-full min-w-0 sm:w-auto sm:flex-1">
              <p className="text-sm font-semibold text-foreground">{t('ssmPerGroup', { group: t(GROUP_LABEL[group]) })}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{group === 'customer' ? t('ssmCustomerTopHint') : t('ssmSortedHint')}</p>
            </div>
            <button type="button" onClick={handleExport} disabled={!rows.length} className={exportButtonClass}>
              <Download size={14} />
              {t('exportCsv')}
            </button>
          </div>
          <DataTable
            columns={columns as never[]}
            data={rows.map((r) => ({ ...r, id: r.key })) as never[]}
            loading={isLoading} error={error} onRetry={refetch}
            emptyMessage={t('ssmEmpty')}
          />
          {rows.length > 0 && totals && (
            <div className="px-5 py-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-foreground">{t('exportTotalRow')}</span>
              <span className="text-muted-foreground">
                {t('ssmColRevenue')}: <span className="font-semibold text-foreground">{formatCurrency(totals.revenue)}</span>
                {' · '}
                {t('ssmColTotal')}: <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totals.total)}</span>
              </span>
            </div>
          )}
          {data?.overlapping_counts && rows.length > 0 && (
            <p className="px-5 py-3 border-t border-border text-xs text-muted-foreground">{t('ssmOverlapNote')}</p>
          )}
        </div>

        <div className="flex gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">{t('ssmNote')}</p>
        </div>
      </div>
    </div>
  )
}
