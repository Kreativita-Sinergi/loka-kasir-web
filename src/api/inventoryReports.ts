import api from '@/lib/axios'
import type { ApiResponse } from '@/types'

// Laporan Persediaan — lihat service/inventory_report_service.go.

/** variant | product | recipe | consignment | none (HPP belum diisi). */
export type ValuationCostSource = 'variant' | 'product' | 'recipe' | 'consignment' | 'none'

export interface InventoryValuationItem {
  product_id: string
  variant_id: string | null
  name: string
  variant_name: string
  sku: string
  category_id: string | null
  category_name: string
  /** Barang terukur: GRAM — cetak lewat formatStockQuantity. */
  quantity: number
  is_weight_based: boolean
  weight_unit: string
  /** HPP per satuan jual; per KILOGRAM untuk barang terukur. */
  unit_cost: number
  cost_source: ValuationCostSource
  value: number
  negative_stock: boolean
  is_consignment: boolean
  consignor_name: string
}

export interface InventoryValuationRawMaterial {
  id: string
  name: string
  sku: string
  unit: string
  quantity: number
  unit_cost: number
  value: number
  missing_cost: boolean
  negative_stock: boolean
}

export interface InventoryValuationCategory {
  category_id: string | null
  category_name: string
  item_count: number
  value: number
}

export interface InventoryValuationReport {
  outlet_id: string | null
  generated_at: string
  summary: {
    /** Produk milik toko + bahan baku; barang titipan di luar. */
    total_value: number
    product_value: number
    raw_material_value: number
    item_count: number
    raw_material_count: number
    missing_cost_count: number
    negative_stock_count: number
    consignment_count: number
    consignment_value: number
  }
  categories: InventoryValuationCategory[]
  items: InventoryValuationItem[]
  raw_materials: InventoryValuationRawMaterial[]
}

export const getInventoryValuation = (params?: { outlet_id?: string }) =>
  api.get<ApiResponse<InventoryValuationReport>>('/inventory-report/valuation', { params })

export interface StockCardEntry {
  id: string
  occurred_at: string
  /** Kode bebas dari server; jenis yang belum dikenal ditampilkan apa adanya. */
  type: string
  reference: string
  outlet_id: string | null
  outlet_name: string
  actor_name: string
  notes: string
  in: number
  out: number
  /** Saldo SETELAH baris ini. */
  balance: number
}

export interface StockCardReport {
  kind: 'product' | 'variant' | 'raw_material'
  product_id: string | null
  variant_id: string | null
  raw_material_id: string | null
  name: string
  variant_name: string
  sku: string
  unit: string
  is_weight_based: boolean
  weight_unit: string
  outlet_id: string | null
  from: string
  to: string
  opening_qty: number
  total_in: number
  total_out: number
  closing_qty: number
  current_qty: number
  /** Stok tanpa riwayat mutasi (mis. stok awal produk); sudah ikut saldo awal. */
  untracked_difference: number
  entries: StockCardEntry[]
  page: number
  limit: number
  total: number
}

export interface StockCardParams {
  product_id?: string
  variant_id?: string
  raw_material_id?: string
  outlet_id?: string
  start_date: string
  end_date: string
  page?: number
  limit?: number
}

export const getStockCard = (params: StockCardParams) =>
  api.get<ApiResponse<StockCardReport>>('/inventory-report/stock-card', { params })

/** Halaman terbesar yang diterima server — dipakai saat ekspor CSV. */
export const STOCK_CARD_EXPORT_LIMIT = 1000
