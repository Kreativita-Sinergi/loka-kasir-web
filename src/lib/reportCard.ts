import type { CashierInsight, RecommendationKind, ReportArgs, ReportPillar, ReportRecommendation } from '@/api/ownerInsights'
import { formatCurrency } from '@/lib/utils'
import { formatQuantity, formatWeekday } from '@/lib/money'
import { t } from '@/lib/i18n'
import type { MessageKey } from '@/lib/messages'
import { oneDecimal, pct } from '@/lib/ownerInsights'

// Kalimat Rapor Toko & Rapor Kasir dirangkai dari kode dan argumen server —
// sama dengan aplikasi (report_card_text.dart).

/** Memformat satu argumen menurut jenisnya. */
export function reportArg(args: ReportArgs | null | undefined, key: string): string {
  const a = args?.[key]
  if (!a) return ''
  switch (a.kind) {
    case 'money': return formatCurrency(a.value)
    case 'pct': return pct(a.value)
    case 'count': return formatQuantity(a.value)
    case 'number': return oneDecimal(a.value)
    case 'weekday': return formatWeekday(a.value)
    default: return a.text ?? ''
  }
}

const gradeKeys: Record<string, MessageKey> = {
  A: 'rptGradeA', B: 'rptGradeB', C: 'rptGradeC', D: 'rptGradeD',
}
export const gradeMeaning = (grade: string) => (grade ? t(gradeKeys[grade] ?? 'rptGradeE') : t('rptNotRated'))

/** Warna lencana nilai: A/B hijau, C kuning, D/E merah, belum dinilai abu-abu. */
export const gradeTone = (grade: string) =>
  !grade ? 'gray' as const
    : grade === 'A' || grade === 'B' ? 'green' as const
    : grade === 'C' ? 'yellow' as const
    : 'red' as const

const pillarKeys: Record<ReportPillar['code'], MessageKey> = {
  sales: 'rptPillarSales', profit: 'rptPillarProfit', menu: 'rptPillarMenu',
  customers: 'rptPillarCustomers', control: 'rptPillarControl',
}
export const pillarLabel = (code: ReportPillar['code']) => t(pillarKeys[code] ?? 'rptPillarControl')

export function pillarNote(p: ReportPillar): string {
  const a = (k: string) => reportArg(p.args, k)
  switch (p.note) {
    case 'sales_up': return t('rptNoteSalesUp', { pct: a('pct') })
    case 'sales_down': return t('rptNoteSalesDown', { pct: a('pct') })
    case 'sales_flat': return t('rptNoteSalesFlat')
    case 'sales_new': return t('rptNoteSalesNew')
    case 'sales_none': return t('rptNoteSalesNone')
    case 'margin_good': return t('rptNoteMarginGood', { pct: a('pct') })
    case 'margin_ok': return t('rptNoteMarginOk', { pct: a('pct'), benchmark: a('benchmark') })
    case 'margin_low': return t('rptNoteMarginLow', { pct: a('pct'), benchmark: a('benchmark') })
    case 'margin_unknown': return t('rptNoteMarginUnknown', { count: a('count') })
    case 'menu_bloated': return t('rptNoteMenuBloated', { idle: a('idle') })
    case 'menu_focused': return p.args?.pct ? t('rptNoteMenuFocused', { pct: a('pct') }) : t('rptNoteMenuNoCost')
    case 'customers_returning': return t('rptNoteCustomersReturning', { pct: a('pct') })
    case 'customers_unrecorded': return t('rptNoteCustomersUnrecorded', { pct: a('pct') })
    case 'customers_few': return t('rptNoteCustomersFew', { count: a('count') })
    case 'control_alert': return t('rptNoteControlAlert', { count: a('count') })
    case 'control_watch': return t('rptNoteControlWatch', { count: a('count') })
    default: return t('rptNoteControlSafe')
  }
}

/** Judul dan isi satu saran. */
export function recommendationText(r: ReportRecommendation): [string, string] {
  const a = (k: string) => reportArg(r.args, k)
  const items = (r.items ?? []).join(', ')
  switch (r.code) {
    case 'restock': return [t('rptRecRestockTitle'), t('rptRecRestockBody', { items, days: a('days') })]
    case 'rising': return [t('rptRecRisingTitle'), t('rptRecRisingBody', { item: a('item'), pct: a('pct') })]
    case 'falling': return [t('rptRecFallingTitle'), t('rptRecFallingBody', { item: a('item'), pct: a('pct') })]
    case 'raise_price': return [t('rptRecRaiseTitle'), t('rptRecRaiseBody', { item: a('item'), from: a('from'), to: a('to') })]
    case 'promote': return [t('rptRecPromoteTitle'), t('rptRecPromoteBody', { items })]
    case 'review_dog': return [t('rptRecDogTitle'), t('rptRecDogBody', { items })]
    case 'drop_idle': return [t('rptRecIdleTitle'), t('rptRecIdleBody', { count: a('count'), items })]
    case 'bundle': return [t('rptRecBundleTitle', { a: a('a'), b: a('b') }), t('rptRecBundleBody', { pct: a('pct'), price: a('price') })]
    case 'attach': return [t('rptRecAttachTitle', { category: a('category') }), t('rptRecAttachBody', { pct: a('pct'), category: a('category') })]
    case 'slow_hours': return [t('rptRecSlowTitle', { from: a('from'), to: a('to') }), t('rptRecSlowBody', { pct: a('pct') })]
    case 'fill_cost': return [t('rptRecCostTitle', { count: a('count') }), t('rptRecCostBody')]
    case 'winback': return [t('rptRecWinbackTitle', { count: a('count') }), t('rptRecWinbackBody')]
    case 'record_buyers': return [t('rptRecRecordTitle'), t('rptRecRecordBody', { pct: a('pct') })]
    case 'leak': return [t('rptRecLeakTitle', { count: a('count') }), t('rptRecLeakBody')]
    case 'out_of_stock': return [t('rptRecOutTitle', { count: a('count') }), t('rptRecOutBody', { items, perDay: a('per_day') })]
    case 'slow_day':
      return [t('rptRecSlowDayTitle', { day: a('day') }),
        t('rptRecSlowDayBody', { day: a('day'), avg: a('avg'), pct: a('pct'), others: a('others'), best: a('best') })]
    case 'discount_heavy': return [t('rptRecDiscountTitle', { pct: a('pct') }), t('rptRecDiscountBody', { amount: a('amount'), tx: a('tx') })]
    case 'below_market':
      return [t('rptRecBelowTitle', { count: a('count') }),
        t('rptRecBelowBody', { item: a('item'), price: a('price'), market: a('market'), stores: a('stores') })]
    case 'above_market':
      return [t('rptRecAboveTitle', { count: a('count') }),
        t('rptRecAboveBody', { item: a('item'), price: a('price'), market: a('market'), stores: a('stores') })]
    default: return [r.code, items]
  }
}

/**
 * Tombol tindakan sebuah saran: [label, tujuan], atau null bila saran itu
 * dikerjakan di meja kasir (menawarkan pendamping, mencatat pelanggan).
 */
export function recommendationAction(r: ReportRecommendation): [string, string] | null {
  switch (r.code) {
    case 'restock': case 'out_of_stock': return [t('rptActPo'), '/inventory/purchase-orders']
    case 'rising': case 'falling': case 'raise_price': case 'promote':
    case 'review_dog': case 'drop_idle': case 'bundle': case 'below_market': case 'above_market':
      return [t('rptActProducts'), '/products']
    case 'fill_cost': return [t('rptActCost'), '/products/base-prices']
    case 'winback': return [t('rptActWinback'), '/reports/winback']
    case 'leak': return [t('rptActRadar'), '/reports/leak-radar']
    case 'slow_hours': case 'slow_day': return [t('rptActPeak'), '/reports']
    case 'discount_heavy': return [t('rptActDiscounts'), '/discounts']
    default: return null
  }
}

const kindKeys: Record<RecommendationKind, MessageKey> = {
  add: 'rptKindAdd', grow: 'rptKindGrow', fix: 'rptKindFix', cut: 'rptKindCut',
}
export const kindLabel = (k: RecommendationKind) => t(kindKeys[k])
export const RECOMMENDATION_KINDS: RecommendationKind[] = ['add', 'grow', 'fix', 'cut']

const aspectKeys: Record<string, MessageKey> = {
  throughput: 'rptAspectThroughput', ticket: 'rptAspectTicket', cash: 'rptAspectCash',
  compliance: 'rptAspectCompliance', attendance: 'rptAspectAttendance',
}
export const aspectLabel = (code: string) => t(aspectKeys[code] ?? 'rptAspectAttendance')

export function cashierInsightText(i: CashierInsight): string {
  const a = (k: string) => reportArg(i.args, k)
  switch (i.code) {
    case 'throughput_high': return t('rptInThroughputHigh', { pct: a('pct') })
    case 'throughput_low': return t('rptInThroughputLow', { pct: a('pct') })
    case 'ticket_high': return t('rptInTicketHigh', { pct: a('pct') })
    case 'ticket_low': return t('rptInTicketLow', { pct: a('pct'), team: a('team') })
    case 'items_high': return t('rptInItemsHigh', { items: a('items') })
    case 'cash_perfect': return t('rptInCashPerfect', { shifts: a('shifts') })
    case 'cash_short': return t('rptInCashShort', { count: a('count'), shifts: a('shifts'), amount: a('amount') })
    case 'leak_cancel_rate': return t('rptInCancel', { pct: a('pct') })
    case 'leak_refund_rate': return t('rptInRefund', { pct: a('pct') })
    case 'leak_discount_rate': return t('rptInDiscount', { pct: a('pct') })
    case 'leak_cancel_served': return t('rptInCancelServed')
    case 'leak_qris_unverified': return t('rptInQris')
    case 'always_on_time': return t('rptInOnTime', { days: a('days') })
    case 'late': return t('rptInLate', { count: a('count'), days: a('days') })
    default: return i.code
  }
}

/** "+12,5%" / "−3%" — perubahan bertanda. */
export const signedPct = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${pct(Math.abs(v))}`
