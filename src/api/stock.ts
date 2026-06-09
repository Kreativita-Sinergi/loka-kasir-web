import api from '@/lib/axios'
import type { ApiResponse, StockTransfer, StockMovement, OutletStock, StockEntryPayload, StockAdjustmentPayload } from '@/types'

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

// ─── OutletStock ─────────────────────────────────────────────────────────────

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

