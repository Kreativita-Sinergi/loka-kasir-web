import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, Product } from '@/types'

export const getProducts = (params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<Product>>('/product', { params })

export const setProductActive = (id: string, isActive: boolean) =>
  api.put<ApiResponse<{ message: string }>>(`/product/${id}/active`, { is_active: isActive })

export const setProductAvailable = (id: string, isAvailable: boolean) =>
  api.put<ApiResponse<{ message: string }>>(`/product/${id}/available`, { is_available: isAvailable })

// ── Barcode ────────────────────────────────────────────────────────────────

export interface BarcodeLookupResult {
  product: Product
  /** Terisi bila kode itu menempel pada satu varian, bukan produk induknya. */
  variant_id: string | null
}

/**
 * Mencari pemilik sebuah barcode.
 *
 * Server menjawab **404** bila kodenya belum terdaftar — itu jawaban yang wajar
 * di sini, bukan kegagalan, dan justru jawaban yang paling sering diharapkan
 * saat orang mendaftarkan barang baru. Pemanggil harus menangkapnya.
 */
export const lookupBarcode = (code: string) =>
  api.get<ApiResponse<BarcodeLookupResult>>(`/product/barcode/${encodeURIComponent(code)}`)

// ── Nested payload types ───────────────────────────────────────────────────

export interface OutletStockConfig {
  outlet_id: string
  initial_stock: number
  min_stock: number
}

export interface OutletPriceConfig {
  outlet_id: string
  base_price?: number | null
  sell_price?: number | null
}

export interface VariantPayload {
  /**
   * Id varian yang sudah ada. Dihilangkan untuk kombinasi baru — server yang
   * membuatkan idnya.
   */
  id?: string
  name: string
  sku?: string
  /** Kode batang varian ini. Kosong = hapus semua; dihilangkan = jangan ubah. */
  barcodes?: string[]
  description?: string
  base_price?: number | null
  sell_price?: number | null
  track_stock?: boolean
  is_active?: boolean
  is_available?: boolean
  outlet_stocks?: OutletStockConfig[]
  outlet_prices?: OutletPriceConfig[]
}

export interface CreateProductPayload {
  name: string
  sku?: string
  barcodes?: string[]
  description?: string
  base_price?: number | null
  sell_price?: number | null
  category_id?: string | null
  brand_id?: string | null
  unit_id?: string | null
  tax_id?: string | null
  track_stock?: boolean
  is_active?: boolean
  is_available?: boolean
  is_cookable?: boolean
  is_weight_based?: boolean
  image?: string
  variants?: VariantPayload[]
  outlet_stocks?: OutletStockConfig[]
  outlet_prices?: OutletPriceConfig[]
}

export const createProduct = (data: CreateProductPayload) =>
  api.post<ApiResponse<Product>>('/product', data)

// ─── CSV Import ───────────────────────────────────────────────────────────────

interface ImportRowError {
  row: number
  product: string
  message: string
}

export interface ImportResult {
  total: number
  success: number
  failed: number
  errors: ImportRowError[]
}

export const importProductsCSV = (file: File, outletId?: string) => {
  const form = new FormData()
  form.append('file', file)
  if (outletId) form.append('outlet_id', outletId)
  return api.post<{ status: boolean; message: string; data: ImportResult }>(
    '/product/import',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
}

export const downloadProductTemplate = () =>
  api.get('/product/import/template', { responseType: 'blob' })

export interface UpdateProductPayload {
  name: string
  sku?: string | null
  barcodes?: string[]
  description?: string | null
  base_price?: number | null
  sell_price?: number | null
  category_id?: string | null
  brand_id?: string | null
  unit_id?: string | null
  tax_id?: string | null
  track_stock?: boolean
  is_active?: boolean
  is_available?: boolean
  is_cookable?: boolean
  is_weight_based?: boolean
  image?: string | null
  variants?: (VariantPayload & { business_id: string })[]
}

export const updateProduct = (id: string, data: UpdateProductPayload) =>
  api.put<ApiResponse<Product>>(`/product/${id}`, data)

export const deleteProduct = (id: string) =>
  api.delete(`/product/${id}`)
