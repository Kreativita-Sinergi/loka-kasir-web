import type { SelfOrderItem } from '@/api/public'
import type { PriceTier } from '@/types'

/** Satu baris keranjang menu publik, sebatas yang dibutuhkan untuk memesan. */
export interface CartLineForOrder {
  qty: number
  payload: SelfOrderItem
}

/**
 * Item pesanan yang dikirim ke server dari isi keranjang.
 *
 * Jumlahnya diambil dari baris keranjang, BUKAN dari payload. Payload dibuat
 * sekali saat item pertama kali masuk keranjang dengan quantity 1, sedangkan
 * tombol + dan − hanya mengubah `qty` barisnya. Dulu payload dikirim apa
 * adanya: "Es teh × 3" di keranjang tercatat "Es teh × 1" di server — kasir
 * menerima jumlah yang salah, dan pesanan yang dibayar QRIS di depan ditagih
 * kurang dari total yang dilihat pembeli.
 */
export const orderItemsFromCart = (lines: CartLineForOrder[]): SelfOrderItem[] =>
  lines
    .filter((l) => l.qty > 0)
    .map((l) => ({ ...l.payload, quantity: l.qty }))

/**
 * Harga satuan untuk pembelian sebanyak `units`: tingkat grosir dengan jumlah
 * minimum terbesar yang sudah tercapai, dan hanya bila lebih murah dari
 * `base`. Aturannya sama persis dengan server (`PriceTiers.UnitPrice`) —
 * total yang dilihat pembeli harus sama dengan tagihan QRIS-nya.
 */
export const tierUnitPrice = (tiers: PriceTier[] | undefined, units: number, base: number): number => {
  let best: PriceTier | undefined
  for (const t of tiers ?? []) {
    if (t.min_qty <= 0 || units + 1e-9 < t.min_qty) continue
    if (!best || t.min_qty > best.min_qty) best = t
  }
  if (!best || best.price <= 0 || best.price >= base) return base
  return best.price
}

/** Baris keranjang yang tahu harga grosirnya. */
export interface PricedCartLine {
  qty: number
  /** Harga satuan biasa, sudah termasuk add-on. */
  unitPrice: number
  /** Harga katalog produk/varian tanpa add-on — dasar tingkat grosir. */
  basePrice: number
  tiers?: PriceTier[]
  /** Harga member produk/varian (tanpa add-on), bila lebih murah dari katalog. */
  memberPrice?: number | null
}

/**
 * Harga katalog yang ditagih untuk baris ini: grosir, lalu harga member bila
 * pembelinya member dan harganya lebih murah lagi — sama dengan server
 * (`SellUnitPriceSource`).
 */
const lineBasePrice = (l: PricedCartLine, member: boolean): number => {
  const price = tierUnitPrice(l.tiers, l.qty, l.basePrice)
  return member && l.memberPrice != null && l.memberPrice > 0 && l.memberPrice < price ? l.memberPrice : price
}

/** Harga satuan yang ditagih: add-on tetap ditambahkan di atas harga katalog. */
export const lineUnitPrice = (l: PricedCartLine, member = false): number =>
  l.unitPrice - (l.basePrice - lineBasePrice(l, member))

export const lineTotal = (l: PricedCartLine, member = false): number => lineUnitPrice(l, member) * l.qty

/** Baris ini memakai harga member (bukan harga biasa atau grosir). */
export const lineUsesMemberPrice = (l: PricedCartLine, member: boolean): boolean =>
  lineBasePrice(l, member) < tierUnitPrice(l.tiers, l.qty, l.basePrice)
