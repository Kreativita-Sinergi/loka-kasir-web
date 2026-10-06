import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Printer, Trash2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import Badge from '@/components/ui/Badge'
import { getPayrollSlip, type PayrollLine, type PayrollSlip } from '@/api/payroll'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDateTime, getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'
import PayrollLineRows from './PayrollLineRows'
import {
  attendanceText, baseLabel, formatServerDate, formatWorkMinutes, lineAmountText, lineDetail, lineForfeitNote, periodText,
} from './payrollText'
import { HintBox, PayrollRow, SectionTitle } from './payrollUi'

interface Props {
  open: boolean
  onClose: () => void
  /** Slip yang sudah dipegang pemanggil, atau … */
  slip?: PayrollSlip | null
  /** … hanya nomornya — daftar rekap hanya membawa id-nya. */
  slipId?: string | null
  /** Pemilik: menampilkan tombol batalkan. Karyawan tidak mendapatkannya. */
  onCancelSlip?: (slip: PayrollSlip) => void
}

/**
 * Satu slip gaji yang sudah terbit, dengan tombol Cetak.
 *
 * Cetaknya memakai `window.print` di atas bagian khusus cetak yang dipasang
 * di body — bukan pustaka PDF — supaya pemilik bisa memakai printer yang sudah
 * ada di meja atau menyimpannya sebagai PDF dari dialog cetak peramban.
 */
export default function PayrollSlipModal({ open, onClose, slip, slipId, onCancelSlip }: Props) {
  const storeName = useAuthStore(s => s.user?.business?.business_name ?? '')
  const { data, isLoading, error } = useQuery({
    queryKey: ['payroll-slip', slipId],
    queryFn: () => getPayrollSlip(slipId!).then(r => r.data.data),
    enabled: open && !slip && !!slipId,
  })
  const current = slip ?? data ?? null

  return (
    <Modal open={open} onClose={onClose} title={t('payrollSlipDetailTitle')} size="md">
      {!current && isLoading && (
        <div className="space-y-3 py-6" aria-busy>
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-4 animate-pulse rounded bg-muted" />)}
        </div>
      )}
      {!current && !isLoading && (
        <p role="alert" className="py-8 text-center text-sm text-muted-foreground">
          {error ? getErrorMessage(error) : t('payrollSlipLoadFailed')}
        </p>
      )}
      {current && (
        <div className="space-y-2">
          <SlipBody slip={current} />
          <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
            {onCancelSlip && (
              <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={() => onCancelSlip(current)}>
                <Trash2 /> {t('payrollDeleteConfirm')}
              </Button>
            )}
            <PrintButton slip={current} storeName={storeName} />
          </div>
        </div>
      )}
    </Modal>
  )
}

/**
 * Tombol Cetak beserta lembar cetaknya.
 *
 * Lembar cetak baru dipasang di body saat tombol ditekan, lalu dilepas setelah
 * dialog cetak tertutup — supaya DOM tidak selamanya membawa salinan slip
 * tersembunyi. State-nya tinggal di sini, di dalam isi dialog, sehingga ikut
 * dibuang saat modal ditutup dan tidak tertinggal "sedang mencetak".
 */
function PrintButton({ slip, storeName }: { slip: PayrollSlip; storeName: string }) {
  const [printing, setPrinting] = useState(false)
  useEffect(() => {
    if (!printing) return
    const done = () => setPrinting(false)
    window.addEventListener('afterprint', done)
    const timer = window.setTimeout(() => window.print(), 50)
    return () => { window.clearTimeout(timer); window.removeEventListener('afterprint', done) }
  }, [printing])
  return (
    <>
      <Button type="button" onClick={() => setPrinting(true)} disabled={printing}>
        <Printer /> {t('payrollPrint')}
      </Button>
      {printing && createPortal(<SlipPrintSheet slip={slip} storeName={storeName} />, document.body)}
    </>
  )
}

/** Isi slip di layar — nama, periode, peringatan absensi, rekap, rincian, gaji bersih. */
export function SlipBody({ slip }: { slip: PayrollSlip }) {
  const stale = slip.attendance_edited_after
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg font-bold text-foreground">{slip.employee.name}</p>
          <p className="text-xs text-muted-foreground">{slip.slip_number} · {periodText(slip.period_start, slip.period_end)}</p>
          <p className="text-xs text-muted-foreground">{t('payrollIssuedOn', { when: formatDateTime(slip.issued_at) })}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="blue">{t('payrollStageN', { n: slip.stage })}</Badge>
          {slip.due_date && <Badge variant="gray">{t('payrollDueDate')}: {formatServerDate(slip.due_date)}</Badge>}
        </div>
      </div>

      {stale && (
        <div className="mt-3">
          <HintBox tone="warning">
            <span className="flex items-start gap-2"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{t('payrollStaleWarning')}</span>
          </HintBox>
        </div>
      )}

      <SectionTitle>{t('payrollAttendanceRecap')}</SectionTitle>
      <PayrollRow label={t('payrollAttendanceDescription')} value={attendanceText(slip)} />
      {slip.salary_type === 'BULANAN' && (
        <PayrollRow label={t('payrollAbsentDays')} value={t('payrollOfWorkDays', { absent: slip.absent_days, expected: slip.expected_work_days })} />
      )}
      <PayrollRow label={t('payrollWorkHours')} value={formatWorkMinutes(slip.work_minutes)} />
      {slip.overtime_minutes > 0 && <PayrollRow label={t('payrollOvertimeHours')} value={formatWorkMinutes(slip.overtime_minutes)} />}
      {slip.late_count > 0 && <PayrollRow label={t('payrollLate')} value={t('payrollLateValue', { count: slip.late_count, minutes: slip.late_minutes })} />}
      {slip.unpaid_leave_days > 0 && <PayrollRow label={t('payrollUnpaidLeave', { days: slip.unpaid_leave_days, quota: slip.paid_leave_per_month })} value="" />}

      <SectionTitle>{t('payrollBreakdown')}</SectionTitle>
      {moneyRows(slip).map(({ key, ...row }) => <PayrollRow key={key} {...row} />)}
      <PayrollLineRows lines={slip.lines} />
      {slip.other_deduction > 0 && <PayrollRow label={t('payrollOtherDeduction')} value={`-${formatCurrency(slip.other_deduction)}`} negative />}

      <div className="mt-2 border-t border-border pt-2">
        <PayrollRow label={t('payrollNetPay')} value={formatCurrency(slip.net_pay)} strong />
      </div>

      {slip.notes?.trim() && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground">{t('payrollNotes')}</p>
          <p className="whitespace-pre-wrap text-sm text-foreground">{slip.notes.trim()}</p>
        </div>
      )}
    </div>
  )
}

interface MoneyRow { key: string; label: string; value: string; negative?: boolean }

/** Baris uang SEBELUM komponen gaji — urutannya sama dengan slip di aplikasi. */
function moneyRows(slip: PayrollSlip): MoneyRow[] {
  const rows: MoneyRow[] = [{ key: 'base', label: baseLabel(slip.salary_type), value: formatCurrency(slip.base_pay) }]
  if (slip.attendance_allowance > 0) rows.push({ key: 'att', label: t('payrollAttendanceAllowance', { days: slip.present_days }), value: formatCurrency(slip.attendance_allowance) })
  if (slip.overtime_pay > 0) rows.push({ key: 'ot', label: t('payrollOvertimePay'), value: formatCurrency(slip.overtime_pay) })
  if (slip.allowance > 0) rows.push({ key: 'allow', label: t('payrollAllowance'), value: formatCurrency(slip.allowance) })
  // Bonus ikut dijumlahkan ke gaji bersih; tanpa barisnya slip tidak menjumlah
  // ke angkanya sendiri.
  if (slip.bonus > 0) rows.push({ key: 'bonus', label: t('payrollBonus'), value: formatCurrency(slip.bonus) })
  if (slip.absence_deduction > 0) rows.push({ key: 'abs', label: t('payrollAbsenceDeduction'), value: `-${formatCurrency(slip.absence_deduction)}`, negative: true })
  if (slip.late_deduction > 0) rows.push({ key: 'late', label: t('payrollLateDeduction'), value: `-${formatCurrency(slip.late_deduction)}`, negative: true })
  return rows
}

/**
 * Lembar cetak: dokumen hitam-putih yang hanya tampil saat mencetak.
 *
 * Seluruh anak body selain lembar ini disembunyikan oleh aturan @media print di
 * bawah — termasuk portal dialog Radix — jadi yang keluar dari printer hanya
 * slipnya, bukan dasbor di belakangnya.
 */
function SlipPrintSheet({ slip, storeName }: { slip: PayrollSlip; storeName: string }) {
  const money = moneyRows(slip)
  const lines: PayrollLine[] = slip.lines ?? []
  return (
    <div className="payroll-print-area">
      <style>{`
        @media screen { .payroll-print-area { display: none; } }
        @media print {
          @page { margin: 12mm; }
          body > :not(.payroll-print-area) { display: none !important; }
          .payroll-print-area { display: block !important; color: #000; background: #fff; font-family: system-ui, sans-serif; font-size: 12px; }
          .payroll-print-area table { width: 100%; border-collapse: collapse; }
          .payroll-print-area td { padding: 3px 0; vertical-align: top; }
          .payroll-print-area td:last-child { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
          .payroll-print-area .pp-sub { font-size: 11px; color: #444; }
          .payroll-print-area .pp-head { text-align: center; margin-bottom: 8px; }
          .payroll-print-area .pp-title { font-size: 16px; font-weight: 700; letter-spacing: 0.08em; }
          .payroll-print-area .pp-section { margin-top: 12px; padding-top: 6px; border-top: 1px solid #000; font-weight: 700; font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; }
          .payroll-print-area .pp-total td { border-top: 1px solid #000; padding-top: 6px; font-weight: 700; font-size: 14px; }
          .payroll-print-area .pp-footer { margin-top: 16px; text-align: center; font-size: 10px; color: #444; }
          .payroll-print-area .pp-note { font-size: 10px; color: #444; }
        }
      `}</style>
      <div className="pp-head">
        {storeName && <div style={{ fontWeight: 700, fontSize: 13 }}>{storeName.toUpperCase()}</div>}
        <div className="pp-title">{t('payrollSlipTitle')}</div>
      </div>
      <table>
        <tbody>
          <tr><td>{t('payrollSlipNumber')}</td><td>{slip.slip_number}</td></tr>
          <tr><td>{t('payrollEmployee')}</td><td>{slip.employee.name}</td></tr>
          {slip.employee.role && <tr><td>{t('payrollRole')}</td><td>{slip.employee.role}</td></tr>}
          {slip.outlet?.name && <tr><td>{t('payrollOutlet')}</td><td>{slip.outlet.name}</td></tr>}
          <tr><td>{t('payrollPeriod')}</td><td>{periodText(slip.period_start, slip.period_end)}</td></tr>
          <tr><td>{t('payrollStageN', { n: slip.stage })}</td><td>{slip.due_date ? formatServerDate(slip.due_date) : '—'}</td></tr>
          <tr><td>{t('payrollIssuedAt')}</td><td>{formatDateTime(slip.issued_at)}</td></tr>
        </tbody>
      </table>

      <div className="pp-section">{t('payrollAttendanceRecap')}</div>
      <table>
        <tbody>
          <tr><td>{t('payrollAttendanceDescription')}</td><td>{attendanceText(slip)}</td></tr>
          {slip.salary_type === 'BULANAN' && (
            <tr><td>{t('payrollAbsentDays')}</td><td>{t('payrollOfWorkDays', { absent: slip.absent_days, expected: slip.expected_work_days })}</td></tr>
          )}
          <tr><td>{t('payrollWorkHours')}</td><td>{formatWorkMinutes(slip.work_minutes)}</td></tr>
          {slip.overtime_minutes > 0 && <tr><td>{t('payrollOvertimeHours')}</td><td>{formatWorkMinutes(slip.overtime_minutes)}</td></tr>}
          {slip.late_count > 0 && <tr><td>{t('payrollLate')}</td><td>{t('payrollLateValue', { count: slip.late_count, minutes: slip.late_minutes })}</td></tr>}
        </tbody>
      </table>

      <div className="pp-section">{t('payrollBreakdown')}</div>
      <table>
        <tbody>
          {money.map(row => <tr key={row.key}><td>{row.label}</td><td>{row.value}</td></tr>)}
          {lines.map((line, index) => (
            <tr key={`${line.component_id ?? 'line'}-${index}`}>
              <td>
                {line.name}
                {lineDetail(line) && <div className="pp-sub">{lineDetail(line)}</div>}
                {lineForfeitNote(line) && <div className="pp-sub">{lineForfeitNote(line)}</div>}
              </td>
              <td>{lineAmountText(line)}</td>
            </tr>
          ))}
          {slip.other_deduction > 0 && <tr><td>{t('payrollOtherDeduction')}</td><td>-{formatCurrency(slip.other_deduction)}</td></tr>}
          <tr className="pp-total"><td>{t('payrollNetPay')}</td><td>{formatCurrency(slip.net_pay)}</td></tr>
        </tbody>
      </table>

      {slip.notes?.trim() && (
        <div style={{ marginTop: 10 }}>
          <div className="pp-note">{t('payrollNotes')}</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{slip.notes.trim()}</div>
        </div>
      )}
      <div className="pp-footer">{t('payrollSlipFooter')}</div>
    </div>
  )
}
