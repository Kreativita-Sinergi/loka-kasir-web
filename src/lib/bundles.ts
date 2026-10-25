import type { ReportRecommendation } from '@/api/ownerInsights'
import type { Bundle, Product } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'

// Hitungan form & daftar Paket — sama dengan aplikasi (bundle_form.dart).

/** Rute halaman Paket; `?new=a,b` membuka form paket baru berisi dua produk. */
export const BUNDLES_PATH = '/products/bundles'

/** Satu isi paket: produknya (bila sudah termuat) dan jumlahnya. */
export interface BundleLine {
  product: Pick<Product, 'sell_price' | 'base_price'> | undefined
  quantity: number
}

export interface BundlePriceSummary {
  /** Harga kalau dibeli satuan; null bila ada isi tanpa harga jual. */
  normal: number | null
  /** Modal paket; null bila ada isi tanpa harga modal. */
  cost: number | null
}

export function bundlePriceSummary(lines: BundleLine[]): BundlePriceSummary {
  let normal = 0
  let cost = 0
  let priced = true
  let costed = true
  for (const { product, quantity } of lines) {
    const sell = product?.sell_price ?? 0
    const base = product?.base_price ?? 0
    if (sell <= 0) priced = false
    if (base <= 0) costed = false
    normal += sell * quantity
    cost += base * quantity
  }
  return { normal: priced ? normal : null, cost: costed ? cost : null }
}

export type SummaryTone = 'muted' | 'success' | 'warning' | 'danger'

/**
 * "Kalau dibeli satuan Rp27.000 · pembeli hemat Rp3.000 (11%)" dan "Modal
 * Rp10.500 · untung Rp13.500". Harga paket yang tidak lebih murah dari
 * satuannya diberi peringatan — pembeli tidak punya alasan memilih paketnya.
 */
export function bundleSummaryLines(lines: BundleLine[], price: number): { text: string; tone: SummaryTone }[] {
  if (!lines.length) return []
  const { normal, cost } = bundlePriceSummary(lines)
  const out: { text: string; tone: SummaryTone }[] = []
  if (normal != null) {
    if (price <= 0) {
      out.push({ text: t('bdlNormalPrice', { normal: formatCurrency(normal) }), tone: 'muted' })
    } else if (price < normal) {
      const save = normal - price
      out.push({
        text: t('bdlSaving', {
          normal: formatCurrency(normal),
          save: formatCurrency(save),
          pct: `${Math.round((save / normal) * 100)}%`,
        }),
        tone: 'success',
      })
    } else {
      out.push({ text: t('bdlNoSaving', { normal: formatCurrency(normal) }), tone: 'warning' })
    }
  }
  if (price > 0) {
    out.push(cost != null
      ? { text: t('bdlProfit', { cost: formatCurrency(cost), profit: formatCurrency(price - cost) }), tone: price - cost < 0 ? 'danger' : 'muted' }
      : { text: t('bdlProfitUnknown'), tone: 'muted' })
  }
  return out
}

/** Hemat paket tersimpan dibanding dibeli satuan; 0 bila tidak lebih murah. */
export function bundleSaving(b: Pick<Bundle, 'sell_price' | 'items'>): number {
  const normal = (b.items ?? []).reduce((s, i) => s + (i.sell_price ?? 0) * i.quantity, 0)
  return Math.max(0, normal - (b.sell_price ?? 0))
}

/** "Kaos · L" untuk isi bervarian, "Seblak" untuk yang lain. */
export const bundleItemLabel = (i: { name: string; variant_name?: string }) =>
  i.variant_name ? `${i.name} · ${i.variant_name}` : i.name

/** "Seblak ×1 · Es Teh ×1" — cukup untuk mengenali paketnya tanpa membuka. */
export const bundleItemsPreview = (b: Pick<Bundle, 'items'>) =>
  (b.items ?? []).map((i) => `${bundleItemLabel(i)} ×${i.quantity}`).join(' · ')

/** "Paket Seblak + Es Teh" — disarankan selama pemilik belum mengetik nama. */
export const suggestBundleName = (names: string[]) =>
  names.length ? t('bdlNameSuggestion', { items: names.join(' + ') }) : ''

/**
 * Kunci satu isi paket: produk biasa "p", varian "p:v". Kaos M dan Kaos L
 * adalah dua isi berbeda dengan jumlah masing-masing.
 */
export const bundleItemKey = (productId: string, variantId?: string | null) =>
  variantId ? `${productId}:${variantId}` : productId

/** Satu pilihan di pemilih isi paket: produk biasa, atau satu varian produk. */
export interface BundlePick {
  key: string
  productId: string
  variantId?: string
  label: string
  sell_price: number | null
  base_price: number | null
  /** Alasan tidak bisa dipilih (produk bertimer), atau null. */
  blocked: string | null
}

/**
 * Pilihan isi paket dari daftar produk aktif. Produk bervarian dipecah per
 * varian ("Kaos · S", "Kaos · M") — stok yang dipotong saat paket terjual
 * adalah stok varian itu. Produk bertimer tetap tampil, redup dengan
 * alasannya: menyembunyikannya membuat pemilik mengira daftarnya tidak
 * lengkap.
 */
export function bundlePicks(products: Product[]): BundlePick[] {
  const out: BundlePick[] = []
  for (const p of products) {
    if (!p.is_active) continue
    const blocked = p.timer_mode && p.timer_mode !== 'NONE' ? t('bdlBlockedTimed') : null
    if (p.has_variant && p.variants?.length) {
      for (const v of p.variants) {
        out.push({
          key: bundleItemKey(p.id, v.id),
          productId: p.id,
          variantId: v.id,
          label: bundleItemLabel({ name: p.name, variant_name: v.name }),
          sell_price: v.sell_price,
          base_price: v.base_price,
          blocked,
        })
      }
      continue
    }
    out.push({
      key: p.id,
      productId: p.id,
      label: p.name,
      sell_price: p.sell_price,
      base_price: p.base_price,
      blocked,
    })
  }
  return out
}

/** Produk saran "Jadikan paket" (`a_id`, `b_id`); kosong untuk saran lain atau server lama. */
export function bundleProductIds(r: ReportRecommendation): string[] {
  if (r.code !== 'bundle') return []
  return ['a_id', 'b_id'].map((k) => r.args?.[k]?.text ?? '').filter(Boolean)
}

/** Tautan form paket baru berisi produk-produk ini. */
export const newBundleLink = (ids: string[]) => `${BUNDLES_PATH}?new=${ids.map(encodeURIComponent).join(',')}`

/** Membaca `?new=a,b` — id unik, tanpa yang kosong. */
export function parseNewBundleParam(value: string | null): string[] {
  if (!value) return []
  return [...new Set(value.split(',').map((s) => s.trim()).filter(Boolean))]
}

/** "Paket Hemat" → "PH": pengganti foto, seperti kartu kasir tanpa foto. */
export const bundleInitials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('')
