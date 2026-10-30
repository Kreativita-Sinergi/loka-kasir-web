import api from '@/lib/axios'
import type { ApiResponse } from '@/types'

// Produksi / Perakitan — lihat service/production_service.go. Pro; izin
// inventory.hpp atau inventory.edit (laporan juga reports.financial).

export type ProductionComponentType = 'raw_material' | 'product'

export interface ProductionOrderItem {
  id: string
  component_type: ProductionComponentType
  raw_material_id: string | null
  product_id: string | null
  variant_id: string | null
  name: string
  unit_name: string | null
  qty: number
  unit_cost: number
  total_cost: number
}

export interface ProductionOrder {
  id: string
  number: string
  outlet_id: string
  outlet_name: string
  product_id: string
  variant_id: string | null
  product_name: string
  variant_name: string | null
  qty_output: number
  unit_cost: number
  total_cost: number
  notes: string | null
  status: 'done' | 'voided'
  produced_at: string
  /** Harga modal barang jadi sebelum/sesudah (rata-rata tertimbang); null = tidak diubah. */
  cost_before: number | null
  cost_after: number | null
  created_by_name: string | null
  created_at: string
  voided_at: string | null
  voided_by_name: string | null
  void_reason: string | null
  item_count: number
  items?: ProductionOrderItem[]
}

/** Hanya produksi berstatus done yang dijumlahkan. */
export interface ProductionSummary {
  orders: number
  voided: number
  qty_output: number
  total_cost: number
}

export interface ProductionOrderList {
  from: string
  to: string
  summary: ProductionSummary
  orders: ProductionOrder[]
  pagination: { page: number; limit: number; total: number }
}

export interface ProductionProduct {
  id: string
  name: string
  sku: string | null
  stock_mode: 'on_sale' | 'produced'
  has_variant: boolean
  is_weight_based: boolean
  component_count: number
  unit_name: string | null
  variants: { id: string; name: string }[]
}

export interface ProductionComponentInput {
  raw_material_id?: string
  product_id?: string
  variant_id?: string
  qty: number
}

export interface ProductionOrderInput {
  outlet_id: string
  product_id: string
  variant_id?: string
  qty_output: number
  notes?: string
  update_cost?: boolean
  /** Tidak dikirim = resep produk dikali jumlah hasil (dihitung server). */
  items?: ProductionComponentInput[]
}

export interface ProductionPreviewComponent {
  component_type: ProductionComponentType
  raw_material_id: string | null
  product_id: string | null
  variant_id: string | null
  name: string
  unit_name: string | null
  /** Takaran resep per 1 hasil; null untuk komponen tambahan. */
  qty_per_unit: number | null
  qty: number
  available: number
  unit_cost: number
  total_cost: number
  sufficient: boolean
  tracked: boolean
}

export interface ProductionPreview {
  product_id: string
  variant_id: string | null
  product_name: string
  variant_name: string | null
  unit_name: string | null
  stock_mode: 'on_sale' | 'produced'
  has_recipe: boolean
  qty_output: number
  current_stock: number
  current_cost: number | null
  total_cost: number
  unit_cost: number
  shortages: number
  can_save: boolean
  problem: string | null
  components: ProductionPreviewComponent[]
}

export interface ProductionReport {
  from: string
  to: string
  summary: ProductionSummary
  orders: ProductionOrder[]
  products: {
    product_id: string
    variant_id: string | null
    product_name: string
    variant_name: string | null
    orders: number
    qty_output: number
    total_cost: number
    avg_cost: number
  }[]
  components: {
    component_type: ProductionComponentType
    raw_material_id: string | null
    product_id: string | null
    variant_id: string | null
    name: string
    unit_name: string | null
    qty: number
    total_cost: number
    avg_cost: number
  }[]
}

export const productionDisplayName = (o: { product_name: string; variant_name: string | null }) =>
  o.variant_name ? `${o.product_name} — ${o.variant_name}` : o.product_name

/** Kunci satu komponen — sama untuk isian dan baris pratinjau. */
export const componentKey = (c: { raw_material_id?: string | null; product_id?: string | null; variant_id?: string | null }) =>
  c.raw_material_id ? `rm:${c.raw_material_id}` : `p:${c.product_id ?? ''}:${c.variant_id ?? ''}`

export const getProductionProducts = (params?: { search?: string; components?: boolean }) =>
  api.get<ApiResponse<ProductionProduct[]>>('/production/products', { params })

export const previewProduction = (body: ProductionOrderInput) =>
  api.post<ApiResponse<ProductionPreview>>('/production/preview', body)

export const createProduction = (body: ProductionOrderInput, idempotencyKey: string) =>
  api.post<ApiResponse<ProductionOrder>>('/production/orders', body, { headers: { 'Idempotency-Key': idempotencyKey } })

export const getProductionOrders = (params: { start_date?: string; end_date?: string; outlet_id?: string; search?: string; page?: number; limit?: number }) =>
  api.get<ApiResponse<ProductionOrderList>>('/production/orders', { params })

export const getProductionOrder = (id: string) =>
  api.get<ApiResponse<ProductionOrder>>(`/production/orders/${id}`)

export const voidProduction = (id: string, reason: string) =>
  api.post<ApiResponse<ProductionOrder>>(`/production/orders/${id}/void`, { reason })

export const getProductionReport = (params: { start_date?: string; end_date?: string; outlet_id?: string }) =>
  api.get<ApiResponse<ProductionReport>>('/production/report', { params })
