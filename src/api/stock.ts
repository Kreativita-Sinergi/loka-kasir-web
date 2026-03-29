import api from '@/lib/axios'
import type { ApiResponse, StockTransfer, StockMovement, OutletConfig, OutletStock, StockEntryPayload, StockAdjustmentPayload } from '@/types'

// ─── StockTransfer ──────────────────────────────────────────────────────────

interface StockTransferListResponse {
  status: boolean
  message: string
  data: StockTransfer[]
  pagination: { page: number; limit: number; total: number }
}

export const createStockTransfer = (data: {
  business_id: string
  from_outlet_id: string
  to_outlet_id: string
  product_id: string
  variant_id?: string | null
  quantity: number
  notes?: string | null
}) => api.post<ApiResponse<StockTransfer>>('/stock-transfer', data)

export const getStockTransferById = (id: string) =>
  api.get<ApiResponse<StockTransfer>>(`/stock-transfer/${id}`)

export const getStockTransfersByBusiness = (businessId: string, params?: Record<string, unknown>) =>
  api.get<StockTransferListResponse>(`/stock-transfer/business/${businessId}`, { params })

export const approveStockTransfer = (id: string) =>
  api.put<ApiResponse<StockTransfer>>(`/stock-transfer/${id}/approve`)

export const completeStockTransfer = (id: string) =>
  api.put<ApiResponse<StockTransfer>>(`/stock-transfer/${id}/complete`)

export const cancelStockTransfer = (id: string) =>
  api.put<ApiResponse<StockTransfer>>(`/stock-transfer/${id}/cancel`)

// ─── StockMovement ──────────────────────────────────────────────────────────

interface StockMovementListResponse {
  status: boolean
  message: string
  data: StockMovement[]
  pagination: { page: number; limit: number; total: number }
}

export const getStockMovementsByBusiness = (businessId: string, params?: Record<string, unknown>) =>
  api.get<StockMovementListResponse>(`/stock-movement/business/${businessId}`, { params })

export const getStockMovementsByOutlet = (outletId: string, params?: Record<string, unknown>) =>
  api.get<StockMovementListResponse>(`/stock-movement/outlet/${outletId}`, { params })

// ─── OutletStock ─────────────────────────────────────────────────────────────

export const getOutletStocks = (outletId: string) =>
  api.get<ApiResponse<OutletStock[]>>(`/outlet/${outletId}/stock`)

// Mengembalikan SEMUA produk aktif (LEFT JOIN) — qty=0 jika belum pernah diisi.
export const getOutletStocksAll = (outletId: string) =>
  api.get<ApiResponse<OutletStock[]>>('/outlet-stock/all', { params: { outlet_id: outletId } })

// Stok Masuk (IN) — menambah quantity ke outlet_stock + catat mutasi.
export const addStock = (data: StockEntryPayload) =>
  api.post<ApiResponse<OutletStock>>('/outlet-stock/entry', data)

// Penyesuaian stok — set quantity ke nilai fisik aktual + catat mutasi ADJUSTMENT.
export const adjustStock = (data: StockAdjustmentPayload) =>
  api.post<ApiResponse<OutletStock>>('/outlet-stock/adjust', data)

// NOTE: IsAvailable lives on Product (global across all outlets).
// This toggles availability business-wide, not per-outlet.
export const updateProductAvailability = (productId: string, isAvailable: boolean) =>
  api.put(`/product/${productId}/available`, { is_available: isAvailable })

// ─── OutletConfig ───────────────────────────────────────────────────────────

export const upsertOutletConfig = (outletId: string, data: {
  outlet_id: string
  has_table: boolean
  has_kitchen: boolean
  auto_print: boolean
}) => api.put<ApiResponse<OutletConfig>>(`/outlet/${outletId}/config`, data)

export const getOutletConfig = (outletId: string) =>
  api.get<ApiResponse<OutletConfig>>(`/outlet/${outletId}/config`)
