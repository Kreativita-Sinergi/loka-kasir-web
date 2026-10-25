import type { Product, ProductVariant } from '@/types'

/** Harga yang tampil di menu publik; 0 untuk produk yang harganya dari ekstra. */
export const productPrice = (p: Product) => p.price_from_extras ? 0 : p.final_price ?? p.sell_price ?? 0
export const variantPrice = (v: ProductVariant) => v.final_price ?? v.sell_price ?? 0

/**
 * Harga member, hanya bila memang lebih murah dari harga yang tampil —
 * pembeli membandingkan dua angka itu sebelum memesan. Harga akhirnya tetap
 * dihitung server dari pelanggan yang dikenali lewat nomor HP/nama.
 */
export const memberPriceBelow = (memberPrice: number | null | undefined, price: number) =>
  memberPrice != null && memberPrice > 0 && memberPrice < price ? memberPrice : null

export interface MemberPerks {
  /** Jumlah menu (produk, atau produk bervarian) yang punya harga member. */
  count: number
  /** Selisih terbesar harga biasa − harga member, per item. */
  maxSaving: number
}

/**
 * Ringkasan keuntungan member dari isi menu, untuk ajakan mendaftar. Produk
 * bervarian dihitung sekali bila salah satu variannya berharga member.
 */
export function memberPerks(products: Product[]): MemberPerks {
  const saving = (memberPrice: number | null | undefined, price: number) => {
    const member = memberPriceBelow(memberPrice, price)
    return member == null ? 0 : price - member
  }
  let count = 0
  let maxSaving = 0
  for (const p of products) {
    const savings = p.has_variant
      ? (p.variants ?? []).filter((v) => v.is_available && v.is_active).map((v) => saving(v.member_price, variantPrice(v)))
      : p.price_from_extras ? [] : [saving(p.member_price, productPrice(p))]
    const best = Math.max(0, ...savings)
    if (best > 0) {
      count++
      maxSaving = Math.max(maxSaving, best)
    }
  }
  return { count, maxSaving }
}
