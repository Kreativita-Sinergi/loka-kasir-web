import api from '@/lib/axios'
import type { ApiResponse } from '@/types'

// Wawasan pemilik — Radar Kebocoran, Lab Harga, Panggil Balik + penilaian QR
// struk, dan Pojok Pajak. Server mengirim KODE dan angka; kalimatnya dirangkai
// halaman lewat t(), sama dengan aplikasi.

type Range = { from?: string; to?: string; outlet_id?: string }

// ── Radar Kebocoran ──────────────────────────────────────────────────────────

export type LeakSeverity = 'high' | 'medium' | 'low'
export type LeakLevel = 'safe' | 'watch' | 'alert'

export interface LeakRef {
  transaction_id: string
  bill_number: string
  amount: number
  at: string
  reason?: string
}

export interface LeakFinding {
  code:
    | 'cancel_rate' | 'cancel_served' | 'refund_rate' | 'discount_rate' | 'cash_short'
    | 'qris_unverified' | 'deleted' | 'stale_open' | 'stock_shrink'
  severity: LeakSeverity
  actor_id: string | null
  actor_name: string
  count: number
  amount: number
  rate: number | null
  baseline: number | null
  refs: LeakRef[]
  items?: string[]
}

export interface LeakActor {
  actor_id: string
  actor_name: string
  transactions: number
  sales: number
  cancel_count: number
  cancel_rate: number
  refund_count: number
  refund_rate: number
  discount_rate: number
  cash_short_shifts: number
  total_shifts: number
  cash_short_total: number
  qris_unverified: number
  flags: string[]
}

export interface LeakRadar {
  from: string
  to: string
  score: number
  level: LeakLevel
  summary: {
    transactions: number
    sales: number
    at_risk: number
    qris_monitored: boolean
    high_count: number
    medium_count: number
    low_count: number
  }
  findings: LeakFinding[]
  actors: LeakActor[]
}

export const getLeakRadar = (params?: Range) =>
  api.get<ApiResponse<LeakRadar>>('/analytics/leak-radar', { params })

// ── Lab Harga ────────────────────────────────────────────────────────────────

export interface PriceWindow {
  days: number
  qty: number
  qty_per_day: number
  revenue_per_day: number
  profit_per_day: number | null
  lines: number
  store_tx_per_day: number
}

export interface PriceChange {
  item_id: string
  product_id: string
  name: string
  changed_on: string
  source: 'catalog' | 'sales'
  old_price: number
  new_price: number
  price_change_pct: number
  status: 'ready' | 'too_early' | 'no_baseline'
  days_until_ready: number
  before: PriceWindow | null
  after: PriceWindow | null
  traffic_change_pct: number | null
  qty_change_pct: number | null
  metric: 'profit' | 'revenue'
  metric_change_pct: number | null
  metric_delta_per_day: number | null
  verdict: 'better' | 'worse' | 'flat'
  confidence: 'low' | 'medium' | 'high'
  elasticity: number | null
}

export type MenuClass = 'star' | 'plowhorse' | 'puzzle' | 'dog' | 'no_cost'

export interface MenuItem {
  item_id: string
  name: string
  qty: number
  is_weight_based: boolean
  revenue: number
  profit: number
  unit_price: number
  unit_profit: number
  margin: number
  mix_share: number
  class: MenuClass
  suggested_price: number | null
}

export interface MenuMatrix {
  period: string
  popularity_threshold: number
  profit_threshold: number
  items: MenuItem[]
  counts: Record<string, number>
}

export const getPriceChanges = () =>
  api.get<ApiResponse<{ since: string; changes: PriceChange[] }>>('/analytics/price-changes')

export const getMenuMatrix = (period: '7d' | '30d' | '90d') =>
  api.get<ApiResponse<MenuMatrix>>('/analytics/menu-matrix', { params: { period } })

// ── Panggil Balik & penilaian ────────────────────────────────────────────────

export type WinbackSegment = 'at_risk' | 'lost' | 'new_once'

export interface WinbackCustomer {
  customer_id: string
  name: string
  phone: string
  segment: WinbackSegment
  visits: number
  avg_gap_days: number
  days_since: number
  last_visit: string
  total_spent: number
  avg_ticket: number
  monthly_value: number
  favorite_item: string
  last_contacted_at: string | null
  contact_count: number
}

export interface WinbackData {
  summary: {
    lost: number
    at_risk: number
    new_once: number
    monthly_at_stake: number
    contacted_30d: number
    returned_30d: number
    returned_revenue_30d: number
    without_phone: number
  }
  customers: WinbackCustomer[]
}

export interface WinbackContactPayload {
  segment: WinbackSegment
  voucher_type?: 'amount' | 'percent'
  voucher_value?: number
  valid_days?: number
}

export interface WinbackContactResult {
  contact_id: string
  voucher: { code: string; expires_at: string | null } | null
}

export interface RatingLink {
  token: string
  url: string
  enabled: boolean
}

export interface CustomerRating {
  id: string
  rating: number
  comment: string
  contact_name: string
  contact_phone: string
  customer_id: string | null
  bill_number: string
  outlet_name: string
  created_at: string
}

export interface RatingSummary {
  average: number
  count: number
  distribution: number[]
  new_contacts: number
  recent: CustomerRating[]
}

export const getWinback = () => api.get<ApiResponse<WinbackData>>('/customer/winback')

export const contactWinbackCustomer = (customerId: string, payload: WinbackContactPayload) =>
  api.post<ApiResponse<WinbackContactResult>>(`/customer/winback/${customerId}/contact`, payload)

export const getRatings = () => api.get<ApiResponse<RatingSummary>>('/customer/ratings')

export const getRatingLink = (outletId: string) =>
  api.get<ApiResponse<RatingLink>>('/customer/rating-link', { params: { outlet_id: outletId } })

export const setRatingLinkEnabled = (outletId: string, enabled: boolean) =>
  api.put<ApiResponse<RatingLink>>('/customer/rating-link', { enabled }, { params: { outlet_id: outletId } })

// ── Pojok Pajak ──────────────────────────────────────────────────────────────

export type TaxpayerType = 'op' | 'pt_perorangan' | 'koperasi' | 'badan'
export type TaxMonthStatus = 'future' | 'running' | 'none' | 'due' | 'overdue' | 'paid'

export interface TaxProfile {
  taxpayer_type: TaxpayerType
  npwp: string
  registered_year: number | null
  external_omzet: Record<string, number>
  reminder_enabled: boolean
  is_set: boolean
}

export interface TaxMonth {
  month: number
  period: string
  omzet: number
  cumulative: number
  taxable: number
  pph_due: number
  due_date: string
  status: TaxMonthStatus
  payment: { ntpn: string; paid_at: string } | null
  local_tax: number
}

export interface TaxYear {
  year: number
  rate: number
  exempt_threshold: number
  ceiling: number
  profile: TaxProfile
  months: TaxMonth[]
  total_omzet: number
  external_omzet: number
  total_pph: number
  unpaid_pph: number
  total_local_tax: number
  exempt_remaining: number
  warnings: string[]
  kap: string
  kjs: string
}

export const getTaxYear = (year: number) =>
  api.get<ApiResponse<TaxYear>>('/finance/tax', { params: { year } })

export const saveTaxProfile = (payload: {
  taxpayer_type: TaxpayerType
  npwp: string
  registered_year: number | null
  external_omzet: Record<string, number>
  reminder_enabled: boolean
}) => api.put<ApiResponse<TaxProfile>>('/finance/tax/profile', payload)

export const markTaxPaid = (period: string, paid: boolean, ntpn = '') =>
  api.put<ApiResponse<{ ok: boolean }>>(`/finance/tax/payments/${period}`, { paid, ntpn })

// ── WhatsApp ─────────────────────────────────────────────────────────────────

/** Nomor dalam bentuk yang diterima wa.me (62…), atau null bila tak terpakai. */
export function whatsAppNumber(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (!digits) return null
  const n = digits.startsWith('0') ? `62${digits.slice(1)}` : digits.startsWith('62') ? digits : `62${digits}`
  return n.length >= 11 && n.length <= 15 ? n : null
}

export const whatsAppUrl = (number: string | null, text: string) =>
  number
    ? `https://wa.me/${number}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`

// ── Rapor Toko & Rapor Kasir ─────────────────────────────────────────────────

export type ReportPeriod = '7d' | '30d'

/** Satu argumen kalimat rapor; nilainya diformat halaman menurut `kind`. */
export interface ReportArg {
  /** weekday: 0 = Minggu. */
  kind: 'money' | 'pct' | 'count' | 'number' | 'text' | 'weekday'
  value: number
  text?: string
}

export type ReportArgs = Record<string, ReportArg>

export interface ReportPillar {
  code: 'sales' | 'profit' | 'menu' | 'customers' | 'control'
  /** null = belum bisa dinilai (mis. modal belum diisi). */
  score: number | null
  grade: string
  note: string
  args: ReportArgs | null
}

export type RecommendationKind = 'add' | 'grow' | 'fix' | 'cut'

export interface ReportRecommendation {
  code: string
  kind: RecommendationKind
  impact_per_month: number | null
  args: ReportArgs | null
  items: string[] | null
}

export interface StoreReport {
  period: ReportPeriod
  /** null = pilar yang terukur kurang dari tiga; grade kosong. */
  score: number | null
  grade: string
  revenue: number
  revenue_change_pct: number | null
  transactions: number
  avg_ticket: number
  avg_ticket_change_pct: number | null
  items_per_tx: number
  top_items: string[]
  pillars: ReportPillar[]
  recommendations: ReportRecommendation[]
  /** Nota kurang dari min_transactions: saran pola belum dikeluarkan. */
  thin_data: boolean
  min_transactions: number
}

export interface CashierInsight {
  code: string
  args: ReportArgs | null
}

export interface CashierReportRow {
  cashier_id: string
  name: string
  /** null = aspek yang terukur kurang dari dua; grade kosong. */
  score: number | null
  grade: string
  transactions: number
  sales: number
  avg_ticket: number
  items_per_tx: number
  sales_per_hour: number | null
  aspects: { code: 'throughput' | 'ticket' | 'cash' | 'compliance' | 'attendance'; score: number | null }[]
  strengths: CashierInsight[]
  improvements: CashierInsight[]
}

export interface CashierHighlight {
  code: 'top_sales' | 'top_ticket'
  cashier_id: string
  name: string
  value: number
  vs_team_pct: number | null
}

export interface CashierReport {
  period: ReportPeriod
  cashiers: CashierReportRow[]
  highlights: CashierHighlight[]
  team_avg_ticket: number
}

export const getStoreReport = (period: ReportPeriod) =>
  api.get<ApiResponse<StoreReport>>('/analytics/store-report', { params: { period } })

export const getCashierReport = (period: ReportPeriod) =>
  api.get<ApiResponse<CashierReport>>('/analytics/cashier-report', { params: { period } })
