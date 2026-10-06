import type { PayrollStage, PayrollSummary } from '@/api/payroll'

/**
 * Hitungan murni di balik layar gaji — tanpa React, tanpa i18n — supaya bisa
 * diuji sendiri dan dipakai bersama oleh modal terbitkan, kartu rekap, dan
 * halaman slip.
 */

export interface PayrollPeriod {
  start: string
  end: string
  /** Hari kerja sebulan untuk karyawan bulanan; undefined = bawaan server. */
  expectedWorkDays?: number
}

/** Kunci query rekap — dipakai bersama tab Slip Gaji dan modal terbitkan supaya cache-nya satu. */
export const summaryQueryKey = (period: PayrollPeriod) =>
  ['payroll-summary', period.start, period.end, period.expectedWorkDays ?? 0] as const

/**
 * Tanggal server ("2026-09-01") menjadi Date LOKAL.
 *
 * `new Date('2026-09-01')` dibaca sebagai tengah malam UTC; di zona waktu
 * negatif ia jatuh ke 31 Agustus dan periode gaji bergeser sehari tanpa ada
 * yang menyadarinya. Bagian jam (bila ada) dibuang: yang dibaca pemilik adalah
 * tanggalnya.
 */
export function parseServerDate(raw: string | null | undefined): Date | null {
  if (!raw) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (!m) {
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/** "YYYY-MM-DD" dari Date lokal — bentuk yang diterima server. */
export function toServerDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Daftar tahap sebuah rekap.
 *
 * Server yang BELUM diperbarui tidak mengirim `stages` sama sekali — ia hanya
 * punya bentuk lama dua tahap (`first_stage_*` / `second_stage_*`). Bentuk lama
 * itu diterjemahkan ke dua tahap di sini supaya layarnya tetap bisa dipakai.
 */
export function summaryStages(summary: PayrollSummary): PayrollStage[] {
  if (Array.isArray(summary.stages)) return summary.stages
  const issued = new Set(summary.issued_stages ?? [])
  return [
    { stage: 1, pay: summary.first_stage_pay ?? 0, due: summary.first_stage_due ?? null, share: 50, issued: issued.has(1), is_last: false },
    { stage: 2, pay: summary.second_stage_pay ?? 0, due: summary.second_stage_due ?? null, share: 50, issued: issued.has(2), is_last: true },
  ]
}

export function stageAt(summary: PayrollSummary, stage: number): PayrollStage | undefined {
  return summaryStages(summary).find(s => s.stage === stage)
}

/** Nomor tahap terakhir; satu bila rekap datang tanpa tahap sama sekali. */
export function lastStageNumber(summary: PayrollSummary): number {
  const stages = summaryStages(summary)
  return stages.length ? stages[stages.length - 1].stage : 1
}

/** Hanya tahap TERAKHIR yang memuat potongan, bonus, dan uang hadir. */
export function isLastStage(summary: PayrollSummary, stage: number): boolean {
  return stageAt(summary, stage)?.is_last ?? stage === lastStageNumber(summary)
}

export function hasIssuedStage(summary: PayrollSummary, stage: number): boolean {
  return (summary.issued_stages ?? []).includes(stage) || (stageAt(summary, stage)?.issued ?? false)
}

/** Tahap berikutnya yang belum terbit, atau null bila semuanya sudah. */
export function nextStage(summary: PayrollSummary): number | null {
  for (const s of summaryStages(summary)) {
    if (!hasIssuedStage(summary, s.stage)) return s.stage
  }
  return null
}

/** Seluruh tahap periode ini sudah terbit slipnya. */
export function isFullyIssued(summary: PayrollSummary): boolean {
  return nextStage(summary) === null
}

/**
 * Bagian gaji pokok yang jatuh pada sebuah tahap.
 *
 * Tahap terakhir menerima SISANYA, bukan hasil perkaliannya sendiri: tiga tahap
 * dari gaji 2.000.000 masing-masing dibulatkan ke 666.667, dan menjumlahkan
 * ketiganya melahirkan seribu rupiah yang tidak ada asalnya. Aturan yang sama
 * dipegang server di PayrollStageConfig.SplitBasePay.
 */
export function stageBasePay(summary: PayrollSummary, stage: number): number {
  if (!isLastStage(summary, stage)) return stageAt(summary, stage)?.pay ?? 0
  const earlier = summaryStages(summary)
    .filter(s => !s.is_last)
    .reduce((sum, s) => sum + s.pay, 0)
  return Math.max(0, summary.base_pay - earlier)
}

export interface IssueExtras {
  bonus: number
  allowance: number
  otherDeduction: number
}

/**
 * Gaji bersih yang akan tertulis di slip untuk sebuah tahap.
 *
 * Tahap awal hanya membawa bagian gaji pokoknya. Tahap terakhir memikul
 * seluruh sisanya — lembur, uang hadir, komponen, bonus, tunjangan — dikurangi
 * seluruh potongan periode itu. Dijepit di nol: gaji bersih negatif bukan
 * tagihan kepada karyawan.
 */
export function issueNetPay(summary: PayrollSummary, stage: number, extras: IssueExtras): number {
  const base = stageBasePay(summary, stage)
  if (!isLastStage(summary, stage)) return base
  const net = base
    + summary.overtime_pay
    + summary.attendance_allowance
    + summary.component_earnings
    + extras.bonus
    + extras.allowance
    - summary.absence_deduction
    - summary.late_deduction
    - summary.component_deductions
    - extras.otherDeduction
  return Math.max(0, net)
}

/** Angka yang diketik pemilik, kadang dengan pemisah ribuan; yang bukan digit dibuang. */
export function parseMoneyInput(text: string): number {
  const digits = text.replace(/[^0-9]/g, '')
  return digits ? Number(digits) : 0
}

/**
 * Persen tiap tahap saat jumlah tahap berubah.
 *
 * Yang baru diisi rata supaya pemilik tinggal membetulkan angkanya, bukan
 * mengetik ulang semuanya; yang sudah diketik dipertahankan bila bukan bagi
 * rata.
 */
export function sharesForCount(count: number, shares: number[], equalSplit: boolean): number[] {
  const even = Math.round((100 / count) * 100) / 100
  return Array.from({ length: count }, (_, i) =>
    i < shares.length && !equalSplit ? shares[i] : even)
}

export function shareTotal(shares: number[]): number {
  return shares.reduce((sum, s) => sum + (Number.isFinite(s) ? s : 0), 0)
}

/** Persen yang jumlahnya bukan 100 ditahan di sini, bukan dibiarkan ditolak server. */
export function isShareTotalValid(shares: number[]): boolean {
  const total = shareTotal(shares)
  return total > 99.99 && total < 100.01
}
