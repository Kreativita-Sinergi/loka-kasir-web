import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import RentalCard from './RentalCard'
import { checkTableMember, getPublicRental, startPublicRental, type PublicRental } from '@/api/public'
import { setActiveLocale, t } from '@/lib/i18n'

vi.mock('@/api/public', () => ({ getPublicRental: vi.fn(), startPublicRental: vi.fn(), extendPublicRental: vi.fn(), checkTableMember: vi.fn() }))
const meter = { id: 'meter', name: 'Paket Hemat', mode: 'METER' as const, price: 5000, package_minutes: 0, min_minutes: 0, max_packages: 12, image: null, promo_name: 'Promo Siang' }
const fixture: PublicRental = {
  product: meter,
  choices: [meter, { ...meter, id: 'two', name: 'Paket 2 Jam', mode: 'PAKET', price: 10000, package_minutes: 120 }, { ...meter, id: 'three', name: 'Paket 3 Jam', mode: 'PAKET', price: 15000, package_minutes: 180 }],
  session: null, pending_payment: null, prepay_available: false, server_time: new Date().toISOString(),
}
let host: HTMLDivElement, root: Root, client: QueryClient
beforeEach(async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  setActiveLocale('id')
  vi.clearAllMocks()
  vi.mocked(getPublicRental).mockResolvedValue({ data: { data: fixture } } as Awaited<ReturnType<typeof getPublicRental>>)
  vi.mocked(startPublicRental).mockResolvedValue({ data: { data: fixture } } as Awaited<ReturnType<typeof startPublicRental>>)
  host = document.createElement('div'); root = createRoot(host)
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } })
  await act(async () => { root.render(<QueryClientProvider client={client}><RentalCard token="table" tableNumber="A1" initial={fixture} renderPay={() => null} /></QueryClientProvider>) })
})
afterEach(() => { act(() => root.unmount()); client.clear() })
it('lists every choice as a radio with the first one selected', () => {
  const radios = host.querySelectorAll('[role=radio]')
  expect(radios).toHaveLength(3)
  expect(radios[0].getAttribute('aria-checked')).toBe('true')
  for (const text of ['Paket Hemat', 'Promo Siang', '5.000', 'Paket 2 Jam', 'Paket 3 Jam']) expect(host.textContent).toContain(text)
  expect(host.textContent).toContain(t('rentalChooseOption'))
})
it('submits the choice the customer tapped', async () => {
  const two = Array.from(host.querySelectorAll('[role=radio]')).find((b) => b.textContent?.includes('Paket 2 Jam')) as HTMLButtonElement
  await act(async () => { two.click(); await new Promise((r) => setTimeout(r, 10)) })
  expect(two.getAttribute('aria-checked')).toBe('true')
  const button = Array.from(host.querySelectorAll('button')).find((b) => b.textContent === t('rentalStart'))!
  await act(async () => { button.click(); await new Promise((r) => setTimeout(r, 20)) })
  expect(startPublicRental).toHaveBeenCalledWith('table', expect.objectContaining({ product_id: 'two', packages: 1, prepay: false }))
})
it('updates scheduled price for a single choice without requiring a selection', async () => {
  const evening = { ...meter, price: 10000, promo_name: 'Promo Sore' }
  await act(async () => { client.setQueryData(['public-rental', 'table'], { ...fixture, product: evening, choices: [evening] }); await new Promise((r) => setTimeout(r, 10)) })
  expect(host.querySelectorAll('[role=radio]')).toHaveLength(0)
  expect(host.textContent).toContain('Promo Sore')
  expect(host.textContent).toContain('10.000')
  expect(host.textContent).not.toContain('Promo Siang')
  const button = Array.from(host.querySelectorAll('button')).find((b) => b.textContent === t('rentalStart'))!
  expect(button.disabled).toBe(false)
})
it('falls back to the first choice when the tapped one disappears', async () => {
  const two = Array.from(host.querySelectorAll('[role=radio]')).find((b) => b.textContent?.includes('Paket 2 Jam')) as HTMLButtonElement
  await act(async () => { two.click(); await new Promise((r) => setTimeout(r, 10)) })
  await act(async () => { client.setQueryData(['public-rental', 'table'], { ...fixture, choices: [meter, { ...meter, id: 'three', name: 'Paket 3 Jam' }] }); await new Promise((r) => setTimeout(r, 10)) })
  const radios = host.querySelectorAll('[role=radio]')
  expect(radios).toHaveLength(2)
  expect(radios[0].getAttribute('aria-checked')).toBe('true')
})
it('refuses rental outside the schedule and shows the notice', async () => {
  await act(async () => { client.setQueryData(['public-rental', 'table'], { ...fixture, closed: true, choices: [] }); await new Promise((r) => setTimeout(r, 10)) })
  expect(host.querySelector('[role=alert]')?.textContent).toContain(t('rentalClosed'))
  expect(Array.from(host.querySelectorAll('button')).some((b) => b.textContent === t('rentalStart'))).toBe(false)
})
it('offers a flat-price package as a one-time payment without a stepper', async () => {
  const flat = { ...meter, id: 'flat', name: 'Paket Suka-Suka', mode: 'FLAT' as const, price: 50000, package_minutes: 300, max_packages: 1 }
  await act(async () => { client.setQueryData(['public-rental', 'table'], { ...fixture, prepay_available: true, choices: [meter, flat] }); await new Promise((r) => setTimeout(r, 10)) })
  const radio = Array.from(host.querySelectorAll('[role=radio]')).find((b) => b.textContent?.includes('Suka-Suka')) as HTMLButtonElement
  await act(async () => { radio.click(); await new Promise((r) => setTimeout(r, 10)) })
  expect(host.textContent).toContain(t('rentalRateFlat', { price: '50.000', duration: '5 jam' }).replace('50.000', ''))
  expect(host.textContent).toContain(t('rentalFlatHint'))
  expect(host.querySelector('[aria-label="+"]')).toBeNull()
  const pay = Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes(t('rentalPayAndStart')))!
  await act(async () => { pay.click(); await new Promise((r) => setTimeout(r, 20)) })
  expect(startPublicRental).toHaveBeenCalledWith('table', expect.objectContaining({ product_id: 'flat', prepay: true }))
})
it('takes one package only when the table offers several choices', async () => {
  const many = { ...fixture, choices: fixture.choices!.map((c) => ({ ...c, max_packages: 1 })) }
  await act(async () => { client.setQueryData(['public-rental', 'table'], many); await new Promise((r) => setTimeout(r, 10)) })
  const three = Array.from(host.querySelectorAll('[role=radio]')).find((b) => b.textContent?.includes('Paket 3 Jam')) as HTMLButtonElement
  await act(async () => { three.click(); await new Promise((r) => setTimeout(r, 10)) })
  expect(host.querySelector('[aria-label="+"]')).toBeNull()
  expect(host.textContent).not.toContain(t('rentalPackages'))
  const button = Array.from(host.querySelectorAll('button')).find((b) => b.textContent === t('rentalStart'))!
  await act(async () => { button.click(); await new Promise((r) => setTimeout(r, 20)) })
  expect(startPublicRental).toHaveBeenCalledWith('table', expect.objectContaining({ product_id: 'three', packages: 1 }))
})
it('keeps the package stepper for a table with a single package product', async () => {
  const paket = { ...meter, id: 'p1', name: 'Paket 1 Jam', mode: 'PAKET' as const, price: 5000, package_minutes: 60, max_packages: 12 }
  await act(async () => { client.setQueryData(['public-rental', 'table'], { ...fixture, product: paket, choices: [paket] }); await new Promise((r) => setTimeout(r, 10)) })
  const plus = host.querySelector('[aria-label="+"]') as HTMLButtonElement
  expect(plus).not.toBeNull()
  await act(async () => { plus.click(); await new Promise((r) => setTimeout(r, 10)) })
  const button = Array.from(host.querySelectorAll('button')).find((b) => b.textContent === t('rentalStart'))!
  await act(async () => { button.click(); await new Promise((r) => setTimeout(r, 20)) })
  expect(startPublicRental).toHaveBeenCalledWith('table', expect.objectContaining({ product_id: 'p1', packages: 2 }))
})
it('vibrates once when the package runs out, even after refreshes', async () => {
  const vibrate = vi.fn()
  Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
  localStorage.clear()
  const startedAt = new Date(Date.now() - 125 * 60_000).toISOString()
  const over: PublicRental = {
    ...fixture,
    session: {
      id: 'over-1', status: 'RUNNING', mode: 'PAKET', requested_at: startedAt, started_at: startedAt, ended_at: null,
      planned_minutes: 120, ends_at: null, elapsed_minutes: 125, remaining_minutes: 0, overtime_minutes: 5,
      price_per_hour: 5000, package_price: 10000, round_minutes: 1, min_minutes: 0, rental_amount: 0,
      prepaid_amount: 0, extend_request_minutes: 0, request_expires_at: null, note: null, orders: [], orders_total: 0,
    },
  }
  await act(async () => { client.setQueryData(['public-rental', 'table'], over); await new Promise((r) => setTimeout(r, 10)) })
  expect(host.textContent).toContain(t('rentalOvertime'))
  await act(async () => { client.setQueryData(['public-rental', 'table'], { ...over, server_time: new Date().toISOString() }); await new Promise((r) => setTimeout(r, 10)) })
  expect(vibrate).toHaveBeenCalledTimes(1)
  // Diperpanjang: batas baru, pengingat baru (belum habis → tidak bergetar).
  await act(async () => { client.setQueryData(['public-rental', 'table'], { ...over, session: { ...over.session!, planned_minutes: 240 } }); await new Promise((r) => setTimeout(r, 10)) })
  expect(vibrate).toHaveBeenCalledTimes(1)
})

// free_today = meja MASIH punya jatah sesi gratis hari ini. Selagi sesi
// BERBAYAR berjalan, lencana "GRATIS hari ini" membuat pembeli mengira sewanya
// gratis padahal biaya sewa tertera di bawahnya (keluhan nyata, 20 Okt 2026).
const paidRunning: NonNullable<PublicRental['session']> = {
  id: 's1', status: 'RUNNING', is_free: false, mode: 'PAKET', requested_at: new Date().toISOString(),
  started_at: new Date().toISOString(), ended_at: null, planned_minutes: 60, ends_at: new Date(Date.now() + 3600_000).toISOString(),
  elapsed_minutes: 1, remaining_minutes: 59, overtime_minutes: 0, price_per_hour: 0, package_price: 5000, round_minutes: 1,
  min_minutes: 0, rental_amount: 5000, prepaid_amount: 0, extend_request_minutes: 0, request_expires_at: null, note: null,
  orders: [], orders_total: 0,
} as NonNullable<PublicRental['session']>
it('shows the free-today badge on an idle free table', async () => {
  await act(async () => { client.setQueryData(['public-rental', 'table'], { ...fixture, free_today: true }); await new Promise((r) => setTimeout(r, 10)) })
  expect(host.textContent).toContain(t('rentalFreeTodayBadge'))
})
it('hides the free-today badge while a paid session is running', async () => {
  await act(async () => { client.setQueryData(['public-rental', 'table'], { ...fixture, free_today: true, session: paidRunning }); await new Promise((r) => setTimeout(r, 10)) })
  expect(host.textContent).not.toContain(t('rentalFreeTodayBadge'))
})
it('shows the member rate and charges it once the phone belongs to a member', async () => {
  vi.mocked(checkTableMember).mockResolvedValue({ data: { data: { is_member: true } } } as Awaited<ReturnType<typeof checkTableMember>>)
  const withMember = { ...fixture, choices: [{ ...meter, member_price: 4000 }, fixture.choices![1]] }
  await act(async () => { client.setQueryData(['public-rental', 'table'], withMember); await new Promise((r) => setTimeout(r, 10)) })
  expect(host.textContent).toMatch(/Member Rp\s?4\.000\/jam/)
  // Ajakan member dengan penghematan terbesar (Rp5.000 − Rp4.000).
  expect(host.textContent).toContain(t('rentalMemberPerksTitle'))
  expect(host.textContent).toMatch(/hemat sampai Rp\s?1\.000/)
  const phone = host.querySelector(`input[placeholder="${t('rentalMemberPhonePlaceholder')}"]`) as HTMLInputElement
  expect(phone).not.toBeNull()
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(phone, '081234567890')
    phone.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 650))
  })
  expect(checkTableMember).toHaveBeenCalledWith('table', '081234567890')
  await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
  expect(host.textContent).toContain(t('rentalMemberApplied'))
  // Sudah member: ajakannya tidak lagi ditampilkan.
  expect(host.textContent).not.toContain(t('rentalMemberPerksTitle'))
  const button = Array.from(host.querySelectorAll('button')).find((b) => b.textContent === t('rentalStart'))!
  await act(async () => { button.click(); await new Promise((r) => setTimeout(r, 20)) })
  expect(startPublicRental).toHaveBeenCalledWith('table', expect.objectContaining({ product_id: 'meter', customer_phone: '081234567890' }))
})
it('hides the member phone field when no choice has a member price', () => {
  expect(host.querySelector(`input[placeholder="${t('rentalMemberPhonePlaceholder')}"]`)).toBeNull()
  expect(host.textContent).not.toContain(t('rentalMemberPerksTitle'))
})
