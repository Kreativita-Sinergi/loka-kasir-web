import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BadgePercent, Download, Info, ShoppingBag, Users } from 'lucide-react'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import StatCard from '@/components/ui/StatCard'
import { DataTable } from '@/components/ui/Table'
import {
  getStaffCommissionLines, getStaffCommissionReport,
  type StaffCommissionLine, type StaffCommissionRow,
} from '@/api/staffCommission'
import { useOutletStore } from '@/store/outletStore'
import { formatCurrency, formatDateTime, todayISODate } from '@/lib/utils'
import { formatQuantity } from '@/lib/money'
import { exportToCSV, csvFilename } from '@/lib/exportUtils'
import { t } from '@/lib/i18n'

// Komisi biasanya dibayar per bulan, jadi rentang bawaannya awal bulan ini
// sampai hari ini. Tanggal LOKAL — toISOString mundur sehari di WIB sebelum 07.00.
const monthStart = () => {
  const now = new Date()
  return todayISODate(new Date(now.getFullYear(), now.getMonth(), 1))
}

const employeeLabel = (row: StaffCommissionRow) => row.employee_name || t('scmNoEmployee')

const LINES_LIMIT = 500

const exportButtonClass =
  'flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted disabled:opacity-40 transition shrink-0'

function rateLabel(line: StaffCommissionLine) {
  return line.commission_type === 'PERCENT'
    ? `${formatQuantity(line.commission_value)}%`
    : `${formatCurrency(line.commission_value)}${line.unit ? `/${line.unit}` : ''}`
}

const quantityLabel = (quantity: number, unit?: string) => `${formatQuantity(quantity)}${unit ? ` ${unit}` : ''}`

interface Range { start_date: string; end_date: string; outlet_id?: string }

function CommissionLinesModal({ row, range, onClose }: { row: StaffCommissionRow | null; range: Range; onClose: () => void }) {
  const employeeId = row ? (row.employee_id ?? 'none') : ''
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['staff-commission-lines', employeeId, range.start_date, range.end_date, range.outlet_id],
    queryFn: () => getStaffCommissionLines({ ...range, employee_id: employeeId }),
    select: (res) => res.data.data ?? [],
    enabled: !!row,
  })
  // Satu nota bisa memuat beberapa baris produk; DataTable memakai
  // transaction_id sebagai kunci baris bila `id` tidak ada.
  const lines = (data ?? []).map((line, index) => ({ ...line, id: `${line.transaction_id}-${index}` }))

  const handleExport = () => {
    if (!row) return
    exportToCSV(lines.map((l) => ({
      [t('scmColTime')]: formatDateTime(l.sold_at),
      [t('scmColBill')]: l.bill_number,
      [t('scmColProduct')]: l.product_name,
      [t('scmColQty')]: l.quantity,
      [t('labelUnit')]: l.unit,
      [t('scmColSales')]: l.sales,
      [t('scmColRate')]: rateLabel(l),
      [t('scmColCommission')]: l.commission,
    })), csvFilename(`komisi-${employeeLabel(row).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`))
  }

  const columns = [
    {
      key: 'sold_at',
      label: t('scmColTime'),
      render: (l: StaffCommissionLine) => (
        <div>
          <p className="text-xs text-foreground">{formatDateTime(l.sold_at)}</p>
          {l.bill_number && (
            <Link
              to={`/transactions?search=${encodeURIComponent(l.bill_number)}&id=${encodeURIComponent(l.transaction_id)}`}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              {l.bill_number}
            </Link>
          )}
        </div>
      ),
    },
    { key: 'product_name', label: t('scmColProduct'), render: (l: StaffCommissionLine) => <span className="text-sm text-foreground">{l.product_name}</span> },
    { key: 'quantity', label: t('scmColQty'), className: 'text-right', render: (l: StaffCommissionLine) => <span className="text-sm text-muted-foreground">{quantityLabel(l.quantity, l.unit)}</span> },
    { key: 'sales', label: t('scmColSales'), className: 'text-right', render: (l: StaffCommissionLine) => <span className="text-sm text-foreground">{formatCurrency(l.sales)}</span> },
    { key: 'rate', label: t('scmColRate'), className: 'text-right', render: (l: StaffCommissionLine) => <span className="text-xs text-muted-foreground">{rateLabel(l)}</span> },
    { key: 'commission', label: t('scmColCommission'), className: 'text-right', render: (l: StaffCommissionLine) => <span className="text-sm font-semibold text-foreground">{formatCurrency(l.commission)}</span> },
  ]

  return (
    <Modal open={!!row} onClose={onClose} title={row ? employeeLabel(row) : ''} size="lg">
      {row && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-0 text-sm text-muted-foreground">
              {t('scmColSales')}: <span className="font-semibold text-foreground">{formatCurrency(row.sales)}</span>
              {' · '}
              {t('scmColCommission')}: <span className="font-semibold text-foreground">{formatCurrency(row.commission)}</span>
            </div>
            <button type="button" onClick={handleExport} disabled={!lines.length} className={exportButtonClass}>
              <Download size={14} />
              {t('exportCsv')}
            </button>
          </div>
          {lines.length >= LINES_LIMIT && (
            <div className="flex items-start gap-2 rounded-xl bg-muted px-4 py-3 text-xs text-muted-foreground">
              <Info size={14} className="mt-0.5 shrink-0" />
              <p>{t('scmLinesLimit')}</p>
            </div>
          )}
          <div className="rounded-2xl border border-border overflow-hidden">
            <DataTable
              columns={columns as never[]}
              data={lines as never[]}
              loading={isLoading} error={error} onRetry={refetch}
              emptyMessage={t('scmLinesEmpty')}
            />
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function StaffCommissionPage() {
  const { selected: selectedOutlet } = useOutletStore()
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(() => todayISODate(new Date()))
  const [selected, setSelected] = useState<StaffCommissionRow | null>(null)
  const range: Range = { start_date: from, end_date: to, outlet_id: selectedOutlet?.id }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['staff-commission', from, to, selectedOutlet?.id],
    queryFn: () => getStaffCommissionReport(range),
    select: (res) => res.data.data,
    enabled: !!from && !!to,
  })

  const rows = data?.rows ?? []

  const handleExport = () => {
    exportToCSV(rows.map((r) => ({
      [t('scmColEmployee')]: employeeLabel(r),
      [t('scmColLines')]: r.lines,
      [t('scmColQty')]: r.quantity,
      [t('scmColSales')]: r.sales,
      [t('scmColCommission')]: r.commission,
    })), csvFilename('komisi-karyawan'))
  }

  const columns = [
    {
      key: 'employee',
      label: t('scmColEmployee'),
      render: (r: StaffCommissionRow) => (
        <span className={`text-sm font-medium ${r.employee_id ? 'text-foreground' : 'text-muted-foreground italic'}`}>{employeeLabel(r)}</span>
      ),
    },
    { key: 'lines', label: t('scmColLines'), className: 'text-right', render: (r: StaffCommissionRow) => <span className="text-sm text-muted-foreground">{formatQuantity(r.lines)}</span> },
    { key: 'quantity', label: t('scmColQty'), className: 'text-right', render: (r: StaffCommissionRow) => <span className="text-sm text-muted-foreground">{formatQuantity(r.quantity)}</span> },
    { key: 'sales', label: t('scmColSales'), className: 'text-right', render: (r: StaffCommissionRow) => <span className="text-sm text-foreground">{formatCurrency(r.sales)}</span> },
    { key: 'commission', label: t('scmColCommission'), className: 'text-right', render: (r: StaffCommissionRow) => <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(r.commission)}</span> },
  ]

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header
        title={t('navStaffCommission')}
        subtitle={selectedOutlet ? t('scmSubtitleOutlet', { outlet: selectedOutlet.name }) : t('scmSubtitle')}
      />

      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t('cashDiscFrom')}</span>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t('cashDiscTo')}</span>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title={t('scmTotalCommission')}
            value={formatCurrency(data?.total_commission ?? 0)}
            icon={<BadgePercent size={18} />}
            color="green"
            loading={isLoading}
          />
          <StatCard
            title={t('scmTotalSales')}
            value={formatCurrency(data?.total_sales ?? 0)}
            icon={<ShoppingBag size={18} />}
            color="blue"
            loading={isLoading}
          />
          <StatCard
            title={t('scmEmployees')}
            value={rows.length}
            icon={<Users size={18} />}
            color="purple"
            loading={isLoading}
          />
        </div>

        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
            <div className="w-full min-w-0 sm:w-auto sm:flex-1">
              <p className="text-sm font-semibold text-foreground">{t('scmPerEmployee')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('scmPerEmployeeDesc')}</p>
            </div>
            <button type="button" onClick={handleExport} disabled={!rows.length} className={exportButtonClass}>
              <Download size={14} />
              {t('exportCsv')}
            </button>
          </div>
          <DataTable
            columns={columns as never[]}
            data={rows.map((r) => ({ ...r, id: r.employee_id ?? 'none' })) as never[]}
            loading={isLoading} error={error} onRetry={refetch}
            emptyMessage={t('scmEmpty')}
            onRowClick={(r) => setSelected(r as StaffCommissionRow)}
          />
          {rows.length > 0 && (
            <div className="px-5 py-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-foreground">{t('scmTotal')}</span>
              <span className="text-muted-foreground">
                {t('scmColSales')}: <span className="font-semibold text-foreground">{formatCurrency(data?.total_sales ?? 0)}</span>
                {' · '}
                {t('scmColCommission')}: <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(data?.total_commission ?? 0)}</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">{t('scmNote')}</p>
        </div>
      </div>

      <CommissionLinesModal row={selected} range={range} onClose={() => setSelected(null)} />
    </div>
  )
}
