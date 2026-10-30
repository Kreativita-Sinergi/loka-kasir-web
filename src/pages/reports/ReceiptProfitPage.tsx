import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, DollarSign, Download, Info, Percent, ShoppingCart, TrendingUp } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import Badge from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { DataTable } from '@/components/ui/Table'
import ReportDateRange from '@/components/reports/ReportDateRange'
import TransactionDetailModal from '@/components/transactions/TransactionDetailModal'
import TransactionDeleteModal from '@/components/transactions/TransactionDeleteModal'
import { getReceiptProfit, type ReceiptProfitRow } from '@/api/salesReports'
import { useOutletStore } from '@/store/outletStore'
import { PERMS, usePermissions } from '@/hooks/usePermissions'
import { formatCurrency, formatDateTime, todayISODate } from '@/lib/utils'
import { exportToCSV, csvFilename } from '@/lib/exportUtils'
import { monthStartISO } from '@/lib/reportRange'
import { t } from '@/lib/i18n'

const LIMIT = 50

const exportButtonClass =
  'flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted disabled:opacity-40 transition shrink-0'

// Ambang warna margin sama dengan tabel Profitabilitas, supaya "hijau" di dua
// laporan itu berarti hal yang sama.
function marginVariant(margin: number) {
  if (margin >= 30) return 'green' as const
  if (margin >= 15) return 'yellow' as const
  return 'red' as const
}

const pct = (value: number) => `${value.toFixed(1)}%`

export default function ReceiptProfitPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const { selected: selectedOutlet } = useOutletStore()
  const [range, setRange] = useState(() => ({ from: monthStartISO(), to: todayISODate() }))
  const [cashierId, setCashierId] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<ReceiptProfitRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ReceiptProfitRow | null>(null)
  const [exporting, setExporting] = useState(false)

  const params = {
    start_date: range.from,
    end_date: range.to,
    outlet_id: selectedOutlet?.id,
    cashier_id: cashierId || undefined,
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['receipt-profit', params, page],
    queryFn: () => getReceiptProfit({ ...params, page, limit: LIMIT }),
    select: (res) => res.data.data,
    enabled: !!range.from && !!range.to,
  })

  const summary = data?.summary
  const items = data?.items ?? []
  const costsComplete = summary?.costs_complete ?? true

  // Saringan berubah → kembali ke halaman 1; halaman 5 dari saringan lama bisa
  // tidak ada lagi dan tabelnya tampak kosong tanpa alasan.
  const changeRange = (next: { from: string; to: string }) => { setRange(next); setPage(1) }
  const changeCashier = (id: string) => { setCashierId(id); setPage(1) }

  // Ekspor meminta SEMUA baris (export=1), bukan hanya halaman yang tampil:
  // berkas yang dipotong 50 baris diam-diam lebih berbahaya daripada tidak ada.
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await getReceiptProfit({ ...params, export: 1 })
      const rows = res.data.data?.items ?? []
      exportToCSV(rows.map((r) => ({
        [t('rcpColBill')]: r.bill_number,
        [t('rcpColTime')]: formatDateTime(r.created_at),
        [t('labelOutlet')]: r.outlet_name,
        [t('rcpColCustomer')]: r.customer_name || t('rcpWalkIn'),
        [t('labelCashier')]: r.cashier_name,
        [t('rcpColRevenue')]: r.revenue,
        [t('rcpColCogs')]: r.cogs,
        [t('rcpColProfit')]: r.gross_profit,
        // Teks, bukan angka: baris TOTAL otomatis akan menjumlah persen.
        [t('rcpColMargin')]: pct(r.gross_margin),
        [t('rcpColCostComplete')]: r.missing_cost ? t('rcpNo') : t('rcpYes'),
      })), csvFilename('laba-per-nota'))
    } finally {
      setExporting(false)
    }
  }

  const columns = [
    {
      key: 'bill_number',
      label: t('rcpColBill'),
      render: (r: ReceiptProfitRow) => (
        <div>
          <p className="text-sm font-medium text-foreground">{r.bill_number || '—'}</p>
          {!selectedOutlet && r.outlet_name && <p className="text-xs text-muted-foreground">{r.outlet_name}</p>}
        </div>
      ),
    },
    { key: 'created_at', label: t('rcpColTime'), render: (r: ReceiptProfitRow) => <span className="text-xs text-foreground">{formatDateTime(r.created_at)}</span> },
    {
      key: 'customer_name',
      label: t('rcpColCustomer'),
      render: (r: ReceiptProfitRow) => (
        <span className={`text-sm ${r.customer_name ? 'text-foreground' : 'text-muted-foreground italic'}`}>{r.customer_name || t('rcpWalkIn')}</span>
      ),
    },
    { key: 'cashier_name', label: t('labelCashier'), render: (r: ReceiptProfitRow) => <span className="text-sm text-muted-foreground">{r.cashier_name || '—'}</span> },
    { key: 'revenue', label: t('rcpColRevenue'), className: 'text-right', render: (r: ReceiptProfitRow) => <span className="text-sm text-foreground">{formatCurrency(r.revenue)}</span> },
    {
      key: 'cogs',
      label: t('rcpColCogs'),
      className: 'text-right',
      render: (r: ReceiptProfitRow) => (
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm text-muted-foreground">{formatCurrency(r.cogs)}</span>
          {r.missing_cost && <Badge variant="warning">{t('rcpCostMissingBadge')}</Badge>}
        </div>
      ),
    },
    {
      key: 'gross_profit',
      label: t('rcpColProfit'),
      className: 'text-right',
      render: (r: ReceiptProfitRow) => (
        <span className={`text-sm font-semibold ${r.gross_profit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {formatCurrency(r.gross_profit)}
        </span>
      ),
    },
    {
      key: 'gross_margin',
      label: t('rcpColMargin'),
      className: 'text-right',
      // Margin nota yang modalnya belum lengkap selalu terlalu tinggi — tidak
      // diberi warna hijau yang menenangkan.
      render: (r: ReceiptProfitRow) => r.missing_cost
        ? <span className="text-sm text-muted-foreground">—</span>
        : <Badge variant={marginVariant(r.gross_margin)}>{pct(r.gross_margin)}</Badge>,
    },
  ]

  const cashierOptions = (data?.cashiers ?? []).map((c) => ({ value: c.id, label: c.name || '—' }))

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header
        title={t('navReceiptProfit')}
        subtitle={selectedOutlet ? t('rcpSubtitleOutlet', { outlet: selectedOutlet.name }) : t('rcpSubtitle')}
      />

      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <ReportDateRange from={range.from} to={range.to} onChange={changeRange} />
          <div className="w-full sm:w-56">
            <SearchableSelect
              value={cashierId}
              onChange={changeCashier}
              options={cashierOptions}
              placeholder={t('rcpAllCashiers')}
              size="sm"
              label={t('labelCashier')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title={t('rcpColRevenue')} value={formatCurrency(summary?.revenue ?? 0)} icon={<DollarSign size={18} />} color="blue" loading={isLoading} />
          <StatCard title={t('rcpColCogs')} value={costsComplete ? formatCurrency(summary?.cogs ?? 0) : '—'} icon={<ShoppingCart size={18} />} color="orange" loading={isLoading} />
          <StatCard title={t('rcpColProfit')} value={costsComplete ? formatCurrency(summary?.gross_profit ?? 0) : '—'} icon={<TrendingUp size={18} />} color={(summary?.gross_profit ?? 0) >= 0 ? 'green' : 'red'} loading={isLoading} />
          <StatCard title={t('rcpColMargin')} value={costsComplete ? pct(summary?.gross_margin ?? 0) : '—'} icon={<Percent size={18} />} color="purple" loading={isLoading} />
        </div>

        {/* Peringatan di ATAS tabel: tanpa itu "—" di kartu terbaca sebagai
            laporan rusak, padahal yang kosong adalah harga modal barangnya. */}
        {!costsComplete && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-4 py-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500 dark:text-amber-400" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              {t('rcpCostIncomplete', { count: summary?.missing_cost_count ?? 0 })}
              {can(PERMS.INVENTORY_VIEW) && (
                <>
                  {' '}
                  <button type="button" onClick={() => navigate('/products/base-prices')} className="font-semibold underline underline-offset-2">
                    {t('bpProfitCallout')}
                  </button>
                </>
              )}
            </p>
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
            <div className="w-full min-w-0 sm:w-auto sm:flex-1">
              <p className="text-sm font-semibold text-foreground">{t('rcpListTitle', { count: summary?.transaction_count ?? 0 })}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('rcpListDesc')}</p>
            </div>
            <button type="button" onClick={handleExport} disabled={!items.length || exporting} className={exportButtonClass}>
              <Download size={14} />
              {t('exportCsv')}
            </button>
          </div>
          <DataTable
            columns={columns as never[]}
            data={items as never[]}
            loading={isLoading} error={error} onRetry={refetch}
            emptyMessage={t('rcpEmpty')}
            onRowClick={(r) => setSelected(r as ReceiptProfitRow)}
          />
          <Pagination page={page} total={data?.pagination.total ?? 0} limit={data?.pagination.limit || LIMIT} onChange={setPage} />
        </div>

        <div className="flex gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">{t('rcpNote')}</p>
        </div>
      </div>

      {selected && !deleteTarget && (
        <TransactionDetailModal
          transactionId={selected.transaction_id}
          onClose={() => setSelected(null)}
          onRefund={() => {}}
          onCancel={() => {}}
          onDelete={() => setDeleteTarget(selected)}
        />
      )}
      {deleteTarget && (
        <TransactionDeleteModal
          transactionId={deleteTarget.transaction_id}
          billNumber={deleteTarget.bill_number}
          onClose={() => setDeleteTarget(null)}
          onSuccess={() => {
            setDeleteTarget(null)
            setSelected(null)
            void queryClient.invalidateQueries({ queryKey: ['receipt-profit'] })
          }}
        />
      )}
    </div>
  )
}
