import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { getRentalPromos, saveRentalPromos, type RentalPromoConfig } from '@/api/tables'
import api from '@/lib/axios'
import type { ApiResponse, Product } from '@/types'
import { t } from '@/lib/i18n'
import { formatCurrency, getErrorMessage } from '@/lib/utils'

const suggestedEnd = (start: number) => (start === 720 ? 1020 : start === 1020 ? 1260 : start === 1260 ? 0 : (start + 180) % 1440)
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const minute = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m }
export default function RentalPromoModal(props: { tableId: string; rentalProductId?: string | null; onClose: () => void }) {
  const { user, can } = useAuthStore()
  if (!['OWNER', 'ADMIN'].includes(user?.role?.code ?? '') || !can('pos.manage_tables')) return null
  return <RentalPromoForm {...props} />
}
function RentalPromoForm({ tableId, rentalProductId, onClose }: { tableId: string; rentalProductId?: string | null; onClose: () => void }) {
  const [draft, setDraft] = useState<RentalPromoConfig | null>(null)
  const config = useQuery({ queryKey: ['rental-promos', tableId], queryFn: async () => (await getRentalPromos(tableId)).data.data })
  const product = useQuery({ queryKey: ['rental-table-product', rentalProductId], enabled: !!rentalProductId, queryFn: async () => (await api.get<ApiResponse<Product>>(`/product/${rentalProductId}`)).data.data })
  const original = config.data
  const linked = product.data
  const usable = linked && (linked.timer_mode === 'METER' || linked.timer_mode === 'PAKET') && linked.is_active !== false
  const legacy = original?.promos.some((p) => p.product_ids.length !== 1 || p.product_ids[0] !== rentalProductId)
  const value = draft ?? (original && { ...original, promos: original.promos.map((p) => ({ ...p, product_ids: rentalProductId ? [rentalProductId] : [], promo_prices: rentalProductId && p.promo_prices?.[rentalProductId] !== undefined ? { [rentalProductId]: p.promo_prices[rentalProductId] } : {} })) })
  const save = useMutation({ mutationFn: () => saveRentalPromos(tableId, value!), onSuccess: () => { toast.success(t('rentalPromoSaved')); onClose() }, onError: (e) => toast.error(getErrorMessage(e)) })
  const change = (index: number, patch: Partial<RentalPromoConfig['promos'][number]>) => {
    if (value) setDraft({ ...value, promos: value.promos.map((p, i) => i === index ? { ...p, ...patch } : p) })
  }
  return <Modal open onClose={onClose} title={t('rentalPromoSettings')} size="lg">
    {(config.isPending || (!!rentalProductId && product.isPending)) ? <p>{t('loading')}</p> : config.error || product.error ? <div role="alert"><p>{getErrorMessage(config.error ?? product.error)}</p><button onClick={() => { void config.refetch(); void product.refetch() }}>{t('actionRetry')}</button></div> : value && <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (usable) save.mutate() }}>
      <p className="text-sm text-muted-foreground">{t('rentalPromoHint')}</p>
      <div className="rounded-xl bg-muted/50 border p-4 space-y-1">
        <p className="text-xs text-muted-foreground">{t('rentalLinkedProduct')}</p>
        {usable ? <><p className="font-semibold">{linked.name}</p><p className="text-sm">{formatCurrency(linked.sell_price ?? 0)} · {linked.timer_mode === 'METER' ? t('rentalPerHour') : t('rentalMinutes', { n: linked.timer_minutes ?? 0 })}</p><p className="text-xs text-muted-foreground">{t('rentalLinkedProductHint')}</p></> : <p role="alert" className="text-sm text-red-600">{t('rentalTableProductMissing')}</p>}
      </div>
      {legacy && <p role="status" className="text-sm text-amber-700">{t('rentalLegacyProductsNotice')}</p>}
      <label className="block text-sm">{t('rentalTimezone')}<select className="block w-full rounded-lg border p-2 bg-card" value={value.timezone} onChange={(e) => setDraft({ ...value, timezone: e.target.value })}><option value="Asia/Jakarta">WIB</option><option value="Asia/Makassar">WITA</option><option value="Asia/Jayapura">WIT</option></select></label>
      {value.promos.map((promo, i) => <fieldset key={i} className="rounded-xl border p-3 space-y-3" disabled={save.isPending}>
        <div className="flex gap-2"><input required maxLength={60} aria-label={t('rentalPromoName')} placeholder={t('rentalPromoName')} className="flex-1 min-w-0 rounded-lg border p-2 bg-card" value={promo.name} onChange={(e) => change(i, { name: e.target.value })} /><button type="button" className="text-red-600" onClick={() => setDraft({ ...value, promos: value.promos.filter((_, j) => j !== i) })}>{t('actionDelete')}</button></div>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={promo.enabled} onChange={(e) => change(i, { enabled: e.target.checked })} />{t('rentalPromoEnabled')}</label>
        <div className="flex gap-3"><label className="text-sm">{t('rentalPromoStart')}<input type="time" required className="block rounded-lg border p-2 bg-card" value={clock(promo.start_minute)} onChange={(e) => change(i, { start_minute: minute(e.target.value) })} /></label><label className="text-sm">{t('rentalPromoEnd')}<input type="time" required className="block rounded-lg border p-2 bg-card" value={clock(promo.end_minute === 1440 ? 0 : promo.end_minute)} onChange={(e) => change(i, { end_minute: minute(e.target.value) })} /></label></div>
        <div className="flex flex-wrap gap-2">{[1,2,3,4,5,6,7].map((day) => {
          const days = promo.days.length ? promo.days : [1,2,3,4,5,6,7]
          const checked = days.includes(day)
          return <label key={day} className="text-xs flex gap-1"><input type="checkbox" checked={checked} disabled={checked && days.length === 1} onChange={() => change(i, { days: checked ? days.filter((d) => d !== day) : [...days, day] })} />{t('rentalWeekDays').split(',')[day - 1]}</label>
        })}</div>
        <div className="border-t pt-3 space-y-3">
          <p className="text-sm font-semibold">{t('rentalPromoRateTitle')}</p>
          <p className="text-xs text-muted-foreground">{t('rentalPriceHint')}</p>
          {usable && <label className="block text-sm">{t('rentalPromoPrice')}
            <div className="flex items-center rounded-lg border bg-card mt-1"><span className="pl-3 text-muted-foreground">Rp</span><input inputMode="numeric" aria-label={t('rentalPromoPrice')} placeholder={new Intl.NumberFormat('id-ID').format(linked.sell_price ?? 0)} className="w-full min-w-0 rounded-lg p-3 bg-transparent" value={promo.promo_prices?.[linked.id] === undefined ? '' : new Intl.NumberFormat('id-ID').format(promo.promo_prices[linked.id])} onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '')
              change(i, { promo_prices: digits ? { [linked.id]: Number(digits) } : {} })
            }} onInvalid={(e) => e.currentTarget.setCustomValidity(t('rentalInvalidPromoPrice'))} onInput={(e) => e.currentTarget.setCustomValidity('')} ref={(input) => { if (input) { const price = promo.promo_prices?.[linked.id]; input.setCustomValidity(price !== undefined && (price <= 0 || price > (linked.sell_price ?? 0)) ? t('rentalInvalidPromoPrice') : '') } }} /></div>
            <span className="block mt-2 text-xs text-muted-foreground">{t('rentalDiscount', { amount: formatCurrency(Math.max(0, (linked.sell_price ?? 0) - (promo.promo_prices?.[linked.id] ?? linked.sell_price ?? 0))) })}</span>
          </label>}
        </div>
      </fieldset>)}
      <button type="button" disabled={save.isPending || !usable || value.promos.length >= 30} className="rounded-lg border px-3 py-2 text-sm" onClick={() => setDraft({ ...value, promos: [...value.promos, { name: '', start_minute: (value.promos.at(-1)?.end_minute ?? 720) % 1440, end_minute: suggestedEnd((value.promos.at(-1)?.end_minute ?? 720) % 1440), days: [...(value.promos.at(-1)?.days ?? [])], product_ids: rentalProductId ? [rentalProductId] : [], enabled: true }] })}>{t('rentalAddPromo')}</button>
      <button type="submit" disabled={save.isPending || !usable} className="block w-full rounded-xl bg-blue-600 text-white py-3 font-semibold disabled:opacity-50">{t('actionSave')}</button>
    </form>}
  </Modal>
}
