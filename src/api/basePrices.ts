import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, Product } from '@/types'

/**
 * Produk yang harga modalnya belum diisi.
 *
 * Server menghitung "belum diisi" sebagai: modal kosong, nol, ATAU sama/lebih
 * besar dari harga jual (sisa adopsi katalog yang menyamakan modal = jual).
 * Produk bervarian dan produk bertimer tidak ikut — modalnya hidup di tempat
 * lain. Diurutkan dari harga jual termahal; tanpa parameter pencarian.
 * Limit maksimum 100.
 */
export const getProductsWithoutCost = (params: { page: number; limit: number }) =>
  api.get<PaginatedApiResponse<Product>>('/product/without-cost', { params })

export interface BasePriceItem {
  id: string
  /** Boleh nol (hadiah/sampel), tidak boleh negatif. */
  base_price: number
}

/**
 * Menyimpan harga modal sederet produk SEKALIGUS — satu transaksi di server,
 * maksimum 200 baris per panggilan.
 */
export const updateBasePrices = (items: BasePriceItem[]) =>
  api.put<ApiResponse<{ updated: number }>>('/product/base-prices', { items })
