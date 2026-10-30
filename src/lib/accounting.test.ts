import { beforeEach, describe, expect, it } from 'vitest'
import type { AccAccount, AccJournalEntry, AccProfitLoss, AccBalanceSheet, AccTrialBalance } from '@/api/accounting'
import { JOURNAL_SOURCES } from '@/api/accounting'
import {
  balanceSheetLines, buildAccountTree, changePercent, defaultNormalBalance, descendantIds, groupTrialBalance,
  journalCsvRows, journalDraftTotals, journalDrillDown, journalLinesPayload, ledgerCsvRows, mappableAccounts,
  profitLossLines, sourceLabel, statementCsvRows, trialBalanceCsvRows, type JournalDraftLine,
} from './accounting'
import { setActiveLocale, t } from './i18n'
import { PERMS } from '@/hooks/usePermissions'

beforeEach(() => setActiveLocale('id'))

const line = (accountId: string, debit = '', credit = '', memo = ''): JournalDraftLine => ({ key: Math.random().toString(), accountId, debit, credit, memo })

const account = (over: Partial<AccAccount>): AccAccount => ({
  id: 'x', code: '1', name: 'X', type: 'asset', normal_balance: 'debit', parent_id: null, is_group: false, is_system: false,
  is_active: true, cash_account_id: null, system_key: null, description: null, postable: true, balance: null, created_at: '', ...over,
})

describe('journalDraftTotals', () => {
  it('menunggu baris diisi', () => {
    expect(journalDraftTotals([line(''), line('')]).issue).toBe('empty')
    expect(journalDraftTotals([line('a', '100'), line('')]).issue).toBe('too_few_lines')
  })
  it('menolak baris tanpa perkiraan atau tanpa nilai', () => {
    expect(journalDraftTotals([line('a', '100'), line('', '', '100')]).issue).toBe('line_incomplete')
    expect(journalDraftTotals([line('a', '100'), line('b')]).issue).toBe('line_incomplete')
  })
  it('menolak baris yang berisi debit dan kredit sekaligus', () => {
    expect(journalDraftTotals([line('a', '100', '100'), line('b', '', '0')]).issue).toBe('line_both_sides')
  })
  it('menghitung selisih bila belum seimbang', () => {
    const totals = journalDraftTotals([line('a', '1000'), line('b', '', '400')])
    expect(totals.balanced).toBe(false)
    expect(totals.issue).toBe('unbalanced')
    expect(totals.difference).toBe(600)
  })
  it('seimbang sampai sen tanpa galat pecahan biner', () => {
    const totals = journalDraftTotals([line('a', '0.1'), line('b', '0.2'), line('c', '', '0.3')])
    expect(totals.balanced).toBe(true)
    expect(totals.debit).toBe(0.3)
    expect(totals.credit).toBe(0.3)
    expect(journalDraftTotals([line('a', '10,5'), line('b', '', '10.50')]).balanced).toBe(true)
  })
  it('mengabaikan baris kosong total', () => {
    const totals = journalDraftTotals([line('a', '500'), line(''), line('b', '', '500')])
    expect(totals.balanced).toBe(true)
    expect(totals.filledCount).toBe(2)
  })
})

describe('journalLinesPayload', () => {
  it('membuang baris kosong dan merapikan memo', () => {
    expect(journalLinesPayload([line('a', '1000', '', '  gaji '), line(''), line('b', '', '1000')])).toEqual([
      { account_id: 'a', debit: 1000, credit: 0, memo: 'gaji' },
      { account_id: 'b', debit: 0, credit: 1000, memo: null },
    ])
  })
})

describe('buildAccountTree', () => {
  it('mengelompokkan per jenis dengan induk sebelum anak, urut kode', () => {
    const groups = buildAccountTree([
      account({ id: 'e1', code: '6-1100', type: 'expense' }),
      account({ id: 'a2', code: '1-1200', parent_id: 'a0' }),
      account({ id: 'a0', code: '1-1000', is_group: true }),
      account({ id: 'a1', code: '1-1100', parent_id: 'a0' }),
      account({ id: 'orphan', code: '1-9000', parent_id: 'missing' }),
    ])
    expect(groups.map(g => g.type)).toEqual(['asset', 'expense'])
    expect(groups[0].rows.map(r => [r.account.id, r.level])).toEqual([['a0', 0], ['a1', 1], ['a2', 1], ['orphan', 0]])
  })
  it('descendantIds memuat seluruh turunan', () => {
    const list = [account({ id: 'p' }), account({ id: 'c', parent_id: 'p' }), account({ id: 'g', parent_id: 'c' }), account({ id: 'o' })]
    expect([...descendantIds(list, 'p')].sort()).toEqual(['c', 'g', 'p'])
  })
})

describe('aturan perkiraan', () => {
  it('saldo normal bawaan mengikuti jenis', () => {
    expect(defaultNormalBalance('asset')).toBe('debit')
    expect(defaultNormalBalance('other_expense')).toBe('debit')
    expect(defaultNormalBalance('revenue')).toBe('credit')
    expect(defaultNormalBalance('equity')).toBe('credit')
  })
  it('pemetaan: kembaran kas boleh, induk/nonaktif/laba berjalan/jenis lain tidak', () => {
    const list = [
      account({ id: 'cash', cash_account_id: 'ca', postable: false }),
      account({ id: 'group', is_group: true }),
      account({ id: 'off', is_active: false }),
      account({ id: 'cye', type: 'equity', system_key: 'current_earnings' }),
      account({ id: 'rev', type: 'revenue' }),
    ]
    expect(mappableAccounts(list, ['asset']).map(a => a.id)).toEqual(['cash'])
    expect(mappableAccounts(list, []).map(a => a.id)).toEqual(['cash', 'rev'])
  })
})

describe('journalDrillDown', () => {
  it('memetakan sumber ke modal atau halaman', () => {
    expect(journalDrillDown({ ref_type: 'transaction', ref_id: 't1' })).toEqual({ kind: 'transaction', id: 't1' })
    expect(journalDrillDown({ ref_type: 'purchase_order', ref_id: 'po' })).toEqual({ kind: 'purchase_order', id: 'po' })
    expect(journalDrillDown({ ref_type: 'journal', ref_id: 'j1', journal_id: null })).toEqual({ kind: 'journal', id: 'j1' })
    expect(journalDrillDown({ ref_type: 'cash_transfer', ref_id: 'x' })).toMatchObject({ kind: 'page', path: '/finance/accounts' })
    expect(journalDrillDown({ ref_type: 'production_order', ref_id: 'x' })).toEqual({ kind: 'page', path: '/inventory/production', permission: PERMS.INVENTORY_HPP })
    expect(journalDrillDown({ ref_type: 'transaction', ref_id: null })).toBeNull()
  })
  it('label Batal produksi dari kunci entri', () => {
    expect(sourceLabel('production', 'Batal produksi', 'production_void:1')).toBe(t('accSourceProductionVoid'))
    expect(sourceLabel('unknown_new', 'Sumber baru')).toBe('Sumber baru')
  })
  it('saldo awal persediaan punya label & ikut saringan sumber', () => {
    expect(sourceLabel('inventory_opening', 'Saldo awal persediaan')).toBe(t('accSourceInventoryOpening'))
    expect(t('accSourceInventoryOpening')).not.toBe('accSourceInventoryOpening')
    expect(JOURNAL_SOURCES).toContain('inventory_opening')
  })
})

const entry: AccJournalEntry = {
  key: 'manual:j1', date: '2026-10-12', occurred_at: '', source: 'manual', source_label: 'Jurnal umum', ref_type: 'journal', ref_id: 'j1',
  ref_no: 'JU/2610/0001', description: 'Gaji Oktober', voided: true, journal_id: 'j1', kind: 'general', reference: null,
  created_by_name: 'Budi', voided_at: null, void_reason: 'salah', voided_by_name: null, total_debit: 1000, total_credit: 1000,
  lines: [
    { account_id: 'e', account_code: '6-1100', account_name: 'Beban Gaji', debit: 1000, credit: 0, memo: 'Okt' },
    { account_id: 'k', account_code: '2-1100', account_name: 'Hutang Gaji', debit: 0, credit: 1000, memo: null },
  ],
}

describe('CSV', () => {
  it('Data Jurnal: satu baris per baris jurnal, status batal beserta alasan', () => {
    const rows = journalCsvRows([entry])
    expect(rows).toHaveLength(2)
    expect(rows[0][t('accColNumber')]).toBe('JU/2610/0001')
    expect(rows[0][t('accDebit')]).toBe(1000)
    expect(rows[1][t('accCredit')]).toBe(1000)
    expect(rows[0][t('labelStatus')]).toBe(`${t('accVoided')}: salah`)
  })
  it('Buku Besar: saldo awal, mutasi, saldo akhir', () => {
    const rows = ledgerCsvRows({
      start_date: '2026-10-01', end_date: '2026-10-31', opening_balance: 100, closing_balance: 150, total_debit: 80, total_credit: 30,
      lines: [{ entry_key: 'sale:1', date: '2026-10-05', occurred_at: '', source: 'sale', source_label: 'Penjualan', ref_type: 'transaction',
        ref_id: 't', ref_no: 'INV-1', description: 'Penjualan INV-1', memo: null, debit: 80, credit: 30, balance: 150 }],
    })
    expect(rows.map(r => r[t('accColBalance')])).toEqual([100, 150, 150])
    expect(rows[0][t('accColDescription')]).toBe(t('accOpeningBalance'))
    expect(rows[2][t('accDebit')]).toBe(80)
  })
  it('Neraca Saldo: subtotal per jenis dan total akhir', () => {
    const tb: AccTrialBalance = {
      start_date: '', end_date: '', fiscal_year_start: '', balanced: true,
      rows: [
        { account_id: 'a', code: '1', name: 'Kas', type: 'asset', normal_balance: 'debit', parent_id: null, opening_debit: 0.1, opening_credit: 0, debit: 0, credit: 0, closing_debit: 0.1, closing_credit: 0 },
        { account_id: 'b', code: '2', name: 'Bank', type: 'asset', normal_balance: 'debit', parent_id: null, opening_debit: 0.2, opening_credit: 0, debit: 0, credit: 0, closing_debit: 0.2, closing_credit: 0 },
        { account_id: 'c', code: '3', name: 'Modal', type: 'equity', normal_balance: 'credit', parent_id: null, opening_debit: 0, opening_credit: 0.3, debit: 0, credit: 0, closing_debit: 0, closing_credit: 0.3 },
      ],
      totals: { opening_debit: 0.3, opening_credit: 0.3, debit: 0, credit: 0, closing_debit: 0.3, closing_credit: 0.3 },
    }
    expect(groupTrialBalance(tb.rows)[0].subtotal.opening_debit).toBe(0.3)
    const rows = trialBalanceCsvRows(tb)
    expect(rows).toHaveLength(6)
    expect(rows[2][t('accColAccount')]).toBe(t('accTotalOf', { label: t('accTypeAsset') }))
    expect(rows[5][t('accColAccount')]).toBe(t('exportTotalRow'))
  })
})

describe('susunan laporan', () => {
  const section = (type: AccProfitLoss['sections'][number]['type'], total: number, compare: number | null = null) => ({
    type, label: '', total, compare_total: compare,
    rows: [{ account_id: `${type}-1`, code: `${type}-1`, name: `Akun ${type}`, parent_id: null, is_group: false, level: 0, computed: false, amount: total, compare_amount: compare }],
  })
  it('Laba Rugi bertingkat dengan pembanding', () => {
    const pl: AccProfitLoss = {
      start_date: '', end_date: '', compare: 'previous_period', compare_start_date: '', compare_end_date: '',
      sections: [section('revenue', 1000, 800), section('cogs', 400, 300), section('expense', 100, 100), section('other_income', 0, 0), section('other_expense', 0, 0)],
      summary: { total_revenue: 1000, total_cogs: 400, gross_profit: 600, total_expense: 100, operating_income: 500, total_other_income: 0, total_other_expense: 0, net_income: 500 },
      compare_summary: { total_revenue: 800, total_cogs: 300, gross_profit: 500, total_expense: 100, operating_income: 400, total_other_income: 0, total_other_expense: 0, net_income: 400 },
    }
    const lines = profitLossLines(pl)
    const labels = lines.filter(l => l.kind === 'summary' || l.kind === 'grand').map(l => [l.label, l.amount, l.compare])
    expect(labels).toEqual([[t('accGrossProfit'), 600, 500], [t('accOperatingIncome'), 500, 400], [t('accNetIncome'), 500, 400]])
    const csv = statementCsvRows(lines, 'Sep')
    expect(csv[csv.length - 1][t('accColChange')]).toBe(100)
    expect(changePercent(500, 400)).toBe(25)
    expect(changePercent(5, 0)).toBeNull()
  })
  it('Neraca: total aset dan total kewajiban + ekuitas', () => {
    const bs: AccBalanceSheet = {
      as_of: '', fiscal_year_start: '', sections: [section('asset', 900), section('liability', 300), section('equity', 600)],
      total_assets: 900, total_liabilities: 300, total_equity: 600, total_liabilities_and_equity: 900, retained_earnings: 0, current_year_earnings: 0, balanced: true,
    }
    const grand = balanceSheetLines(bs).filter(l => l.kind === 'grand').map(l => [l.label, l.amount])
    expect(grand).toEqual([[t('accTotalAssets'), 900], [t('accTotalLiabilitiesEquity'), 900]])
  })
})
