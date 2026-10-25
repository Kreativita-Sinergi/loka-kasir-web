import type { CustomerRating, LeakFinding, TaxMonth, TaxMonthStatus, WinbackData, WinbackCustomer } from '@/api/ownerInsights'
import { formatCurrency } from '@/lib/utils'
import { activeMoney, formatQuantity } from '@/lib/money'
import { t } from '@/lib/i18n'

// Kalimat wawasan pemilik yang dirangkai dari kode server — sama dengan
// aplikasi (leak_radar_screen.dart, winback_contact_sheet.dart).

/** Angka bersatu desimal menurut bahasa dasbor ("13,4" / "13.4"). */
export const oneDecimal = (v: number) => formatQuantity(Math.round(v * 10) / 10)

/** Persen bersatu desimal menurut bahasa dasbor. */
export const pct = (v: number | null | undefined) => `${oneDecimal(v ?? 0)}%`

/** Judul dan isi satu temuan — kalimatnya dirangkai dari kode server. */
export function leakFindingText(f: LeakFinding): [string, string] {
  const name = f.actor_name || t('lkrUnknownActor')
  const amount = formatCurrency(f.amount)
  const rate = pct(f.rate)
  const baseline = pct(f.baseline)
  const count = formatQuantity(f.count)
  switch (f.code) {
    case 'cancel_rate': return [t('lkrCancelRateTitle', { name }), t('lkrCancelRateBody', { count, rate, baseline })]
    case 'cancel_served': return [t('lkrCancelServedTitle', { name }), t('lkrCancelServedBody', { count, amount })]
    case 'refund_rate': return [t('lkrRefundRateTitle', { name }), t('lkrRefundRateBody', { count, rate, baseline })]
    case 'discount_rate': return [t('lkrDiscountTitle', { name }), t('lkrDiscountBody', { rate, baseline, amount })]
    case 'cash_short': return [t('lkrCashShortTitle', { name }), t('lkrCashShortBody', { count, rate, amount })]
    case 'qris_unverified':
      return [f.actor_name ? t('lkrQrisTitleActor', { name }) : t('lkrQrisTitle'), t('lkrQrisBody', { count, amount })]
    case 'deleted': return [t('lkrDeletedTitle'), t('lkrDeletedBody', { count, amount })]
    case 'stale_open': return [t('lkrStaleTitle'), t('lkrStaleBody', { count, amount })]
    case 'stock_shrink':
      return [t('lkrShrinkTitle'), f.items?.length ? t('lkrShrinkBody', { amount, items: f.items.join(', ') }) : t('lkrShrinkBodyNoItems', { amount })]
    default: return [f.code, amount]
  }
}


/** Pesan sapaan bawaan — sama dengan aplikasi (winbackMessage). */
export function winbackMessage(c: WinbackCustomer, storeName: string): string {
  const name = c.name.trim().split(' ')[0]
  const store = storeName || t('wbkOurStore')
  const opening = c.segment === 'new_once' ? t('wbkMsgNewOnce', { name, store }) : t('wbkMsgMissYou', { name, store })
  const favorite = c.favorite_item ? ` ${t('wbkMsgFavorite', { item: c.favorite_item })}` : ''
  return `${opening}${favorite} ${t('wbkMsgClosing')}`
}

/**
 * Daftar kosong karena pelanggan jarang dicatat di nota, bukan karena semuanya
 * setia. Ambangnya sama dengan pilar Pelanggan di Rapor Toko; server lama tanpa
 * `tracked` dianggap tidak.
 */
export const fewTracked = (s: WinbackData['summary'] | undefined) =>
  s?.tracked != null && s.tracked < 20

/**
 * Pesan balasan untuk penilaian bernomor — sama dengan aplikasi. Bintang 1–3
 * dibalas permintaan maaf dan pertanyaan, supaya keluhan selesai di WhatsApp
 * toko, bukan di ulasan Google.
 */
export function ratingReplyMessage(r: Pick<CustomerRating, 'rating' | 'contact_name'>, storeName: string): string {
  const name = r.contact_name.trim().split(/\s+/)[0] || t('wbkReplyNoName')
  const store = storeName.trim() || t('wbkOurStore')
  return r.rating <= 3 ? t('wbkReplyLow', { name, store }) : t('wbkReplyHigh', { name, store })
}

// ── Pojok Pajak ──────────────────────────────────────────────────────────────

/** Masa yang bisa ditandai (atau dibatalkan) sudah setor. */
export const canMarkTaxMonth = (status: TaxMonthStatus) =>
  status === 'due' || status === 'overdue' || status === 'paid'

/** Nama bulan menurut bahasa dasbor ("September" / "September"). */
export const monthLong = (year: number, month: number) =>
  new Intl.DateTimeFormat(activeMoney().intlLocale, { month: 'long' }).format(new Date(year, month - 1, 1))

/**
 * Masa pajak yang ditampilkan, terbaru di atas — sama dengan aplikasi. Bulan
 * yang belum datang disembunyikan, dan bulan-bulan awal tahun tanpa penjualan
 * (sebelum toko memakai Loka) diringkas jadi satu rentang ("Januari –
 * September") supaya masa yang perlu disetor tidak tenggelam di bawah deretan
 * "Rp0 · Nihil". `quiet` null bila tidak ada yang diringkas.
 */
export function taxMonthRows(year: number, months: TaxMonth[]): { shown: TaxMonth[]; quiet: string | null } {
  const past = months.filter((m) => m.status !== 'future')
  let lead = 0
  while (lead < past.length && past[lead].omzet === 0 && past[lead].status === 'none') lead++
  const shown = past.slice(lead).reverse()
  if (lead === 0) return { shown, quiet: null }
  const first = monthLong(year, past[0].month)
  return { shown, quiet: lead === 1 ? first : `${first} – ${monthLong(year, past[lead - 1].month)}` }
}
