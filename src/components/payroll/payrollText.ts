import type {
  PayrollComponent, PayrollComponentBasis, PayrollLine, PayrollSlip, PayrollSummary, SalaryType,
} from '@/api/payroll'
import { t } from '@/lib/i18n'
import type { MessageKey } from '@/lib/messages'
import { activeMoney } from '@/lib/money'
import { formatCurrency, formatDate } from '@/lib/utils'
import { parseServerDate } from './payrollCalc'

/**
 * Teks bersama untuk layar gaji — dipakai tabel komponen, modal terbitkan,
 * modal slip, dan cetakan supaya satu baris selalu terbaca sama di mana pun.
 * Cermin `payroll_component_texts.dart` di aplikasi kasir.
 */

const BASIS_KEYS: Record<PayrollComponentBasis, MessageKey> = {
  FIXED: 'payCompBasisFixed',
  PER_PRESENT_DAY: 'payCompBasisPerPresentDay',
  PER_WORK_HOUR: 'payCompBasisPerWorkHour',
  PER_OVERTIME_HOUR: 'payCompBasisPerOvertimeHour',
  PER_LATE: 'payCompBasisPerLate',
  PER_LATE_MINUTE: 'payCompBasisPerLateMinute',
  PER_ABSENT_DAY: 'payCompBasisPerAbsentDay',
  PERCENT_OF_BASE: 'payCompBasisPercentOfBase',
}

export function basisLabel(basis: PayrollComponentBasis): string {
  return t(BASIS_KEYS[basis] ?? 'payCompBasisFixed')
}

export const isPercentBasis = (basis: PayrollComponentBasis) => basis === 'PERCENT_OF_BASE'

function unitLabel(basis: PayrollComponentBasis): string | null {
  switch (basis) {
    case 'PER_PRESENT_DAY':
    case 'PER_ABSENT_DAY': return t('payCompUnitDay')
    case 'PER_WORK_HOUR':
    case 'PER_OVERTIME_HOUR': return t('payCompUnitHour')
    case 'PER_LATE': return t('payCompUnitTimes')
    case 'PER_LATE_MINUTE': return t('payCompUnitMinute')
    default: return null
  }
}

/** "1,5" dan bukan "1.5"; "28" dan bukan "28.00" — mengikuti bahasa aktif. */
export function formatPayrollNumber(value: number): string {
  return new Intl.NumberFormat(activeMoney().intlLocale, { maximumFractionDigits: 2 }).format(value)
}

/** Nominal sebuah komponen: "Rp15.000 · Per hari hadir" atau "1% · Persen dari gaji pokok". */
export function componentRateText(basis: PayrollComponentBasis, amount: number): string {
  const value = isPercentBasis(basis) ? `${formatPayrollNumber(amount)}%` : formatCurrency(amount)
  return `${value} · ${basisLabel(basis)}`
}

/** Ringkasan syarat sebuah komponen untuk daftar — kosong bila tidak ada. */
export function componentRuleTexts(c: PayrollComponent): string[] {
  const earning = c.kind === 'EARNING'
  const out: string[] = []
  if (earning && c.late_rule === 'DAY') out.push(t('payCompRuleLateDay'))
  if (earning && c.late_rule === 'PERIOD') out.push(t('payCompRuleLatePeriod', { count: c.late_threshold }))
  if (earning && c.absent_threshold > 0) out.push(t('payCompRuleAbsent', { count: c.absent_threshold }))
  if (earning && c.min_present_days > 0) out.push(t('payCompRuleMinPresent', { count: c.min_present_days }))
  if (c.max_amount > 0) out.push(t('payCompRuleMax', { amount: formatCurrency(c.max_amount) }))
  return out
}

/** Hitungan di balik sebuah baris: "28 hari × Rp15.000", "1% × Rp3.000.000". Null untuk komponen tetap. */
export function lineDetail(line: PayrollLine): string | null {
  if (line.basis === 'FIXED') return null
  if (isPercentBasis(line.basis)) return `${formatPayrollNumber(line.rate)}% × ${formatCurrency(line.quantity)}`
  const unit = unitLabel(line.basis)
  return `${formatPayrollNumber(line.quantity)} ${unit ?? ''} × ${formatCurrency(line.rate)}`.replace('  ', ' ')
}

/** Alasan sebuah baris tidak dibayar penuh, atau null. */
export function lineForfeitNote(line: PayrollLine): string | null {
  const amount = formatCurrency(line.forfeited_amount)
  const count = line.forfeit_count
  switch (line.forfeit_reason) {
    case 'LATE_DAY': return t('payCompForfeitLateDay', { count, amount })
    case 'LATE_PERIOD': return t('payCompForfeitLatePeriod', { count, amount })
    case 'ABSENT': return t('payCompForfeitAbsent', { count, amount })
    case 'MIN_PRESENT': return t('payCompForfeitMinPresent', { count, amount })
    case 'CAPPED': return t('payCompForfeitCapped', { amount })
    default: return null
  }
}

/** Nominal di kolom kanan: potongan bertanda minus. */
export function lineAmountText(line: PayrollLine): string {
  return line.kind === 'DEDUCTION' ? `-${formatCurrency(line.amount)}` : formatCurrency(line.amount)
}

/** "7j 30m" — jam dan menit; 450 menit tidak berarti apa-apa bagi yang menghitung hari kerjanya. */
export function formatWorkMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? t('payrollHoursOnly', { h }) : t('payrollHoursMinutes', { h, m })
}

/** Tanggal server ("2026-09-01") dalam bentuk yang dibaca orang ("01 Sep 2026"). */
export function formatServerDate(raw: string | null | undefined): string {
  const d = parseServerDate(raw)
  return d ? formatDate(d) : (raw ?? '')
}

export function periodText(start: string, end: string): string {
  return `${formatServerDate(start)} — ${formatServerDate(end)}`
}

/** Label gaji pokok menyebut dasarnya: "Upah harian" dan "Gaji pokok" dua hal berbeda bagi penerimanya. */
export function baseLabel(salaryType: SalaryType): string {
  switch (salaryType) {
    case 'HARIAN': return t('payrollBaseDaily')
    case 'JAM': return t('payrollBaseHourly')
    default: return t('payrollBaseMonthly')
  }
}

export function salaryBasisText(s: Pick<PayrollSummary, 'salary_type' | 'salary_amount'>): string {
  const amount = formatCurrency(s.salary_amount)
  switch (s.salary_type) {
    case 'HARIAN': return t('payrollBasisDaily', { amount })
    case 'BULANAN': return t('payrollBasisMonthly', { amount })
    case 'JAM': return t('payrollBasisHourly', { amount })
    default: return t('payrollBasisNone')
  }
}

/** Keterangan hadir: karyawan bulanan dibandingkan dengan hari kerja yang disepakati. */
export function attendanceText(s: Pick<PayrollSlip, 'salary_type' | 'present_days' | 'expected_work_days'>): string {
  return s.salary_type === 'BULANAN'
    ? t('payrollAttendancePresentOfWorkDays', { present: s.present_days, expected: s.expected_work_days })
    : t('payrollAttendancePresentDays', { present: s.present_days })
}

/** "33,33" dan bukan "33.33333333"; "50" dan bukan "50.0". */
export const formatShare = formatPayrollNumber
