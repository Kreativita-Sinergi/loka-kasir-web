import type {
  AccAccount, AccBalanceSheet, AccJournalEntry, AccLedger, AccProfitLoss, AccReportSection,
  AccTrialBalance, AccTrialBalanceAmounts, AccTrialBalanceRow, AccountType, JournalKind, JournalLinePayload, NormalBalance,
} from '@/api/accounting'
import { ACCOUNT_TYPES } from '@/api/accounting'
import { PERMS } from '@/hooks/usePermissions'
import { formatDate } from '@/lib/utils'
import { t } from '@/lib/i18n'
import type { MessageKey } from '@/lib/messages'

// ─── Label ───────────────────────────────────────────────────────────────────

export const ACCOUNT_TYPE_LABEL: Record<AccountType, MessageKey> = {
  asset: 'accTypeAsset',
  liability: 'accTypeLiability',
  equity: 'accTypeEquity',
  revenue: 'accTypeRevenue',
  cogs: 'accTypeCogs',
  expense: 'accTypeExpense',
  other_income: 'accTypeOtherIncome',
  other_expense: 'accTypeOtherExpense',
}

/** Judul bagian Laba Rugi — "Beban Operasional", bukan sekadar "Beban". */
const PL_SECTION_LABEL: Partial<Record<AccountType, MessageKey>> = {
  revenue: 'accTypeRevenue',
  cogs: 'accTypeCogs',
  expense: 'accPlSectionExpense',
  other_income: 'accPlSectionOtherIncome',
  other_expense: 'accPlSectionOtherExpense',
}

export const typeLabel = (type: string): string =>
  ACCOUNT_TYPE_LABEL[type as AccountType] ? t(ACCOUNT_TYPE_LABEL[type as AccountType]) : type

const SOURCE_LABEL: Record<string, MessageKey> = {
  sale: 'accSourceSale',
  receivable_payment: 'accSourceReceivablePayment',
  refund: 'accSourceRefund',
  purchase: 'accSourcePurchase',
  supplier_payment: 'accSourceSupplierPayment',
  cash_book: 'accSourceCashBook',
  cash_transfer: 'accSourceCashTransfer',
  opening_balance: 'accSourceOpeningBalance',
  shift_cash: 'accSourceShiftCash',
  shift_discrepancy: 'accSourceShiftDiscrepancy',
  customer_deposit: 'accSourceCustomerDeposit',
  stock_adjustment: 'accSourceStockAdjustment',
  production: 'accSourceProduction',
  manual: 'accSourceManual',
}

/**
 * Label sumber jurnal dalam bahasa aktif. Server juga mengirim
 * `source_label` (bahasa Indonesia) — dipakai bila sumbernya belum dikenal
 * klien, dan untuk "Batal produksi" yang sumbernya tetap `production`.
 */
export function sourceLabel(source: string, serverLabel?: string, key?: string): string {
  if (key?.startsWith('production_void:')) return t('accSourceProductionVoid')
  const msg = SOURCE_LABEL[source]
  return msg ? t(msg) : (serverLabel || source)
}

export const JOURNAL_KINDS: JournalKind[] = ['general', 'adjustment', 'opening']
export const JOURNAL_KIND_LABEL: Record<JournalKind, MessageKey> = {
  general: 'accKindGeneral',
  adjustment: 'accKindAdjustment',
  opening: 'accKindOpening',
}

/** Saldo normal bawaan menurut jenis — sama dengan server. */
export function defaultNormalBalance(type: AccountType): NormalBalance {
  return type === 'asset' || type === 'cogs' || type === 'expense' || type === 'other_expense' ? 'debit' : 'credit'
}

/** Tanggal lokal usaha "YYYY-MM-DD" → teks. Dibaca sebagai tanggal lokal,
 *  bukan UTC, supaya tidak mundur sehari di zona waktu negatif. */
export function formatAccDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return iso
  return formatDate(new Date(y, m - 1, d))
}

// ─── Pohon Daftar Perkiraan ──────────────────────────────────────────────────

export interface AccountTreeRow { account: AccAccount; level: number }
export interface AccountTypeGroup { type: AccountType; rows: AccountTreeRow[] }

/**
 * Susun Daftar Perkiraan per jenis, induk diikuti anak-anaknya (urut kode).
 * Perkiraan yang induknya tidak ikut terkirim (mis. induk nonaktif tersaring)
 * diperlakukan sebagai akar supaya tidak hilang dari daftar.
 */
export function buildAccountTree(accounts: AccAccount[]): AccountTypeGroup[] {
  const byId = new Map(accounts.map(account => [account.id, account]))
  const children = new Map<string, AccAccount[]>()
  const roots: AccAccount[] = []
  for (const account of accounts) {
    const parent = account.parent_id ? byId.get(account.parent_id) : undefined
    if (parent && parent.id !== account.id) {
      const list = children.get(parent.id) ?? []
      list.push(account)
      children.set(parent.id, list)
    } else {
      roots.push(account)
    }
  }
  const byCode = (a: AccAccount, b: AccAccount) => a.code.localeCompare(b.code, undefined, { numeric: true })
  const groups = new Map<AccountType, AccountTreeRow[]>()
  const seen = new Set<string>()
  const walk = (account: AccAccount, level: number, out: AccountTreeRow[]) => {
    // Penjaga siklus: data rusak tidak boleh membuat halaman berputar selamanya.
    if (seen.has(account.id)) return
    seen.add(account.id)
    out.push({ account, level })
    for (const child of (children.get(account.id) ?? []).sort(byCode)) walk(child, level + 1, out)
  }
  for (const root of roots.sort(byCode)) {
    const list = groups.get(root.type) ?? []
    walk(root, 0, list)
    groups.set(root.type, list)
  }
  return ACCOUNT_TYPES.filter(type => groups.has(type)).map(type => ({ type, rows: groups.get(type)! }))
}

/** Id perkiraan beserta seluruh turunannya — induk tidak boleh menjadi anak dirinya sendiri. */
export function descendantIds(accounts: AccAccount[], id: string): Set<string> {
  const out = new Set<string>([id])
  let grew = true
  while (grew) {
    grew = false
    for (const account of accounts) {
      if (account.parent_id && out.has(account.parent_id) && !out.has(account.id)) {
        out.add(account.id)
        grew = true
      }
    }
  }
  return out
}

export const accountOptionLabel = (account: Pick<AccAccount, 'code' | 'name'>) => `${account.code} · ${account.name}`

/** Perkiraan yang boleh dipilih untuk satu peran Pemetaan. Kembaran akun kas
 *  boleh (mis. QRIS → BCA); induk dan Laba Tahun Berjalan tidak. */
export function mappableAccounts(accounts: AccAccount[], allowedTypes: AccountType[]): AccAccount[] {
  return accounts.filter(account => account.is_active && !account.is_group
    && account.system_key !== 'current_earnings'
    && (allowedTypes.length === 0 || allowedTypes.includes(account.type)))
}

// ─── Jurnal Umum ─────────────────────────────────────────────────────────────

export interface JournalDraftLine {
  key: string
  accountId: string
  debit: string
  credit: string
  memo: string
}

const toCents = (raw: string): number => {
  const value = Number(String(raw).replace(',', '.'))
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0
}

export type JournalDraftIssue = 'too_few_lines' | 'line_incomplete' | 'line_both_sides' | 'unbalanced' | 'empty'

export interface JournalDraftTotals {
  debit: number
  credit: number
  /** debit − kredit, dibulatkan ke sen. */
  difference: number
  balanced: boolean
  /** Baris berisi yang akan dikirim. */
  filledCount: number
  issue: JournalDraftIssue | null
}

/**
 * Total dan kesiapan Jurnal Umum. Dihitung dalam sen supaya 0,1 + 0,2 tidak
 * dianggap selisih — server memeriksa keseimbangan sampai sen juga.
 * Baris kosong total (tanpa perkiraan dan tanpa angka) diabaikan.
 */
export function journalDraftTotals(lines: JournalDraftLine[]): JournalDraftTotals {
  let debit = 0
  let credit = 0
  let filled = 0
  let issue: JournalDraftIssue | null = null
  for (const line of lines) {
    const d = toCents(line.debit)
    const c = toCents(line.credit)
    if (!line.accountId && d === 0 && c === 0) continue
    filled++
    debit += d
    credit += c
    if (!issue && d > 0 && c > 0) issue = 'line_both_sides'
    if (!issue && (!line.accountId || (d === 0 && c === 0))) issue = 'line_incomplete'
  }
  if (!issue && filled === 0) issue = 'empty'
  if (!issue && filled < 2) issue = 'too_few_lines'
  if (!issue && debit !== credit) issue = 'unbalanced'
  return {
    debit: debit / 100,
    credit: credit / 100,
    difference: (debit - credit) / 100,
    balanced: issue === null,
    filledCount: filled,
    issue,
  }
}

/** Baris kiriman untuk POST /accounting/journals (baris kosong dibuang). */
export function journalLinesPayload(lines: JournalDraftLine[]): JournalLinePayload[] {
  return lines
    .filter(line => line.accountId || toCents(line.debit) > 0 || toCents(line.credit) > 0)
    .map(line => ({
      account_id: line.accountId,
      debit: toCents(line.debit) / 100,
      credit: toCents(line.credit) / 100,
      memo: line.memo.trim() || null,
    }))
}

// ─── Telusur ke sumber ───────────────────────────────────────────────────────

export type DrillDown =
  | { kind: 'transaction'; id: string }
  | { kind: 'purchase_order'; id: string }
  | { kind: 'journal'; id: string }
  | { kind: 'page'; path: string; permission: string }

/**
 * Ke mana sebuah entri jurnal / baris buku besar bisa ditelusuri. Hanya
 * sumber yang punya halaman atau modal di dasbor yang diberi tujuan; sisanya
 * null.
 */
export function journalDrillDown(ref: { ref_type: string; ref_id: string | null; journal_id?: string | null }): DrillDown | null {
  if (ref.ref_type === 'journal') {
    const id = ref.journal_id ?? ref.ref_id
    return id ? { kind: 'journal', id } : null
  }
  switch (ref.ref_type) {
    case 'transaction': return ref.ref_id ? { kind: 'transaction', id: ref.ref_id } : null
    case 'purchase_order': return ref.ref_id ? { kind: 'purchase_order', id: ref.ref_id } : null
    case 'cash_entry':
    case 'cash_transfer':
    case 'cash_account': return { kind: 'page', path: '/finance/accounts', permission: PERMS.FINANCE_CASH_BOOK }
    case 'shift': return { kind: 'page', path: '/shifts', permission: PERMS.POS_OPEN_SHIFT }
    case 'customer': return { kind: 'page', path: '/reports/deposits', permission: PERMS.REPORTS_FINANCIAL }
    case 'stock_opname': return { kind: 'page', path: '/inventory/stock-opname', permission: PERMS.INVENTORY_VIEW }
    case 'stock_movement':
    case 'raw_material_movement': return { kind: 'page', path: '/inventory/movements', permission: PERMS.INVENTORY_VIEW }
    case 'production_order': return { kind: 'page', path: '/inventory/production', permission: PERMS.INVENTORY_HPP }
    default: return null
  }
}

// ─── Laporan: susunan baris ──────────────────────────────────────────────────

export type StatementLineKind = 'header' | 'row' | 'total' | 'summary' | 'grand'

export interface StatementLine {
  kind: StatementLineKind
  label: string
  code?: string
  level?: number
  isGroup?: boolean
  computed?: boolean
  accountId?: string | null
  amount: number | null
  compare: number | null
}

function sectionLines(section: AccReportSection | undefined, label: string, totalLabel: string, withCompare: boolean): StatementLine[] {
  const lines: StatementLine[] = [{ kind: 'header', label, amount: null, compare: null }]
  for (const row of section?.rows ?? []) {
    lines.push({
      kind: 'row', label: row.name, code: row.code, level: row.level, isGroup: row.is_group, computed: row.computed,
      accountId: row.account_id, amount: row.amount, compare: withCompare ? (row.compare_amount ?? 0) : null,
    })
  }
  lines.push({ kind: 'total', label: totalLabel, amount: section?.total ?? 0, compare: withCompare ? (section?.compare_total ?? 0) : null })
  return lines
}

/**
 * Laba Rugi bertingkat: Pendapatan → HPP → Laba Kotor → Beban Operasional →
 * Laba Usaha → Pendapatan/Beban Lain → Laba Bersih. Angka ringkasan diambil
 * dari `summary` server, bukan dijumlah ulang di klien.
 */
export function profitLossLines(pl: AccProfitLoss): StatementLine[] {
  const withCompare = !!pl.compare_summary
  const cmp = pl.compare_summary
  const find = (type: AccountType) => pl.sections.find(section => section.type === type)
  const section = (type: AccountType) => {
    const label = t(PL_SECTION_LABEL[type]!)
    return sectionLines(find(type), label, t('accTotalOf', { label }), withCompare)
  }
  const summary = (kind: 'summary' | 'grand', key: MessageKey, value: number, compare: number | undefined): StatementLine =>
    ({ kind, label: t(key), amount: value, compare: withCompare ? (compare ?? 0) : null })
  return [
    ...section('revenue'),
    ...section('cogs'),
    summary('summary', 'accGrossProfit', pl.summary.gross_profit, cmp?.gross_profit),
    ...section('expense'),
    summary('summary', 'accOperatingIncome', pl.summary.operating_income, cmp?.operating_income),
    ...section('other_income'),
    ...section('other_expense'),
    summary('grand', 'accNetIncome', pl.summary.net_income, cmp?.net_income),
  ]
}

/** Neraca: Aset, lalu Kewajiban + Ekuitas dengan total gabungannya. */
export function balanceSheetLines(bs: AccBalanceSheet): StatementLine[] {
  const find = (type: AccountType) => bs.sections.find(section => section.type === type)
  const section = (type: AccountType, totalKey: MessageKey) => sectionLines(find(type), typeLabel(type), t(totalKey), false)
  const grand = (key: MessageKey, value: number): StatementLine => ({ kind: 'grand', label: t(key), amount: value, compare: null })
  const assets = section('asset', 'accTotalAssets')
  assets[assets.length - 1] = grand('accTotalAssets', bs.total_assets)
  return [
    ...assets,
    ...section('liability', 'accTotalLiabilities'),
    ...section('equity', 'accTotalEquity'),
    grand('accTotalLiabilitiesEquity', bs.total_liabilities_and_equity),
  ]
}

/** Selisih pembanding dalam persen; null bila pembandingnya nol. */
export function changePercent(amount: number, compare: number): number | null {
  if (!compare) return null
  return ((amount - compare) / Math.abs(compare)) * 100
}

// ─── Neraca Saldo per jenis ──────────────────────────────────────────────────

export interface TrialBalanceGroup { type: AccountType; rows: AccTrialBalanceRow[]; subtotal: AccTrialBalanceAmounts }

const ZERO_AMOUNTS: AccTrialBalanceAmounts = { opening_debit: 0, opening_credit: 0, debit: 0, credit: 0, closing_debit: 0, closing_credit: 0 }
const AMOUNT_KEYS = Object.keys(ZERO_AMOUNTS) as (keyof AccTrialBalanceAmounts)[]

/** Kelompokkan Neraca Saldo per jenis dengan subtotal (dijumlah dalam sen). */
export function groupTrialBalance(rows: AccTrialBalanceRow[]): TrialBalanceGroup[] {
  return ACCOUNT_TYPES.flatMap(type => {
    const list = rows.filter(row => row.type === type)
    if (!list.length) return []
    const cents = { ...ZERO_AMOUNTS }
    for (const row of list) for (const key of AMOUNT_KEYS) cents[key] += Math.round(row[key] * 100)
    const subtotal = { ...ZERO_AMOUNTS }
    for (const key of AMOUNT_KEYS) subtotal[key] = cents[key] / 100
    return [{ type, rows: list, subtotal }]
  })
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

type CsvRow = Record<string, string | number>

/**
 * Data Jurnal → CSV: satu baris per baris jurnal (bentuk yang biasa diimpor
 * ke aplikasi akuntansi lain). Jurnal batal tetap ditulis beserta alasannya,
 * jadi CSV tidak memakai baris TOTAL otomatis — totalnya ditulis pemanggil
 * dari angka server yang sudah mengecualikan jurnal batal.
 */
export function journalCsvRows(entries: AccJournalEntry[]): CsvRow[] {
  return entries.flatMap(entry => entry.lines.map(line => ({
    [t('labelDate')]: entry.date,
    [t('accColNumber')]: entry.ref_no ?? '',
    [t('accColSource')]: sourceLabel(entry.source, entry.source_label, entry.key),
    [t('accColDescription')]: entry.description,
    [t('accColCode')]: line.account_code,
    [t('accColAccount')]: line.account_name,
    [t('accColMemo')]: line.memo ?? '',
    [t('accDebit')]: line.debit,
    [t('accCredit')]: line.credit,
    [t('labelStatus')]: entry.voided ? [t('accVoided'), entry.void_reason].filter(Boolean).join(': ') : '',
  })))
}

/** Buku Besar → CSV: saldo awal, mutasi kronologis, saldo akhir. */
export function ledgerCsvRows(ledger: Pick<AccLedger, 'start_date' | 'end_date' | 'opening_balance' | 'closing_balance' | 'total_debit' | 'total_credit' | 'lines'>): CsvRow[] {
  const row = (date: string, number: string, source: string, description: string, debit: number | '', credit: number | '', balance: number): CsvRow => ({
    [t('labelDate')]: date,
    [t('accColNumber')]: number,
    [t('accColSource')]: source,
    [t('accColDescription')]: description,
    [t('accDebit')]: debit,
    [t('accCredit')]: credit,
    [t('accColBalance')]: balance,
  })
  return [
    row(ledger.start_date, '', '', t('accOpeningBalance'), '', '', ledger.opening_balance),
    ...ledger.lines.map(line => row(line.date, line.ref_no ?? '', sourceLabel(line.source, line.source_label, line.entry_key),
      [line.description, line.memo].filter(Boolean).join(' · '), line.debit, line.credit, line.balance)),
    row(ledger.end_date, '', '', t('accClosingBalance'), ledger.total_debit, ledger.total_credit, ledger.closing_balance),
  ]
}

export function trialBalanceCsvRows(tb: AccTrialBalance): CsvRow[] {
  const amounts = (a: AccTrialBalanceAmounts) => ({
    [t('accCsvOpeningDebit')]: a.opening_debit,
    [t('accCsvOpeningCredit')]: a.opening_credit,
    [t('accCsvMovementDebit')]: a.debit,
    [t('accCsvMovementCredit')]: a.credit,
    [t('accCsvClosingDebit')]: a.closing_debit,
    [t('accCsvClosingCredit')]: a.closing_credit,
  })
  return [
    ...groupTrialBalance(tb.rows).flatMap(group => [
      ...group.rows.map(row => ({ [t('accColCode')]: row.code, [t('accColAccount')]: row.name, [t('accColType')]: typeLabel(row.type), ...amounts(row) })),
      { [t('accColCode')]: '', [t('accColAccount')]: t('accTotalOf', { label: typeLabel(group.type) }), [t('accColType')]: '', ...amounts(group.subtotal) },
    ]),
    { [t('accColCode')]: '', [t('accColAccount')]: t('exportTotalRow'), [t('accColType')]: '', ...amounts(tb.totals) },
  ]
}

/** Laba Rugi / Neraca → CSV, mengikuti susunan baris yang tampil di layar. */
export function statementCsvRows(lines: StatementLine[], compareLabel?: string): CsvRow[] {
  return lines.map(line => {
    const indent = line.kind === 'row' ? '  '.repeat(line.level ?? 0) : ''
    const base: CsvRow = {
      [t('accColCode')]: line.code ?? '',
      [t('accColAccount')]: indent + line.label,
      [t('accColAmount')]: line.amount ?? '',
    }
    if (compareLabel) {
      base[compareLabel] = line.compare ?? ''
      base[t('accColChange')] = line.amount != null && line.compare != null ? Math.round((line.amount - line.compare) * 100) / 100 : ''
    }
    return base
  })
}
