import type { LeakFinding, WinbackCustomer } from '@/api/ownerInsights'
import { formatCurrency } from '@/lib/utils'
import { formatQuantity } from '@/lib/money'
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

