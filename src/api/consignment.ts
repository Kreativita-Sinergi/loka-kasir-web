import api from '@/lib/axios'
import type { ApiResponse } from '@/types'

// Back-office penitip barang (konsinyasi) — cermin dari fitur yang sama di
// aplikasi kasir (lib/features/consignment). Penjualan per penitip tetap di
// src/api/suppliers.ts (getConsignmentSales).

/** Status dokumen pelunasan. Backend menulis 'CANCELED' (satu L). */
export type ConsignmentSettlementStatus = 'DRAFT' | 'PAID' | 'CANCELED'

/**
 * 'PAYMENT' = penyerahan uang per nominal (tanpa rincian barang);
 * 'ITEMS' = settlement per barang terjual.
 */
export type ConsignmentSettlementKind = 'ITEMS' | 'PAYMENT'

/**
 * Kewajiban toko ke satu penitip: hak dari semua penjualan barang titipannya
 * dikurangi semua uang yang sudah diserahkan (GET /consignment/outstanding).
 */
export interface ConsignorBalance {
  supplier_id: string
  supplier_name: string
  phone?: string | null
  /** Hak penitip dari semua penjualan. */
  owed: number
  /** Uang yang sudah diserahkan. */
  paid: number
  /** Yang masih harus dibayar. */
  outstanding: number
  last_paid_at?: string | null
}

export interface ConsignmentSettlementItem {
  product_name: string
  quantity: number
  deposit_price: number
  amount: number
  type: 'SALE' | 'REFUND'
  /** Omzet toko dari baris ini — hanya pada rincian. */
  revenue?: number
}

export interface ConsignmentSettlement {
  id: string
  supplier_id: string
  consignor_name: string
  start_date: string
  end_date: string
  total: number
  status: ConsignmentSettlementStatus | string
  kind?: ConsignmentSettlementKind | string
  paid_at?: string | null
  /* Hanya pada rincian (GET /consignment/settlements/:id). */
  consignor_phone?: string | null
  note?: string | null
  /** Kewajiban sebelum dan sesudah penyerahan — hanya kind PAYMENT. */
  balance_before?: number | null
  balance_after?: number | null
  /** Omzet dan laba toko dari barang di settlement ini — kind ITEMS. */
  revenue?: number | null
  profit?: number | null
  items?: ConsignmentSettlementItem[]
}

/** Baris penjualan satu penitip yang belum masuk settlement mana pun. */
export interface ConsignmentUnsettledItem {
  transaction_item_id: string
  product_id: string
  product_name: string
  bill_number?: string | null
  sold_at: string
  quantity: number
  deposit_price: number
  amount: number
}

/** Produk titipan satu penitip yang masih ada stoknya di satu outlet. */
export interface ConsignmentProduct {
  id: string
  name: string
  sku?: string | null
  /** Hak penitip per unit terjual; null = belum dikonfigurasi. */
  consignment_deposit_price?: number | null
  stock: number
}

export interface ConsignmentReturnLine {
  product_name: string
  quantity: number
  unit_price?: number | null
  variant_name?: string | null
}

export interface ConsignmentReturn {
  id: string
  return_number: string
  created_at: string
  consignor_id: string
  consignor_name: string
  outlet_id: string
  outlet_name: string
  notes?: string | null
  total_quantity: number
  total_amount?: number | null
  items: ConsignmentReturnLine[]
}

export interface CreateSettlementPayload {
  supplier_id: string
  start_date: string
  end_date: string
  /** Kosong = semua yang belum di-settle di periode itu. */
  transaction_item_ids?: string[]
  /** Langsung lunas tanpa draft. */
  pay?: boolean
}

export interface PayConsignorPayload {
  supplier_id: string
  amount: number
  note?: string
}

export const getConsignmentProducts = (params: { outlet_id: string; consignor_id: string }) =>
  api.get<ApiResponse<ConsignmentProduct[]>>('/consignment/products', { params })

/** Penitip yang masih harus dibayar; `all` ikut menampilkan yang lunas. */
export const getConsignorOutstanding = (params?: { all?: boolean }) =>
  api.get<ApiResponse<ConsignorBalance[]>>('/consignment/outstanding', { params: params?.all ? { all: 1 } : undefined })

export const getConsignmentUnsettled = (params: { supplier_id: string; start_date: string; end_date: string }) =>
  api.get<ApiResponse<ConsignmentUnsettledItem[]>>('/consignment/unsettled', { params })

export const getConsignmentSettlements = (params: { start_date: string; end_date: string }) =>
  api.get<ApiResponse<ConsignmentSettlement[]>>('/consignment/settlements', { params })

export const getConsignmentSettlement = (id: string) =>
  api.get<ApiResponse<ConsignmentSettlement>>(`/consignment/settlements/${id}`)

export const createConsignmentSettlement = (data: CreateSettlementPayload) =>
  api.post<ApiResponse<{ id: string; total: number; paid: boolean }>>('/consignment/settlements', data)

export const payConsignmentSettlement = (id: string) =>
  api.post<ApiResponse<{ id: string; status: string }>>(`/consignment/settlements/${id}/pay`, {})

export const cancelConsignmentSettlement = (id: string) =>
  api.post<ApiResponse<{ id: string; status: string }>>(`/consignment/settlements/${id}/cancel`, {})

/** Menyerahkan uang ke penitip sebesar nominal pilihan (boleh sebagian). */
export const payConsignor = (data: PayConsignorPayload) =>
  api.post<ApiResponse<{ id: string; amount: number; balance_before: number; balance_after: number }>>('/consignment/payments', data)

/** Daftar retur barang ke penitip, terbaru di atas (maks 500 baris). */
export const getConsignmentReturns = (params?: { start_date?: string; end_date?: string; outlet_id?: string }) =>
  api.get<ApiResponse<ConsignmentReturn[]>>('/consignment-return', { params })
