import { parseNumericInput } from '@/lib/materialUnits'
import { weightUnitScale } from '@/lib/money'

/**
 * Harga modal sebuah produk (atau variannya) dan stok semua outlet yang
 * menanggungnya — padanan `repository.ProductCostBasis` di server
 * (`GET /outlet-stock/cost`).
 *
 * Barang yang masuk dengan harga beli membuat harga modal jadi rata-rata
 * tertimbang stok lama dan barang baru. Rumusnya milik server; di sini hanya
 * untuk pratinjau "modal lama → modal baru" sebelum disimpan.
 */
export interface ProductCostBasis {
  /** Harga modal saat ini; null = belum diisi. Per kg untuk produk timbangan. */
  cost: number | null
  /** Total stok positif semua outlet, satuan stok (gram untuk timbangan). */
  stock: number
  track_stock: boolean
  is_weight_based: boolean
}

/** Ada stok lama berharga modal yang ikut ditimbang. */
export function costAverages(b: ProductCostBasis): boolean {
  return (b.cost ?? 0) > 0 && b.stock > 0
}

/**
 * Harga modal setelah `qty` (satuan stok) masuk seharga `unitCost` per satuan
 * harga modal. null = harga modal tidak berubah (harga beli 0 / jumlah kosong).
 * Sama persis dengan `repository.WeightedProductCost`.
 */
export function weightedCost(b: ProductCostBasis, qty: number, unitCost: number): number | null {
  if (!(unitCost > 0) || !(qty > 0)) return null
  const round = (v: number) => Math.round(v * 100) / 100
  if (!costAverages(b)) return round(unitCost)
  return round((b.stock * (b.cost as number) + qty * unitCost) / (b.stock + qty))
}

/**
 * Harga beli yang diketik (per satuan ketik: kg/ons/gram untuk timbangan,
 * satuan dasar untuk lainnya) → harga per satuan harga modal (per kg untuk
 * timbangan) seperti yang diminta server. undefined bila kosong.
 */
export function stockEntryUnitCost(input: string, weight: boolean, weightUnit?: string | null): number | undefined {
  const n = parseNumericInput(input)
  if (!Number.isFinite(n) || n <= 0) return undefined
  return weight ? (n / weightUnitScale(weightUnit)) * 1000 : n
}
