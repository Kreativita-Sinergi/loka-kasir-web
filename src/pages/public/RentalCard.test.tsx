import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import RentalCard from './RentalCard'
import { getPublicRental, startPublicRental, type PublicRental } from '@/api/public'
import { setActiveLocale, t } from '@/lib/i18n'

vi.mock('@/api/public', () => ({ getPublicRental: vi.fn(), startPublicRental: vi.fn(), extendPublicRental: vi.fn() }))
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
it('shows only the linked product with promo price and no product selector', () => {
  expect(host.querySelectorAll('input[type=radio]')).toHaveLength(0)
  for (const text of ['Paket Hemat', 'Promo Siang', '5.000']) expect(host.textContent).toContain(text)
  expect(host.textContent).not.toContain('Paket 2 Jam')
  expect(host.textContent).not.toContain('Paket 3 Jam')
})
it('submits the linked product', async () => {
  const button = Array.from(host.querySelectorAll('button')).find((b) => b.textContent === t('rentalStart'))!
  await act(async () => { button.click(); await new Promise((r) => setTimeout(r, 20)) })
  expect(startPublicRental).toHaveBeenCalledWith('table', expect.objectContaining({ product_id: 'meter', prepay: false }))
})
it('updates scheduled price for the same product without requiring a selection', async () => {
  const evening = { ...meter, price: 10000, promo_name: 'Promo Sore' }
  await act(async () => { client.setQueryData(['public-rental', 'table'], { ...fixture, product: evening, choices: [evening] }); await new Promise((r) => setTimeout(r, 10)) })
  expect(host.textContent).toContain('Promo Sore')
  expect(host.textContent).toContain('10.000')
  expect(host.textContent).not.toContain('Promo Siang')
  const button = Array.from(host.querySelectorAll('button')).find((b) => b.textContent === t('rentalStart'))!
  expect(button.disabled).toBe(false)
})
it('blocks starting when linked product is absent from server choices', async () => {
  await act(async () => { client.setQueryData(['public-rental', 'table'], { ...fixture, choices: [{ ...meter, id: 'other' }] }); await new Promise((r) => setTimeout(r, 10)) })
  const button = Array.from(host.querySelectorAll('button')).find((b) => b.textContent === t('rentalStart'))!
  expect(button.disabled).toBe(true)
})
