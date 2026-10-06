import { describe, expect, it } from 'vitest'
import type { PayrollSummary } from '@/api/payroll'
import {
  isShareTotalValid, issueNetPay, nextStage, parseServerDate, sharesForCount, stageBasePay, summaryStages,
} from './payrollCalc'

/**
 * Rekap tiga tahap dari gaji pokok 2.000.000: server membagi 666.667 + 666.667
 * dan menyisakan 666.666 untuk tahap terakhir.
 */
function summary(partial: Partial<PayrollSummary> = {}): PayrollSummary {
  return {
    employee: { id: 'e1', name: 'Riki', role: 'Kasir' },
    period_start: '2026-09-01', period_end: '2026-09-30', join_date: null,
    salary_type: 'BULANAN', salary_amount: 2_000_000, overtime_rate: 0,
    late_penalty_per_minute: 0, absence_penalty_per_day: 0, late_penalty_per_occurrence: 0,
    attendance_allowance_per_day: 0, paid_leave_per_month: 0,
    expected_work_days: 26, present_days: 24, absent_days: 2, work_minutes: 0, overtime_minutes: 0,
    late_count: 0, late_minutes: 0, late_days: 0, leave_days: 0, unpaid_leave_days: 0, sick_days: 0, permit_days: 0,
    base_pay: 2_000_000, overtime_pay: 100_000, attendance_allowance: 240_000,
    absence_deduction: 150_000, late_deduction: 20_000,
    component_earnings: 300_000, component_deductions: 50_000, net_pay: 2_420_000, lines: [],
    stages: [
      { stage: 1, pay: 666_667, due: null, share: 33.33, issued: false, is_last: false },
      { stage: 2, pay: 666_667, due: null, share: 33.33, issued: false, is_last: false },
      { stage: 3, pay: 1_086_666, due: null, share: 33.34, issued: false, is_last: true },
    ],
    first_stage_due: null, second_stage_due: null, first_stage_pay: 0, second_stage_pay: 0,
    issued_stages: [], slip_id: null, slip_number: null,
    ...partial,
  }
}

describe('stageBasePay', () => {
  it('tahap awal memakai bagiannya sendiri, tahap terakhir menerima sisanya', () => {
    const s = summary()
    expect(stageBasePay(s, 1)).toBe(666_667)
    expect(stageBasePay(s, 3)).toBe(2_000_000 - 666_667 * 2)
    // Jumlah seluruh tahap WAJIB sama dengan gaji pokoknya.
    expect(stageBasePay(s, 1) + stageBasePay(s, 2) + stageBasePay(s, 3)).toBe(2_000_000)
  })
})

describe('issueNetPay', () => {
  const extras = { bonus: 50_000, allowance: 25_000, otherDeduction: 10_000 }

  it('tahap awal hanya membawa gaji pokoknya — tanpa potongan, bonus, atau uang hadir', () => {
    expect(issueNetPay(summary(), 1, extras)).toBe(666_667)
  })

  it('tahap terakhir memikul seluruh sisanya', () => {
    const net = 666_666 + 100_000 + 240_000 + 300_000 + 50_000 + 25_000
      - 150_000 - 20_000 - 50_000 - 10_000
    expect(issueNetPay(summary(), 3, extras)).toBe(net)
  })

  it('dijepit di nol bila potongannya melebihi haknya', () => {
    const s = summary({ absence_deduction: 5_000_000 })
    expect(issueNetPay(s, 3, extras)).toBe(0)
  })
})

describe('summaryStages & nextStage', () => {
  it('menerjemahkan bentuk lama dua tahap dari server yang belum diperbarui', () => {
    const s = summary({ stages: undefined, first_stage_pay: 1_000_000, second_stage_pay: 1_420_000, issued_stages: [1] })
    const stages = summaryStages(s)
    expect(stages.map(x => x.stage)).toEqual([1, 2])
    expect(stages[1].is_last).toBe(true)
    expect(nextStage(s)).toBe(2)
  })

  it('null bila semua tahap sudah terbit', () => {
    expect(nextStage(summary({ issued_stages: [1, 2, 3] }))).toBeNull()
  })
})

describe('parseServerDate', () => {
  it('membaca tanggal server sebagai tanggal lokal, bukan UTC', () => {
    const d = parseServerDate('2026-09-01')!
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 8, 1])
  })
})

describe('tahapan gaji', () => {
  it('menambah tahap mengisi persen baru rata dan mempertahankan yang diketik', () => {
    expect(sharesForCount(3, [70, 30], false)).toEqual([70, 30, 33.33])
    expect(sharesForCount(2, [70, 30], true)).toEqual([50, 50])
  })

  it('jumlah persen harus tepat 100', () => {
    expect(isShareTotalValid([40, 30, 20])).toBe(false)
    expect(isShareTotalValid([33.33, 33.33, 33.34])).toBe(true)
  })
})
