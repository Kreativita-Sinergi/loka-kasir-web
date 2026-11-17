import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import SalesRegisterPage from './SalesRegisterPage'
import { getSalesRecruitment, loginSales, registerSales } from '@/api/sales'

const session = vi.hoisted(() => ({ token: null as string | null }))
vi.mock('@/api/sales', () => ({ getSalesRecruitment: vi.fn(), registerSales: vi.fn(), loginSales: vi.fn(), salesToken: { get: () => session.token, set: (token: string) => { session.token = token } } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@marsidev/react-turnstile', () => ({ Turnstile: () => null }))
let host: HTMLDivElement
let root: Root
const settle = () => new Promise((resolve) => setTimeout(resolve, 20))
beforeEach(() => {
  vi.clearAllMocks(); session.token = null
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })
async function fill(id: string, value: string) {
  await act(async () => {
    const input = host.querySelector<HTMLInputElement>(`#${id}`)!
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}
it('sends new partners directly to the kit after saving their separate sales session', async () => {
  vi.mocked(getSalesRecruitment).mockResolvedValue({ data: { status: true, data: { limit: 100, reserved: 1, remaining: 99, registration_open: true, terms_version: '2026-10-26' } } } as Awaited<ReturnType<typeof getSalesRecruitment>>)
  vi.mocked(registerSales).mockResolvedValue({ data: { status: true, data: { status: 'pending' } } } as Awaited<ReturnType<typeof registerSales>>)
  vi.mocked(loginSales).mockResolvedValue({ data: { data: { token: 'new-sales-session' } } } as Awaited<ReturnType<typeof loginSales>>)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await act(async () => { root.render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/mitra/daftar']}><Routes><Route path="/mitra/daftar" element={<SalesRegisterPage />} /><Route path="/mitra/bahan" element={<p>Materials ready</p>} /><Route path="/mitra" element={<p>Unexpected home redirect</p>} /></Routes></MemoryRouter></QueryClientProvider>); await settle() })
  await act(settle)
  await fill('sales-name', 'Calon Mitra'); await fill('sales-signup-email', 'partner@example.test'); await fill('sales-phone', '081234567890'); await fill('sales-signup-password', 'safe-password-123'); await fill('sales-signup-confirmation', 'safe-password-123')
  await act(async () => { host.querySelector<HTMLInputElement>('#sales-accept-terms')!.click() })
  await act(async () => { host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settle() })
  expect(registerSales).toHaveBeenCalledWith(expect.objectContaining({ accept_terms: true, terms_version: '2026-10-26', email: 'partner@example.test' }), 'dev-no-captcha')
  expect(session.token).toBe('new-sales-session')
  expect(host.textContent).toContain('Materials ready')
  expect(host.textContent).not.toContain('Unexpected home redirect')
})
