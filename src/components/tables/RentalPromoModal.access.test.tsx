import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RentalPromoModal from './RentalPromoModal'
import { getRentalPromos, saveRentalPromos } from '@/api/tables'
import api from '@/lib/axios'

const state = vi.hoisted(() => ({ role: 'KASIR', permission: true }))
vi.mock('@/store/authStore', () => ({ useAuthStore: () => ({ user: { role: { code: state.role } }, can: () => state.permission }) }))
vi.mock('@/api/tables', () => ({ getRentalPromos: vi.fn(async () => ({ data: { data: { timezone: 'Asia/Jakarta', promos: [] } } })), saveRentalPromos: vi.fn() }))
vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(async () => ({ data: { data: { id: 'p1', name: 'Biliar', timer_mode: 'METER', sell_price: 40000, is_active: true } } })) } }))
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
    await act(async () => { root.render(<RentalPromoModal tableId="t1" rentalProductId="p1" onClose={() => {}} />) })
    expect(host.innerHTML).toBe('')
    expect(getRentalPromos).not.toHaveBeenCalled()
  })
  it.each(['OWNER', 'ADMIN'])('allows %s with table management permission', async (role) => {
    state.role = role; state.permission = true
    await act(async () => { root.render(<QueryClientProvider client={client}><RentalPromoModal tableId="t1" rentalProductId="p1" onClose={() => {}} /></QueryClientProvider>) })
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)) })
    expect(Array.from(document.querySelectorAll('button')).some((b) => b.textContent === 'actionSave')).toBe(true)
    expect(getRentalPromos).toHaveBeenCalledWith('t1')
  })
  it('retains the permission restriction for admins', async () => {
    state.role = 'ADMIN'; state.permission = false
    await act(async () => { root.render(<RentalPromoModal tableId="t1" rentalProductId="p1" onClose={() => {}} />) })
    expect(host.innerHTML).toBe('')
    expect(getRentalPromos).not.toHaveBeenCalled()
  })
})

it('shows only linked product and saves legacy schedule without other products', async () => {
 state.role = 'OWNER'; state.permission = true
 vi.mocked(getRentalPromos).mockResolvedValueOnce({ data: { data: { timezone: 'Asia/Jakarta', promos: [{ name: 'Siang', start_minute: 720, end_minute: 1020, days: [], enabled: true, product_ids: ['p1','p2'], promo_prices: { p1: 20000, p2: 50000 } }] } } } as unknown as Awaited<ReturnType<typeof getRentalPromos>>)
 await act(async () => { root.render(<QueryClientProvider client={client}><RentalPromoModal tableId="t1" rentalProductId="p1" onClose={() => {}} /></QueryClientProvider>) })
 await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)) })
 expect(api.get).toHaveBeenCalledWith('/product/p1')
 expect(document.body.textContent).toContain('Biliar')
 expect(document.body.textContent).toContain('rentalLegacyProductsNotice')
 expect(document.body.textContent).not.toContain('rentalChoosePackage')
 expect(document.querySelector('input[aria-label="rentalPromoPrice"]')).toHaveProperty('value', '20.000')
 await act(async () => { document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
 expect(saveRentalPromos).toHaveBeenCalledWith('t1', expect.objectContaining({ promos: [expect.objectContaining({ product_ids: ['p1'], promo_prices: { p1: 20000 } })] }))
})
