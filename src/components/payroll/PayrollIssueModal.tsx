import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Form from '@/components/ui/Form'
import NumericInput from '@/components/ui/NumericInput'
import SearchableSelect from '@/components/ui/SearchableSelect'
import QueryErrorState from '@/components/ui/QueryErrorState'
import { Button } from '@/components/ui/button'
import { getPayrollSummary, issuePayrollSlip, type PayrollSlip, type PayrollSummary } from '@/api/payroll'
import { formatCurrency, getErrorMessage, cn } from '@/lib/utils'
import { t } from '@/lib/i18n'
import {
  hasIssuedStage, isFullyIssued, isLastStage, issueNetPay, lastStageNumber, nextStage, parseMoneyInput, stageAt,
  stageBasePay, summaryQueryKey, summaryStages, type PayrollPeriod,
} from './payrollCalc'
import { formatServerDate, formatShare, formatWorkMinutes, periodText, salaryBasisText } from './payrollText'
import PayrollLineRows from './PayrollLineRows'
import { FieldLabel, PayrollRow, inputClass } from './payrollUi'

interface Props {
  onClose: () => void
  period: PayrollPeriod
  initialEmployeeId?: string
  onIssued: (slip: PayrollSlip) => void
}

/**
 * Pratinjau hitungan gaji satu karyawan untuk sebuah tahap, isian tambahan di
 * luar absensi, lalu tombol terbitkan. Cermin `payroll_issue_sheet.dart`.
 *
 * Dipasang hanya saat terbuka (pemanggil merender `{open && <…/>}`), sehingga
 * seluruh isiannya mulai dari kosong setiap kali dibuka.
 */
export default function PayrollIssueModal({ onClose, period, initialEmployeeId, onIssued }: Props) {
  const qc = useQueryClient()
  const { data: summaries = [], isLoading, error, refetch } = useQuery({
    queryKey: summaryQueryKey(period),
    queryFn: () => getPayrollSummary({
      start_date: period.start, end_date: period.end, expected_work_days: period.expectedWorkDays,
    }).then(r => r.data.data ?? []),
  })

  const [employeeId, setEmployeeId] = useState(initialEmployeeId ?? '')
  // null = ikuti tahap berikutnya yang belum terbit; pemilik hampir tidak pernah
  // ingin menerbitkan tahap yang sudah dibayar.
  const [stageChoice, setStageChoice] = useState<number | null>(null)
  const [bonus, setBonus] = useState('')
  const [allowance, setAllowance] = useState('')
  const [deduction, setDeduction] = useState('')
  const [notes, setNotes] = useState('')

  const summary = summaries.find(s => s.employee.id === employeeId) ?? null
  const stage = summary ? (stageChoice ?? nextStage(summary) ?? lastStageNumber(summary)) : 1
  const last = summary ? isLastStage(summary, stage) : true
  const extras = {
    bonus: last ? parseMoneyInput(bonus) : 0,
    allowance: last ? parseMoneyInput(allowance) : 0,
    otherDeduction: last ? parseMoneyInput(deduction) : 0,
  }
  const net = summary ? issueNetPay(summary, stage, extras) : 0

  const issueMut = useMutation({
    mutationFn: () => issuePayrollSlip({
      employee_id_uuid: employeeId,
      start_date: period.start,
      end_date: period.end,
      expected_work_days: period.expectedWorkDays || undefined,
      allowance: extras.allowance,
      other_deduction: extras.otherDeduction,
      bonus: extras.bonus,
      stage,
      notes: notes.trim() || undefined,
    }).then(r => r.data.data),
    onSuccess: (slip) => {
      toast.success(t('payrollIssued'))
      // Rekap dan riwayat slip ikut basi begitu satu slip terbit.
      qc.invalidateQueries({ queryKey: ['payroll-summary'] })
      qc.invalidateQueries({ queryKey: ['payroll-slips'] })
      onIssued(slip)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const options = summaries.map(s => ({
    value: s.employee.id,
    label: s.employee.name,
    hint: isFullyIssued(s) ? t('payrollIssuedBadge') : salaryBasisText(s),
  }))

  return (
    <Modal open onClose={onClose} title={t('payrollIssueSlip')} size="md">
      <Form onSubmit={e => { e.preventDefault(); if (summary) issueMut.mutate() }} className="space-y-4">
        <p className="text-xs text-muted-foreground">{t('payrollPeriod')}: <span className="font-semibold text-foreground">{periodText(period.start, period.end)}</span></p>

        <QueryErrorState error={error} onRetry={refetch} />

        <div>
          <FieldLabel required>{t('payrollEmployee')}</FieldLabel>
          {isLoading ? (
            <div className="h-11 animate-pulse rounded-xl bg-muted" />
          ) : summaries.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{t('payrollEmptyTitle')}</span> — {t('payrollEmptyHint')}
            </p>
          ) : (
            <SearchableSelect
              value={employeeId}
              onChange={id => { setEmployeeId(id); setStageChoice(null) }}
              options={options}
              placeholder={t('payrollPickEmployee')}
            />
          )}
        </div>

        {summary && (
          <>
            <AttendanceStats summary={summary} />
            <StagePicker summary={summary} stage={stage} onChange={setStageChoice} />

            <div className="rounded-xl border border-border px-3 py-2">
              <PayrollRow
                label={last ? t('payrollBasePayRest') : t('payrollBasePayShare', { share: formatShare(stageAt(summary, stage)?.share ?? 0) })}
                value={formatCurrency(stageBasePay(summary, stage))}
              />
              {/* Tahap-tahap awal berhenti di sini dengan sengaja: seluruh
                  potongan periode ini jatuh di tahap terakhir, ketika jumlah
                  hari bolos dan terlambatnya sudah diketahui. */}
              {last && (
                <>
                  {summary.overtime_pay > 0 && <PayrollRow label={t('payrollOvertimePay')} value={formatCurrency(summary.overtime_pay)} />}
                  {summary.attendance_allowance > 0 && <PayrollRow label={t('payrollAttendanceAllowance', { days: summary.present_days })} value={formatCurrency(summary.attendance_allowance)} />}
                  {summary.absence_deduction > 0 && <PayrollRow label={t('payrollAbsenceDeduction')} value={`-${formatCurrency(summary.absence_deduction)}`} negative />}
                  {summary.late_deduction > 0 && <PayrollRow label={t('payrollLateDeduction')} value={`-${formatCurrency(summary.late_deduction)}`} negative />}
                  <PayrollLineRows lines={summary.lines} />
                  {summary.unpaid_leave_days > 0 && (
                    <PayrollRow label={t('payrollUnpaidLeave', { days: summary.unpaid_leave_days, quota: summary.paid_leave_per_month })} value="" />
                  )}
                </>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">{t('payrollExtraSection')}</p>
              <p className="text-xs text-muted-foreground">{last ? t('payrollExtraHint') : t('payrollEarlyStageHint', { n: stage })}</p>
            </div>
            {/* Bonus, tunjangan, dan potongan lain hanya ada di tahap terakhir.
                Menampilkannya di tahap awal mengundang pemilik mengetikkan angka
                yang akan diabaikan server. */}
            {last && (
              <div className="grid gap-3 sm:grid-cols-3">
                <MoneyField label={t('payrollBonus')} value={bonus} onChange={setBonus} />
                <MoneyField label={t('payrollAllowance')} value={allowance} onChange={setAllowance} />
                <MoneyField label={t('payrollOtherDeduction')} value={deduction} onChange={setDeduction} />
              </div>
            )}
            <div>
              <FieldLabel>{t('payrollNotes')}</FieldLabel>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={200} className={inputClass} />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-semibold text-foreground">{t('payrollNetPay')}</span>
              <span className="text-xl font-bold text-primary tabular-nums">{formatCurrency(net)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('payrollIssueWarning')}</p>
          </>
        )}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>{t('actionCancel')}</Button>
          <Button type="submit" disabled={!summary || issueMut.isPending}>
            {issueMut.isPending ? t('payrollIssuing') : t('payrollIssueSlip')}
          </Button>
        </div>
      </Form>
    </Modal>
  )
}

/** Empat angka absensi di balik hitungannya — supaya pemilik tahu asal gaji bersihnya. */
function AttendanceStats({ summary }: { summary: PayrollSummary }) {
  const stats = [
    { label: t('payrollPresentDays'), value: t('payrollDaysValue', { days: summary.present_days }) },
    { label: t('payrollWorkHours'), value: formatWorkMinutes(summary.work_minutes) },
    { label: t('payrollOvertimeHours'), value: formatWorkMinutes(summary.overtime_minutes) },
    { label: t('payrollLate'), value: t('payrollLateValue', { count: summary.late_count, minutes: summary.late_minutes }) },
  ]
  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">{salaryBasisText(summary)}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl bg-muted/50 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
            <p className="text-sm font-semibold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Pemilih tahap, lengkap dengan tanggal jatuh temponya — itulah yang dijanjikan
 * kepada karyawan. Tahap yang sudah terbit tetap bisa dipilih: servernya yang
 * menolak, dan penolakan itu perlu terbaca sebagai "sudah pernah".
 */
function StagePicker({ summary, stage, onChange }: { summary: PayrollSummary; stage: number; onChange: (n: number) => void }) {
  const stages = summaryStages(summary)
  // Satu tahap berarti tidak ada yang bisa dipilih.
  if (stages.length < 2) return null
  return (
    <div role="radiogroup" aria-label={t('payrollStageSettingTitle')} className="flex gap-2 overflow-x-auto pb-1">
      {stages.map(item => {
        const selected = item.stage === stage
        const issued = hasIssuedStage(summary, item.stage)
        return (
          <button
            key={item.stage}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(item.stage)}
            className={cn(
              'w-36 shrink-0 rounded-xl border px-3 py-2 text-left transition',
              selected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted',
            )}
          >
            <span className="flex items-center justify-between gap-1">
              <span className={cn('text-sm font-bold', selected ? 'text-primary' : 'text-foreground')}>{t('payrollStageN', { n: item.stage })}</span>
              {issued && <CheckCircle2 size={14} className="shrink-0 text-primary" aria-label={t('payrollIssuedBadge')} />}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {item.due ? formatServerDate(item.due) : t('payrollBasePayShare', { share: formatShare(item.share) })}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function MoneyField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <NumericInput min="0" step="1" value={value} onChange={e => onChange(e.target.value)} placeholder="0" className={inputClass} />
    </div>
  )
}
