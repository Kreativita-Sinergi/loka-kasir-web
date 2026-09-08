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
  // ── Apotek ──────────────────────────────────────────────────────────────
  // Golongan obat; null berarti barang ini BUKAN obat. Golongan KERAS ke atas
  // menuntut data resep pada notanya — ditegakkan server.
  drug_class?: string | null
  active_ingredient?: string | null
  bpom_registration?: string | null
  purchase_unit_id?: string | null
  units_per_purchase?: number | null
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
  // ── Apotek ──────────────────────────────────────────────────────────────
  // Golongan obat; null berarti barang ini BUKAN obat. Golongan KERAS ke atas
  // menuntut data resep pada notanya — ditegakkan server.
  drug_class?: string | null
  active_ingredient?: string | null
  bpom_registration?: string | null
  purchase_unit_id?: string | null
  units_per_purchase?: number | null
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

/** Mengunduh seluruh produk sebagai CSV berformat template impor.
 *
 *  Berkasnya bisa langsung diunggah lewat {@link importProductsCSV} di bisnis
 *  lain — itulah gunanya: pemilik yang membuka cabang kedua tidak perlu
 *  mengetik ulang katalog yang sudah rapi di cabang pertama. */
export const exportProductsCSV = (outletId?: string) =>
  api.get('/product/export', {
    responseType: 'blob',
    params: outletId ? { outlet_id: outletId } : undefined,
  })

// ─── Katalog produk bersama ───────────────────────────────────────────────────

/** Satu barang di katalog bersama.
 *
 *  Tidak ada harga modal, dan itu disengaja: katalog dipakai lintas toko, dan
 *  harga modal adalah margin usaha orang lain. `suggested_sell_price` adalah
 *  median dari beberapa toko — `null` berarti penyumbangnya belum cukup untuk
 *  menyarankan angka apa pun, bukan gratis. */
export interface CatalogProduct {
  id: string
  barcode: string | null
  name: string
  category_name: string | null
  brand_name: string | null
  unit_name: string | null
  image: string | null
  /** Golongan obat (BEBAS, KERAS, …) — hanya untuk barang apotek. `null`
   *  berarti BUKAN obat, dan itu mayoritas isi rak apotek: popok, susu, alat
   *  kesehatan. Katalog hanya memuatnya bila toko-toko penyumbangnya sepakat;
   *  begitu ada perselisihan, kolomnya kosong dan apotek mengisinya sendiri. */
  drug_class: string | null
  active_ingredient: string | null
  bpom_registration: string | null
  suggested_sell_price: number | null
  /** Jumlah toko yang menyumbang baris ini — ditampilkan apa adanya supaya
   *  pemilik toko bisa menimbang sendiri seberapa bisa dipercaya barisnya. */
  source_business_count: number
  is_weight_based: boolean
}

/** Satu rak katalog beserta jumlah isinya.
 *
 *  Katalog yang hanya bisa DICARI tidak menolong toko yang baru buka:
 *  pemiliknya belum tahu harus mengetik apa. Nama kosong berarti "tanpa
 *  kategori" — judulnya diputuskan layar, bukan server. */
export interface CatalogCategory {
  name: string
  product_count: number
}

/** Mencari isi katalog. `query` dan `category` boleh kosong dua-duanya: layar
 *  telusur membukanya begitu saja, karena toko yang baru berdiri belum tahu
 *  harus mengetik apa. */
export const searchCatalog = (query: string, category = '', limit = 50) =>
  api.get<ApiResponse<CatalogProduct[]>>('/product/catalog', {
    params: { q: query, category, limit },
  })

export const catalogCategories = () =>
  api.get<ApiResponse<CatalogCategory[]>>('/product/catalog/categories')

/** Mencari satu barang katalog dari hasil pindaian.
 *
 *  404 di sini adalah jawaban normal, bukan kerusakan: katalog tidak pernah
 *  memuat seluruh barang yang beredar, dan pemanggil harus menawarkan isi
 *  manual alih-alih menampilkan galat. */
export const lookupCatalogBarcode = (code: string) =>
  api.get<ApiResponse<CatalogProduct>>(`/product/catalog/barcode/${encodeURIComponent(code)}`)

export interface AdoptCatalogItem {
  master_product_id: string
  sell_price?: number | null
  base_price?: number | null
  initial_stock?: number
  min_stock?: number
}

/** Menyalin barang katalog menjadi produk milik toko ini.
 *
 *  Membalas 200 bahkan saat sebagian gagal; rangkumannya sama bentuknya dengan
 *  hasil impor CSV. */
export const adoptFromCatalog = (items: AdoptCatalogItem[]) =>
  api.post<ApiResponse<ImportResult>>('/product/catalog/adopt', { items })

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
  // ── Apotek ──────────────────────────────────────────────────────────────
  drug_class?: string | null
  active_ingredient?: string | null
  bpom_registration?: string | null
  purchase_unit_id?: string | null
  units_per_purchase?: number | null
}

export const updateProduct = (id: string, data: UpdateProductPayload) =>
  api.put<ApiResponse<Product>>(`/product/${id}`, data)

export const deleteProduct = (id: string) =>
  api.delete(`/product/${id}`)
