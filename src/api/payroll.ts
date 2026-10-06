import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse } from '@/types'

/**
 * Penggajian — cermin `features/payroll` di aplikasi kasir.
 *
 * Seluruh endpoint di bawah /payroll dijaga pemilik + paket Pro, kecuali
 * `/my-slips` yang boleh dipanggil karyawan mana pun: slip gaji menyebut upah
 * seseorang, dan karyawan hanya boleh membaca miliknya sendiri — servernya yang
 * mengambil identitasnya dari token, bukan dari parameter.
 */

// ─── Dasar gaji ──────────────────────────────────────────────────────────────

/** Dasar gaji karyawan; `NONE` berarti tidak digaji lewat aplikasi. */
export type SalaryType = 'NONE' | 'HARIAN' | 'BULANAN' | 'JAM'

export interface PayrollEmployee {
  id: string
  name: string
  role: string
}

// ─── Komponen gaji ───────────────────────────────────────────────────────────

export type PayrollComponentKind = 'EARNING' | 'DEDUCTION'

/** Satuan yang dikalikan dengan nominal komponen. */
export type PayrollComponentBasis =
  | 'FIXED'
  | 'PER_PRESENT_DAY'
  | 'PER_WORK_HOUR'
  | 'PER_OVERTIME_HOUR'
  | 'PER_LATE'
  | 'PER_LATE_MINUTE'
  | 'PER_ABSENT_DAY'
  | 'PERCENT_OF_BASE'

export const PAYROLL_COMPONENT_BASES: PayrollComponentBasis[] = [
  'FIXED', 'PER_PRESENT_DAY', 'PER_WORK_HOUR', 'PER_OVERTIME_HOUR',
  'PER_LATE', 'PER_LATE_MINUTE', 'PER_ABSENT_DAY', 'PERCENT_OF_BASE',
]

/** Apa yang terjadi pada sebuah pendapatan ketika karyawannya terlambat. */
export type LateForfeitRule = 'NONE' | 'DAY' | 'PERIOD'

/** Alasan sebuah baris komponen tidak dibayar penuh. */
export type PayrollForfeitReason = '' | 'LATE_DAY' | 'LATE_PERIOD' | 'ABSENT' | 'MIN_PRESENT' | 'CAPPED'

export interface PayrollComponentEmployee {
  employee_id: string
  /** null = memakai nominal komponennya. */
  amount: number | null
  /** false mengecualikan dari komponen "semua"; true memasukkan ke "terpilih". */
  enabled: boolean
}

export interface PayrollComponent {
  id: string
  name: string
  kind: PayrollComponentKind
  basis: PayrollComponentBasis
  /** Rupiah per satuan basis, atau PERSEN untuk PERCENT_OF_BASE. */
  amount: number
  late_rule: LateForfeitRule
  late_threshold: number
  absent_threshold: number
  min_present_days: number
  /** 0 = tanpa batas. */
  max_amount: number
  applies_to_all: boolean
  sort_order: number
  is_active: boolean
  employees: PayrollComponentEmployee[]
}

/** Berapa karyawan yang masih memakai aturan lama di baris karyawannya. */
export interface PayrollLegacyRules {
  attendance_allowance_employees: number
  late_per_occurrence_employees: number
  late_per_minute_employees: number
  forfeit_on_late: boolean
}

export interface PayrollComponentList {
  components: PayrollComponent[]
  legacy: PayrollLegacyRules
  max_components: number
}

export interface PayrollComponentPayload {
  name: string
  kind: PayrollComponentKind
  basis: PayrollComponentBasis
  amount: number
  late_rule: LateForfeitRule
  late_threshold: number
  absent_threshold: number
  min_present_days: number
  max_amount: number
  applies_to_all: boolean
  is_active: boolean
  employees: PayrollComponentEmployee[]
}

/** Satu baris komponen di rekap atau slip — dibekukan bersama slipnya. */
export interface PayrollLine {
  component_id: string | null
  name: string
  kind: PayrollComponentKind
  basis: PayrollComponentBasis
  /** Hari, jam, kali, menit, atau 1 — atau gaji pokok untuk persen. */
  quantity: number
  rate: number
  amount: number
  forfeited_amount: number
  forfeit_reason: PayrollForfeitReason
  forfeit_count: number
}

// ─── Tahapan ─────────────────────────────────────────────────────────────────

export interface PayrollStage {
  stage: number
  /** YYYY-MM-DD; null bila tanggal masuk kerja karyawan belum diisi. */
  due: string | null
  pay: number
  /** Bagian gaji pokok tahap ini dalam persen. */
  share: number
  issued: boolean
  /** Tahap terakhir memikul seluruh potongan, bonus, dan uang hadir. */
  is_last: boolean
}

export interface PayrollStageSetting {
  payroll_stage_count: number
  payroll_stage_gap_days: number
  /** Selalu terisi dari server, meski tersimpan kosong (= bagi rata). */
  payroll_stage_shares: number[]
  is_equal_split: boolean
  min_stage_count: number
  max_stage_count: number
  max_gap_days: number
}

export interface PayrollStageSettingPayload {
  payroll_stage_count: number
  payroll_stage_gap_days: number
  /** Tidak dikirim untuk pembagian rata. */
  payroll_stage_shares?: number[]
}

// ─── Rekap & slip ────────────────────────────────────────────────────────────

/** Hitungan gaji yang BELUM diterbitkan — dihitung ulang tiap kali diminta. */
export interface PayrollSummary {
  employee: PayrollEmployee
  period_start: string
  period_end: string
  join_date: string | null
  salary_type: SalaryType
  salary_amount: number
  overtime_rate: number
  late_penalty_per_minute: number
  absence_penalty_per_day: number
  late_penalty_per_occurrence: number
  attendance_allowance_per_day: number
  paid_leave_per_month: number
  expected_work_days: number
  present_days: number
  absent_days: number
  work_minutes: number
  overtime_minutes: number
  late_count: number
  late_minutes: number
  late_days: number
  leave_days: number
  unpaid_leave_days: number
  sick_days: number
  permit_days: number
  base_pay: number
  overtime_pay: number
  attendance_allowance: number
  absence_deduction: number
  late_deduction: number
  component_earnings: number
  component_deductions: number
  net_pay: number
  lines: PayrollLine[]
  /** Server lama tidak mengirimnya; lihat `summaryStages`. */
  stages?: PayrollStage[]
  first_stage_due: string | null
  second_stage_due: string | null
  first_stage_pay: number
  second_stage_pay: number
  issued_stages: number[] | null
  slip_id: string | null
  slip_number: string | null
}

/** Slip yang sudah terbit — angkanya beku. */
export interface PayrollSlip {
  id: string
  slip_number: string
  employee: PayrollEmployee
  outlet: { id?: string; name: string } | null
  period_start: string
  period_end: string
  salary_type: SalaryType
  salary_amount: number
  overtime_rate: number
  late_penalty_per_minute: number
  absence_penalty_per_day: number
  late_penalty_per_occurrence: number
  attendance_allowance_per_day: number
  paid_leave_per_month: number
  stage: number
  due_date: string | null
  expected_work_days: number
  present_days: number
  absent_days: number
  work_minutes: number
  overtime_minutes: number
  late_count: number
  late_minutes: number
  leave_days: number
  unpaid_leave_days: number
  sick_days: number
  permit_days: number
  /** Bagian TAHAP INI, bukan gaji pokok sebulan. */
  base_pay: number
  overtime_pay: number
  attendance_allowance: number
  bonus: number
  absence_deduction: number
  late_deduction: number
  allowance: number
  other_deduction: number
  component_earnings: number
  component_deductions: number
  net_pay: number
  lines: PayrollLine[] | null
  notes: string | null
  issued_at: string
  /** Absensi periode ini dikoreksi SETELAH slip terbit; angkanya tetap beku. */
  attendance_edited_after: boolean
}

export interface PayrollPeriodParams {
  start_date: string
  end_date: string
  employee_id?: string
  /** Hanya untuk karyawan bulanan; 0/kosong = bawaan server. */
  expected_work_days?: number
}

export interface PayrollSlipFilterParams {
  page?: number
  limit?: number
  start_date?: string
  end_date?: string
  employee_id?: string
}

export interface PayrollIssuePayload {
  employee_id_uuid: string
  start_date: string
  end_date: string
  expected_work_days?: number
  outlet_id?: string
  allowance: number
  other_deduction: number
  bonus: number
  stage: number
  notes?: string
}

/** Membuang parameter kosong supaya server tidak menerima `employee_id=`. */
function clean<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null && v !== 0),
  ) as Partial<T>
}

// ─── Panggilan ───────────────────────────────────────────────────────────────

export const getPayrollSummary = (params: PayrollPeriodParams) =>
  api.get<ApiResponse<PayrollSummary[]>>('/payroll/summary', { params: clean(params) })

export const getPayrollSlips = (params: PayrollSlipFilterParams) =>
  api.get<PaginatedApiResponse<PayrollSlip>>('/payroll/slips', { params: clean(params) })

export const getPayrollSlip = (id: string) =>
  api.get<ApiResponse<PayrollSlip>>(`/payroll/slips/${id}`)

export const issuePayrollSlip = (data: PayrollIssuePayload) =>
  api.post<ApiResponse<PayrollSlip>>('/payroll/slips', data)

/** Membatalkan slip MEMBUANG barisnya, sehingga periodenya terbuka lagi. */
export const deletePayrollSlip = (id: string) =>
  api.delete<ApiResponse<unknown>>(`/payroll/slips/${id}`)

/** Slip milik karyawan yang sedang masuk — tanpa employee_id, diambil dari token. */
export const getMyPayrollSlips = (params: { page?: number; limit?: number }) =>
  api.get<PaginatedApiResponse<PayrollSlip>>('/payroll/my-slips', { params })

export const getPayrollStageSettings = () =>
  api.get<ApiResponse<PayrollStageSetting>>('/payroll/stage-settings')

export const updatePayrollStageSettings = (data: PayrollStageSettingPayload) =>
  api.put<ApiResponse<PayrollStageSetting>>('/payroll/stage-settings', data)

export const getPayrollComponents = () =>
  api.get<ApiResponse<PayrollComponentList>>('/payroll/components')

export const createPayrollComponent = (data: PayrollComponentPayload) =>
  api.post<ApiResponse<PayrollComponent>>('/payroll/components', data)

export const updatePayrollComponent = (id: string, data: PayrollComponentPayload) =>
  api.put<ApiResponse<PayrollComponent>>(`/payroll/components/${id}`, data)

export const deletePayrollComponent = (id: string) =>
  api.delete<ApiResponse<unknown>>(`/payroll/components/${id}`)

/** Memindahkan uang hadir & denda telat per karyawan menjadi komponen gaji. */
export const convertLegacyPayrollComponents = () =>
  api.post<ApiResponse<PayrollComponentList>>('/payroll/components/convert-legacy')
