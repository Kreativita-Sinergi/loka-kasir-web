import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FileCheck2, FileClock, Plus, Users, Wallet } from 'lucide-react'
import { DataTable } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import StatCard from '@/components/ui/StatCard'
import EmptyState from '@/components/ui/EmptyState'
import SearchableSelect from '@/components/ui/SearchableSelect'
import NumericInput from '@/components/ui/NumericInput'
import { Button } from '@/components/ui/button'
import { ActionButton } from '@/components/ui/RowActions'
import { deletePayrollSlip, getPayrollSlips, getPayrollSummary, type PayrollSlip } from '@/api/payroll'
import { getEmployees } from '@/api/employees'
import { formatCurrency, formatDateTime, getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'
import PayrollIssueModal from './PayrollIssueModal'
import PayrollSlipModal from './PayrollSlipModal'
import { isFullyIssued, nextStage, summaryQueryKey, toServerDate, type PayrollPeriod } from './payrollCalc'
import { periodText } from './payrollText'
import { FieldLabel, inputClass } from './payrollUi'

const LIMIT = 20

/** Periode bawaan: tanggal 1 bulan ini sampai hari ini — sama dengan aplikasi. */
function defaultPeriod(): PayrollPeriod {
  const now = new Date()
  return { start: toServerDate(new Date(now.getFullYear(), now.getMonth(), 1)), end: toServerDate(now) }
}

/**
 * Tab Slip Gaji: rekap periode (dari absensi, dihitung ulang di server) di
 * atas, lalu slip yang sudah terbit — lihat, terbitkan, batalkan.
 */
export default function PayrollSlipsTab() {
  const qc = useQueryClient()
  const [period, setPeriod] = useState<PayrollPeriod>(defaultPeriod)
  const [workDays, setWorkDays] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [page, setPage] = useState(1)
  const [issueOpen, setIssueOpen] = useState(false)
  const [detail, setDetail] = useState<{ slip?: PayrollSlip; slipId?: string } | null>(null)
  const [cancelTarget, setCancelTarget] = useState<PayrollSlip | null>(null)

  const expectedWorkDays = parseInt(workDays, 10)
  const effectivePeriod: PayrollPeriod = {
    ...period,
    expectedWorkDays: expectedWorkDays >= 1 && expectedWorkDays <= 31 ? expectedWorkDays : undefined,
  }
  const periodValid = !!period.start && !!period.end && period.start <= period.end

  const { data: summaries = [], isLoading: summaryLoading } = useQuery({
    queryKey: summaryQueryKey(effectivePeriod),
    queryFn: () => getPayrollSummary({
      start_date: effectivePeriod.start, end_date: effectivePeriod.end, expected_work_days: effectivePeriod.expectedWorkDays,
    }).then(r => r.data.data ?? []),
    enabled: periodValid,
  })

  const slipParams = { page, limit: LIMIT, start_date: period.start, end_date: period.end, employee_id: employeeId }
  const { data: slipsRes, isLoading: slipsLoading, error: slipsError, refetch } = useQuery({
    queryKey: ['payroll-slips', slipParams],
    queryFn: () => getPayrollSlips(slipParams).then(r => r.data),
    enabled: periodValid,
  })
  const slips = slipsRes?.data ?? []
  const total = slipsRes?.pagination?.total ?? 0

  const { data: employeesRes } = useQuery({
    queryKey: ['employees-picker'],
    queryFn: () => getEmployees({ limit: 200 }).then(r => r.data),
  })
  const employeeOptions = (employeesRes?.data ?? []).map(e => ({ value: e.id, label: e.name }))

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePayrollSlip(id),
    onSuccess: () => {
      toast.success(t('payrollDeleted'))
      setCancelTarget(null)
      setDetail(null)
      qc.invalidateQueries({ queryKey: ['payroll-slips'] })
      qc.invalidateQueries({ queryKey: ['payroll-summary'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const changePeriod = (patch: Partial<PayrollPeriod>) => { setPeriod(p => ({ ...p, ...patch })); setPage(1) }

  // Rekap: siapa sudah terbit seluruh tahapnya, siapa baru sebagian.
  const fullyIssued = summaries.filter(isFullyIssued).length
  const partial = summaries.filter(s => !isFullyIssued(s) && (s.issued_stages?.length ?? 0) > 0).length
  const netTotal = summaries.reduce((sum, s) => sum + s.net_pay, 0)

  const columns = [
    {
      key: 'employee', label: t('payrollEmployee'),
      render: (row: PayrollSlip) => (
        <div>
          <p className="font-medium text-foreground">{row.employee.name}</p>
          <p className="text-xs text-muted-foreground">{row.employee.role || row.outlet?.name || ''}</p>
        </div>
      ),
    },
    { key: 'slip_number', label: t('payrollSlipNumber'), render: (row: PayrollSlip) => <span className="font-mono text-xs text-foreground">{row.slip_number}</span> },
    { key: 'period', label: t('payrollPeriod'), render: (row: PayrollSlip) => <span className="text-sm text-muted-foreground">{periodText(row.period_start, row.period_end)}</span> },
    { key: 'stage', label: t('payrollStageSettingTitle'), render: (row: PayrollSlip) => <Badge variant="blue">{t('payrollStageN', { n: row.stage })}</Badge> },
    { key: 'net_pay', label: t('payrollNetPay'), render: (row: PayrollSlip) => <span className="font-semibold tabular-nums text-foreground">{formatCurrency(row.net_pay)}</span> },
    { key: 'issued_at', label: t('payrollIssuedAt'), render: (row: PayrollSlip) => <span className="text-sm text-muted-foreground">{formatDateTime(row.issued_at)}</span> },
    {
      key: 'status', label: t('labelStatus'),
      render: (row: PayrollSlip) => row.attendance_edited_after
        ? <Badge variant="yellow">{t('payrollStatusStale')}</Badge>
        : <Badge variant="green">{t('payrollStatusIssued')}</Badge>,
    },
    {
      key: 'actions', label: t('labelAction'),
      render: (row: PayrollSlip) => (
        <div className="flex items-center gap-1">
          <ActionButton variant="edit" onClick={() => setDetail({ slip: row })}>{t('payrollViewSlip')}</ActionButton>
          <ActionButton variant="delete" onClick={() => setCancelTarget(row)}>{t('payrollDeleteConfirm')}</ActionButton>
        </div>
      ),
    },
  ]

  return (
    <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-5">
      <div className="bg-card rounded-2xl border border-border p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <FieldLabel htmlFor="payroll-start">{t('payrollPeriodStart')}</FieldLabel>
          <input id="payroll-start" type="date" value={period.start} max={period.end || undefined} onChange={e => changePeriod({ start: e.target.value })} className={inputClass} />
        </div>
        <div>
          <FieldLabel htmlFor="payroll-end">{t('payrollPeriodEnd')}</FieldLabel>
          <input id="payroll-end" type="date" value={period.end} min={period.start || undefined} onChange={e => changePeriod({ end: e.target.value })} className={inputClass} />
        </div>
        <div>
          <FieldLabel>{t('payrollEmployee')}</FieldLabel>
          <SearchableSelect value={employeeId} onChange={id => { setEmployeeId(id); setPage(1) }} options={employeeOptions} placeholder={t('payrollAllEmployees')} />
        </div>
        <div>
          <FieldLabel htmlFor="payroll-workdays" hint={t('payrollWorkDaysShortHint')}>{t('payrollWorkDaysTitle')}</FieldLabel>
          <NumericInput id="payroll-workdays" min="1" max="31" step="1" value={workDays} onChange={e => setWorkDays(e.target.value)}
            placeholder={t('payrollWorkDaysAuto')} title={t('payrollWorkDaysHint')} className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title={t('payrollStatEmployees')} value={summaries.length} icon={<Users />} color="blue" loading={summaryLoading} />
        <StatCard title={t('payrollStatNetTotal')} value={formatCurrency(netTotal)} icon={<Wallet />} color="green" emphasis loading={summaryLoading} subtitle={t('payrollStatPeriodHint')} />
        <StatCard title={t('payrollStatIssued')} value={fullyIssued} icon={<FileCheck2 />} color="purple" loading={summaryLoading}
          subtitle={partial > 0 ? t('payrollStatPartial', { count: partial }) : undefined} />
        <StatCard title={t('payrollStatPending')} value={summaries.length - fullyIssued} icon={<FileClock />} color="orange" loading={summaryLoading} />
      </div>

      <div className="bg-card rounded-2xl border border-border">
        <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-foreground">{t('payrollTabSlips')}</span>
          <span className="text-xs text-muted-foreground">{t('payrollSlipCount', { count: total })}</span>
          <Button type="button" className="ml-auto" onClick={() => setIssueOpen(true)} disabled={!periodValid}>
            <Plus /> {t('payrollIssueNew')}
          </Button>
        </div>
        <DataTable<PayrollSlip>
          columns={columns}
          data={slips}
          loading={slipsLoading}
          error={slipsError}
          onRetry={refetch}
          onRowClick={row => setDetail({ slip: row })}
          emptySlot={
            <EmptyState
              title={t('payrollNoSlipTitle')}
              description={t('payrollNoSlipHint')}
              action={periodValid ? { label: t('payrollIssueNew'), icon: <Plus size={14} />, onClick: () => setIssueOpen(true) } : undefined}
            />
          }
        />
        <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
      </div>

      {issueOpen && (
        <PayrollIssueModal
          period={effectivePeriod}
          initialEmployeeId={employeeId && summaries.some(s => s.employee.id === employeeId && nextStage(s) !== null) ? employeeId : undefined}
          onClose={() => setIssueOpen(false)}
          onIssued={slip => { setIssueOpen(false); setDetail({ slip }) }}
        />
      )}

      <PayrollSlipModal
        open={!!detail}
        onClose={() => setDetail(null)}
        slip={detail?.slip}
        slipId={detail?.slipId}
        onCancelSlip={slip => setCancelTarget(slip)}
      />

      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title={t('payrollDeleteTitle')} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('payrollDeleteBody', { number: cancelTarget?.slip_number ?? '' })}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCancelTarget(null)}>{t('actionCancel')}</Button>
            <Button type="button" variant="destructive" disabled={deleteMut.isPending} onClick={() => cancelTarget && deleteMut.mutate(cancelTarget.id)}>
              {deleteMut.isPending ? t('actionDeleting') : t('payrollDeleteConfirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
