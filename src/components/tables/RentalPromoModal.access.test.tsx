import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RentalPromoModal from './RentalPromoModal'
import { getRentalPromos, saveRentalPromos } from '@/api/tables'
import { getProducts } from '@/api/products'

const state = vi.hoisted(() => ({ role: 'KASIR', permission: true }))
vi.mock('@/store/authStore', () => ({ useAuthStore: () => ({ user: { role: { code: state.role } }, can: () => state.permission }) }))
vi.mock('@/api/tables', () => ({ getRentalPromos: vi.fn(async () => ({ data: { data: { timezone: 'Asia/Jakarta', promos: [] } } })), saveRentalPromos: vi.fn() }))
vi.mock('@/api/products', () => ({ getProducts: vi.fn(async () => ({ data: { data: [{ id: 'p1', name: 'Biliar', timer_mode: 'METER', sell_price: 40000, is_active: true }] } })) }))
vi.mock('@/lib/i18n', () => ({ t: (key: string) => key }))
let host: HTMLDivElement, root: Root, client: QueryClient
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.clearAllMocks()
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => { act(() => root.unmount()); client.clear(); host.remove() })
describe('rental promo management access', () => {
  it.each(['KASIR', 'MANAGER', 'WAITERS', 'CUSTOM', ''])('denies %s without mounting the data form', async (role) => {
    state.role = role; state.permission = true
    await act(async () => { root.render(<RentalPromoModal tableId="t1" rentalProductIds={['p1']} onClose={() => {}} />) })
    expect(host.innerHTML).toBe('')
    expect(getRentalPromos).not.toHaveBeenCalled()
  })
  it.each(['OWNER', 'ADMIN'])('allows %s with table management permission', async (role) => {
    state.role = role; state.permission = true
    await act(async () => { root.render(<QueryClientProvider client={client}><RentalPromoModal tableId="t1" rentalProductIds={['p1']} onClose={() => {}} /></QueryClientProvider>) })
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)) })
    expect(Array.from(document.querySelectorAll('button')).some((b) => b.textContent === 'actionSave')).toBe(true)
    expect(getRentalPromos).toHaveBeenCalledWith('t1')
  })
  it('retains the permission restriction for admins', async () => {
    state.role = 'ADMIN'; state.permission = false
    await act(async () => { root.render(<RentalPromoModal tableId="t1" rentalProductIds={['p1']} onClose={() => {}} />) })
    expect(host.innerHTML).toBe('')
    expect(getRentalPromos).not.toHaveBeenCalled()
  })
})

it('keeps every product of a period, shows the table choices, and saves prices per product', async () => {
 state.role = 'OWNER'; state.permission = true
 vi.mocked(getProducts).mockResolvedValueOnce({ data: { data: [
   { id: 'p1', name: 'Biliar', timer_mode: 'METER', sell_price: 40000, is_active: true },
   { id: 'p2', name: 'Paket 2 Jam', timer_mode: 'PAKET', timer_minutes: 120, sell_price: 70000, is_active: true },
   { id: 'p3', name: 'Suka-Suka', timer_mode: 'FLAT', timer_minutes: 300, sell_price: 50000, is_active: true },
 ] } } as unknown as Awaited<ReturnType<typeof getProducts>>)
 vi.mocked(getRentalPromos).mockResolvedValueOnce({ data: { data: { timezone: 'Asia/Jakarta', promos: [{ name: 'Siang', start_minute: 720, end_minute: 1020, days: [], enabled: true, product_ids: ['p1','p2'], promo_prices: { p1: 20000, p2: 50000 } }] } } } as unknown as Awaited<ReturnType<typeof getRentalPromos>>)
 await act(async () => { root.render(<QueryClientProvider client={client}><RentalPromoModal tableId="t1" rentalProductIds={['p1', 'p3']} onClose={() => {}} /></QueryClientProvider>) })
 await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)) })
 expect(document.body.textContent).toContain('tableRentalChoices')
 expect(document.body.textContent).toContain('Suka-Suka')
 expect(document.querySelector('input[aria-label="Paket 2 Jam"]')).toHaveProperty('checked', true)
 expect(document.querySelector('input[aria-label="Suka-Suka"]')).toHaveProperty('checked', false)
 expect(document.querySelector('input[aria-label="rentalPeriodPrice Biliar"]')).toHaveProperty('value', '20.000')
 // Menambahkan harga tetap ke periode ini.
 await act(async () => { (document.querySelector('input[aria-label="Suka-Suka"]') as HTMLInputElement).click() })
 await act(async () => { document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
 expect(saveRentalPromos).toHaveBeenCalledWith('t1', expect.objectContaining({ promos: [expect.objectContaining({ product_ids: ['p1', 'p2', 'p3'], promo_prices: { p1: 20000, p2: 50000 } })] }))
})
