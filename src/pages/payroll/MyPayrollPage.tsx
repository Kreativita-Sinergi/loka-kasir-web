import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import { ActionButton } from '@/components/ui/RowActions'
import PayrollSlipModal from '@/components/payroll/PayrollSlipModal'
import { getMyPayrollSlips, type PayrollSlip } from '@/api/payroll'
import { formatServerDate, periodText } from '@/components/payroll/payrollText'
import { formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'

const LIMIT = 20

/**
 * Gaji Saya — slip milik karyawan yang sedang masuk.
 *
 * Ada supaya notifikasi "gaji Anda sudah terbit" punya tujuan. Hanya memakai
 * `/payroll/my-slips`: endpoint gaji yang lain dijaga pemilik, dan detail slip
 * dibaca dari daftar ini — bukan dari `/slips/:id` yang akan ditolak.
 */
export default function MyPayrollPage() {
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<PayrollSlip | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['payroll-my-slips', page],
    queryFn: () => getMyPayrollSlips({ page, limit: LIMIT }).then(r => r.data),
  })
  const slips = data?.data ?? []
  const total = data?.pagination?.total ?? 0

  const columns = [
    {
      key: 'slip_number', label: t('payrollSlipNumber'),
      render: (row: PayrollSlip) => (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="blue">{t('payrollStageN', { n: row.stage })}</Badge>
          <span className="font-mono text-xs text-muted-foreground">{row.slip_number}</span>
        </div>
      ),
    },
    { key: 'period', label: t('payrollPeriod'), render: (row: PayrollSlip) => <span className="text-sm text-foreground">{periodText(row.period_start, row.period_end)}</span> },
    {
      key: 'due', label: t('payrollDueDate'),
      render: (row: PayrollSlip) => <span className="text-sm text-muted-foreground">{row.due_date ? t('payrollMyDue', { date: formatServerDate(row.due_date) }) : '—'}</span>,
    },
    { key: 'net_pay', label: t('payrollNetPay'), render: (row: PayrollSlip) => <span className="font-semibold tabular-nums text-foreground">{formatCurrency(row.net_pay)}</span> },
    {
      key: 'actions', label: t('labelAction'),
      render: (row: PayrollSlip) => <ActionButton variant="edit" onClick={() => setDetail(row)}>{t('payrollViewSlip')}</ActionButton>,
    },
  ]

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      <Header title={t('payrollMyTitle')} subtitle={t('payrollMySubtitle')} />
      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-5">
        <div className="bg-card rounded-2xl border border-border">
          <DataTable<PayrollSlip>
            columns={columns}
            data={slips}
            loading={isLoading}
            error={error}
            onRetry={refetch}
            onRowClick={setDetail}
            emptySlot={<EmptyState title={t('payrollMyEmpty')} />}
          />
          <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
        </div>
      </div>
      <PayrollSlipModal open={!!detail} onClose={() => setDetail(null)} slip={detail} />
    </div>
  )
}
