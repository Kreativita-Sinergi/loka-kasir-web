import { pricePerWeightUnit, weightUnitScale, type WeightUnit } from '@/lib/money'
import type { MessageKey } from '@/lib/messages'
import type { PriceTier } from '@/types'

/** Satu baris harga grosir seperti diketik — dalam satuan jual yang tampil. */
export interface TierRow {
  min_qty: string
  price: string
}

export const MAX_PRICE_TIERS = 10

const round = (v: number, digits: number) => String(Number(v.toFixed(digits)))

/**
 * Tingkat dari server → baris form. Barang terukur ([unit] diisi) menyimpan
 * minimum dalam kg dan harga per kg; form menampilkannya dalam satuan jual.
 */
export function tiersToRows(tiers: PriceTier[] | undefined, unit?: WeightUnit): TierRow[] {
  return [...(tiers ?? [])]
    .sort((a, b) => a.min_qty - b.min_qty)
    .map((tier) => ({
      min_qty: unit ? round((tier.min_qty * 1000) / weightUnitScale(unit), 3) : String(tier.min_qty),
      price: unit ? round(pricePerWeightUnit(tier.price, unit), 2) : String(tier.price),
    }))
}

/** Baris form → `price_tiers` untuk server. Baris kosong dilewati. */
export function rowsToTiers(rows: TierRow[], unit?: WeightUnit): PriceTier[] {
  const out: PriceTier[] = []
  for (const r of rows) {
    const min = Number(r.min_qty.replace(',', '.'))
    const price = Number(r.price)
    if (r.min_qty.trim() === '' || r.price.trim() === '' || !Number.isFinite(min) || !Number.isFinite(price)) continue
    out.push({
      min_qty: unit ? (min * weightUnitScale(unit)) / 1000 : min,
      price: unit ? Number(round((price * 1000) / weightUnitScale(unit), 2)) : price,
    })
  }
  return out
}

/**
 * Kesalahan pertama pada baris-baris grosir, atau null. Tingkat yang tidak
 * lebih murah dari harga jual ditolak di sini karena server mengabaikannya —
 * pemilik yang tidak diberi tahu akan mengira grosirnya berlaku.
 */
export function tierRowsError(rows: TierRow[], sellPrice: string, measured: boolean): MessageKey | null {
  const sell = Number(sellPrice)
  const seen = new Set<number>()
  for (const r of rows) {
    if (r.min_qty.trim() === '' && r.price.trim() === '') continue
    const min = Number(r.min_qty.replace(',', '.'))
    const price = Number(r.price)
    if (!Number.isFinite(min) || min <= 0) return 'priceTierErrMin'
    if (!measured && (min < 2 || !Number.isInteger(min))) return 'priceTierErrMinPcs'
    if (!Number.isFinite(price) || price <= 0) return 'priceTierErrPrice'
    if (sell > 0 && price >= sell) return 'priceTierErrCheaper'
    if (seen.has(min)) return 'priceTierErrDuplicate'
    seen.add(min)
  }
  return null
}
