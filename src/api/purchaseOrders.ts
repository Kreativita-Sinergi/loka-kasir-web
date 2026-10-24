import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, PurchaseOrder } from '@/types'

/** Satu baris PO: isi raw_material_id ATAU product_id. Jumlah & harga dalam
 *  satuan dasar (gram/pcs); unit_id / use_purchase_unit hanya mencatat satuan
 *  beli yang dipilih. */
export interface POItemPayload {
  raw_material_id?: string
  product_id?: string
  variant_id?: string
  unit_id?: string
  use_purchase_unit?: boolean
  quantity_ordered: number
  unit_cost: number
}

export interface CreatePOPayload {
  supplier_id?: string | null
  /** Outlet tujuan stok produk — wajib bila ada baris produk. */
  outlet_id?: string | null
  po_number: string
  order_date: string // YYYY-MM-DD
  expected_date?: string | null
  notes?: string | null
  items: POItemPayload[]
}

export interface ReceiveItemPayload {
  item_id: string
  quantity_received: number
  unit_cost: number
}

export interface ReceivePOPayload {
  items: ReceiveItemPayload[]
  /** Harga modal produk diganti harga beli. Bawaan server: ya. */
  update_cost?: boolean
}

export interface RestockSuggestion {
  item_type?: 'raw_material' | 'product'
  raw_material_id: string | null
  product_id?: string | null
  variant_id?: string | null
  name?: string
  variant_name?: string | null
  is_weight_based?: boolean
  raw_material_name: string
  unit_alias: string
  current_stock: number
  min_stock: number
  average_daily_usage: number
  days_of_cover: number | null
  recommended_quantity: number
  estimated_unit_cost: number
  suggested_supplier_id: string | null
  suggested_supplier_name: string | null
}

export const getPurchaseOrders = (params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<PurchaseOrder>>('/purchase-order', { params })

export const getPurchaseOrderById = (id: string) =>
  api.get<ApiResponse<PurchaseOrder>>(`/purchase-order/${id}`)

/** Saran restok; dengan [outletId] ikut produk yang stoknya menipis di sana. */
export const getRestockSuggestions = (outletId?: string | null) =>
  api.get<ApiResponse<RestockSuggestion[]>>('/purchase-order/restock-suggestions', {
    params: outletId ? { include_products: true, outlet_id: outletId } : undefined,
  })

export interface POProductSaleUnit {
  id: string | null
  name: string
  conversion: number
  is_purchase_unit: boolean
}

export interface POProductVariant {
  id: string
  name: string
  sku?: string | null
  current_cost: number
  last_unit_cost: number | null
  stock: number
}

/** Produk yang bisa dibeli lewat PO. Harga & stok per satuan dasar. */
export interface POProductOption {
  product_id: string
  name: string
  sku?: string | null
  has_variant: boolean
  is_weight_based: boolean
  track_stock: boolean
  base_unit: string
  current_cost: number
  last_unit_cost: number | null
  stock: number
  variants: POProductVariant[]
  sale_units: POProductSaleUnit[]
}

export const searchPOProducts = (params: { search?: string; outlet_id?: string | null; limit?: number }) =>
  api.get<ApiResponse<POProductOption[]>>('/purchase-order/products', {
    params: { ...params, search: params.search || undefined, outlet_id: params.outlet_id || undefined },
  })

export const createPurchaseOrder = (data: CreatePOPayload) =>
  api.post<ApiResponse<PurchaseOrder>>('/purchase-order', data)

export const receivePurchaseOrder = (id: string, data: ReceivePOPayload) =>
  api.post<ApiResponse<PurchaseOrder>>(`/purchase-order/${id}/receive`, data)

export const cancelPurchaseOrder = (id: string) =>
  api.patch<ApiResponse<PurchaseOrder>>(`/purchase-order/${id}/cancel`)

export const deletePurchaseOrder = (id: string) =>
  api.delete<ApiResponse<null>>(`/purchase-order/${id}`)

/** Baris nota seperti tertulis (lihat POST /purchase-order/from-receipt). */
export interface ReceiptLine {
  text: string
  qty: number
  unit: string
  unit_price: number
  line_total: number
}

export interface ReceiptPhotoResult {
  supplier_name: string
  supplier_id: string | null
  receipt_date: string
  receipt_total: number
  /** Baris yang cocok — bentuknya sama dengan saran restok untuk formulir PO. */
  matched: RestockSuggestion[]
  matched_lines: ReceiptLine[]
  unmatched: ReceiptLine[]
}

export const readReceiptPhotos = (form: FormData, outletId?: string) =>
  api.post<ApiResponse<ReceiptPhotoResult>>('/purchase-order/from-receipt', form, {
    params: outletId ? { outlet_id: outletId } : undefined,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 150_000,
  })
