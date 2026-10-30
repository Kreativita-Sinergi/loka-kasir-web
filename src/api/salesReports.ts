import api from '@/lib/axios'
import type { ApiResponse } from '@/types'

// Laba per Nota & Ringkasan Penjualan. Tanggal YYYY-MM-DD dalam jam toko,
// kedua ujung ikut dihitung — sama dengan laporan lain di dasbor.

type Range = { start_date: string; end_date: string; outlet_id?: string }

// ── Laba per Nota ────────────────────────────────────────────────────────────

export interface ReceiptProfitSummary {
  transaction_count: number
  revenue: number
  cogs: number
  gross_profit: number
  gross_margin: number
  missing_cost_count: number
  costs_complete: boolean
}

export interface ReceiptProfitRow {
  transaction_id: string
  bill_number: string
  created_at: string
  customer_name: string
  cashier_name: string
  outlet_name: string
  /** Omzet barang bersih: setelah diskon, tanpa pajak & biaya layanan — definisi Profitabilitas. */
  revenue: number
  cogs: number
  gross_profit: number
  gross_margin: number
  /** Ada barang tanpa modal; `cogs` hanya bagian yang diketahui. */
  missing_cost: boolean
}

export interface ReceiptProfitReport {
  start_date: string
  end_date: string
  summary: ReceiptProfitSummary
  /** Kasir yang berjualan di rentang & outlet ini, untuk isi pilihan saringan. */
  cashiers: { id: string; name: string }[]
  items: ReceiptProfitRow[]
  pagination: { page: number; limit: number; total: number }
}

export type ReceiptProfitParams = Range & { cashier_id?: string; page?: number; limit?: number; export?: 1 }

export const getReceiptProfit = (params: ReceiptProfitParams) =>
  api.get<ApiResponse<ReceiptProfitReport>>('/profitability/receipts', { params })

// ── Ringkasan Penjualan ──────────────────────────────────────────────────────

export const SALES_SUMMARY_GROUPS = ['cashier', 'category', 'customer', 'payment', 'order_type', 'channel'] as const
export type SalesSummaryGroup = (typeof SALES_SUMMARY_GROUPS)[number]

export interface SalesSummaryFigures {
  transaction_count: number
  qty: number
  /** Penjualan bersih nota: final_price − pajak. */
  revenue: number
  discount: number
  tax: number
  total: number
}

export interface SalesSummaryRow extends SalesSummaryFigures {
  /** `none` | `others` | `unpaid` untuk baris khusus — labelnya kosong dan dilokalkan klien. */
  key: string
  label: string
  detail: string
  share: number
}

export interface SalesSummaryReport {
  group_by: SalesSummaryGroup
  start_date: string
  end_date: string
  totals: SalesSummaryFigures
  rows: SalesSummaryRow[]
  /** Kategori & metode bayar membagi satu nota ke beberapa baris. */
  overlapping_counts: boolean
}

export const getSalesSummary = (params: Range & { group_by: SalesSummaryGroup }) =>
  api.get<ApiResponse<SalesSummaryReport>>('/sales-report/summary', { params })
