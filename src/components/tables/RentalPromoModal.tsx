import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { getRentalPromos, saveRentalPromos, type RentalPromoConfig } from '@/api/tables'
import { getProducts } from '@/api/products'
import type { Product } from '@/types'
import { t } from '@/lib/i18n'
import { formatCurrency, getErrorMessage } from '@/lib/utils'

const suggestedEnd = (start: number) => (start === 720 ? 1020 : start === 1020 ? 1260 : start === 1260 ? 0 : (start + 180) % 1440)
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const minute = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m }
const sellable = (p: Product) =>
  (p.timer_mode === 'METER' || p.timer_mode === 'PAKET' || p.timer_mode === 'FLAT') && p.is_active !== false && (p.sell_price ?? 0) > 0 && (p.timer_mode === 'METER' || (p.timer_minutes ?? 0) > 0)
const rate = (p: Product) =>
  p.timer_mode === 'METER' ? `${formatCurrency(p.sell_price ?? 0)} · ${t('rentalPerHour')}`
    : p.timer_mode === 'FLAT' ? `${formatCurrency(p.sell_price ?? 0)} · ${t('rentalFlatLabel')}`
      : `${formatCurrency(p.sell_price ?? 0)} · ${t('rentalMinutes', { n: p.timer_minutes ?? 0 })}`

/**
 * Jadwal sewa per meja: tiap periode punya daftar pilihannya sendiri (per jam,
 * paket, harga tetap) dengan harga khusus opsional. Periode tanpa pilihan
 * memakai pilihan bawaan meja; di luar periode, QR menolak sewa.
 */
export default function RentalPromoModal(props: { tableId: string; rentalProductIds: string[]; onClose: () => void }) {
  const { user, can } = useAuthStore()
  if (!['OWNER', 'ADMIN'].includes(user?.role?.code ?? '') || !can('pos.manage_tables')) return null
  return <RentalPromoForm {...props} />
}
function RentalPromoForm({ tableId, rentalProductIds, onClose }: { tableId: string; rentalProductIds: string[]; onClose: () => void }) {
  const [draft, setDraft] = useState<RentalPromoConfig | null>(null)
  const config = useQuery({ queryKey: ['rental-promos', tableId], queryFn: async () => (await getRentalPromos(tableId)).data.data })
  const products = useQuery({ queryKey: ['rental-promo-products'], queryFn: async () => (await getProducts({ page: 1, limit: 500 })).data.data, staleTime: 60_000 })
  const original = config.data
  const options = (products.data ?? []).filter(sellable)
  const tableChoices = rentalProductIds.map((id) => options.find((p) => p.id === id)).filter((p): p is Product => !!p)
  const usable = tableChoices.length > 0
  const value = draft ?? original
  const save = useMutation({ mutationFn: () => saveRentalPromos(tableId, value!), onSuccess: () => { toast.success(t('rentalPromoSaved')); onClose() }, onError: (e) => toast.error(getErrorMessage(e)) })
  const change = (index: number, patch: Partial<RentalPromoConfig['promos'][number]>) => {
    if (value) setDraft({ ...value, promos: value.promos.map((p, i) => i === index ? { ...p, ...patch } : p) })
  }
  const toggle = (index: number, promo: RentalPromoConfig['promos'][number], id: string) => {
    const on = promo.product_ids.includes(id)
    const prices = { ...(promo.promo_prices ?? {}) }
    if (on) delete prices[id]
    change(index, { product_ids: on ? promo.product_ids.filter((x) => x !== id) : [...promo.product_ids, id], promo_prices: prices })
  }
  return <Modal open onClose={onClose} title={t('rentalPromoSettings')} size="lg">
    {(config.isPending || products.isPending) ? <p>{t('loading')}</p> : config.error || products.error ? <div role="alert"><p>{getErrorMessage(config.error ?? products.error)}</p><button onClick={() => { void config.refetch(); void products.refetch() }}>{t('actionRetry')}</button></div> : value && <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (usable) save.mutate() }}>
      <p className="text-sm text-muted-foreground">{t('rentalPromoHint')}</p>
      <div className="rounded-xl bg-muted/50 border p-4 space-y-1">
        <p className="text-xs text-muted-foreground">{t('tableRentalChoices')}</p>
        {usable ? <>{tableChoices.map((p) => <p key={p.id} className="text-sm"><span className="font-semibold">{p.name}</span> · {rate(p)}</p>)}<p className="text-xs text-muted-foreground">{t('rentalLinkedProductHint')}</p><p className="text-xs text-muted-foreground">{t('rentalClosedOutside')}</p></> : <p role="alert" className="text-sm text-red-600">{t('rentalTableProductMissing')}</p>}
      </div>
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
        <div className="border-t pt-3 space-y-2">
          <p className="text-sm font-semibold">{t('rentalPeriodChoices')}</p>
          <p className="text-xs text-muted-foreground">{t('rentalPeriodChoicesHint')}</p>
          {options.map((p) => {
            const on = promo.product_ids.includes(p.id)
            const price = promo.promo_prices?.[p.id]
            return <div key={p.id} className="space-y-1">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" aria-label={p.name} checked={on} onChange={() => toggle(i, promo, p.id)} /><span className="font-medium">{p.name}</span><span className="text-xs text-muted-foreground">{rate(p)}</span></label>
              {on && <div className="ml-6 flex items-center rounded-lg border bg-card"><span className="pl-3 text-muted-foreground">Rp</span><input inputMode="numeric" aria-label={`${t('rentalPeriodPrice')} ${p.name}`} placeholder={new Intl.NumberFormat('id-ID').format(p.sell_price ?? 0)} className="w-full min-w-0 rounded-lg p-2 bg-transparent" value={price === undefined ? '' : new Intl.NumberFormat('id-ID').format(price)} onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '')
                const prices = { ...(promo.promo_prices ?? {}) }
                if (digits) prices[p.id] = Number(digits); else delete prices[p.id]
                change(i, { promo_prices: prices })
              }} onInvalid={(e) => e.currentTarget.setCustomValidity(t('rentalInvalidPromoPrice'))} onInput={(e) => e.currentTarget.setCustomValidity('')} ref={(input) => { if (input) input.setCustomValidity(price !== undefined && price <= 0 ? t('rentalInvalidPromoPrice') : '') }} /></div>}
            </div>
          })}
          {promo.product_ids.length === 0 && <p className="text-xs text-blue-700">{t('rentalPeriodUsesDefault')}</p>}
        </div>
      </fieldset>)}
      <button type="button" disabled={save.isPending || !usable || value.promos.length >= 30} className="rounded-lg border px-3 py-2 text-sm" onClick={() => setDraft({ ...value, promos: [...value.promos, { name: '', start_minute: (value.promos.at(-1)?.end_minute ?? 720) % 1440, end_minute: suggestedEnd((value.promos.at(-1)?.end_minute ?? 720) % 1440), days: [...(value.promos.at(-1)?.days ?? [])], product_ids: tableChoices.map((p) => p.id), enabled: true }] })}>{t('rentalAddPromo')}</button>
      <button type="submit" disabled={save.isPending || !usable} className="block w-full rounded-xl bg-blue-600 text-white py-3 font-semibold disabled:opacity-50">{t('actionSave')}</button>
    </form>}
  </Modal>
}
