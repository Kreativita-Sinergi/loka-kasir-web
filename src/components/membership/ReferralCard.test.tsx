import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReferralCard from './ReferralCard'
import { getReferral, applyReferral } from '@/api/referral'
import type { ReferralSummary } from '@/api/referral'

vi.mock('@/api/referral', () => ({ getReferral: vi.fn(), applyReferral: vi.fn(), reconcileReferral: vi.fn() }))
vi.mock('@/store/authStore', () => ({ useAuthStore: (selector: (s: unknown) => unknown) => selector({ user: { role: { code: 'OWNER' } } }) }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
const summary: ReferralSummary = { enabled: true, code: 'LK123456ABCDEF', applied_code: '', can_apply: true, first_purchase: true, balance: 0, reserved: 0, pending_reward: 0, history: [], open_orders: [] }
let host: HTMLDivElement
let root: Root
const settle = () => new Promise((resolve) => setTimeout(resolve, 20))
async function mount(data: ReferralSummary, plan = 'pro', amount = 59000) {
  vi.mocked(getReferral).mockResolvedValue({ data: { data } } as Awaited<ReturnType<typeof getReferral>>)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  host = document.createElement('div')
  root = createRoot(host)
  await act(async () => { root.render(<QueryClientProvider client={client}><ReferralCard plan={plan} amount={amount} /></QueryClientProvider>); await settle() })
  await act(settle)
}
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true })
afterEach(() => { act(() => root?.unmount()) })
describe('referral checkout', () => {
  it('uses the pending invitation code and applies it before checkout', async () => {
    sessionStorage.setItem('referral-code', 'LKABCDEF123456')
    vi.mocked(applyReferral).mockResolvedValue({} as Awaited<ReturnType<typeof applyReferral>>)
    await mount(summary)
    expect(host.querySelector('input')?.value).toBe('LKABCDEF123456')
    await act(async () => { host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settle() })
    expect(applyReferral).toHaveBeenCalledWith('LKABCDEF123456')
    expect(sessionStorage.getItem('referral-code')).toBeNull()
  })
  it('previews the first yearly discount without stacking earned credit', async () => {
    await mount({ ...summary, applied_code: 'LKABCDEF123456', can_apply: false, balance: 59000 }, 'pro-yearly', 590000)
    const text = host.textContent!.replace(/\s/g, '')
    expect(text).toContain('Rp540.000')
    expect(text).toContain('Rp50.000')
    expect(host.querySelector('form')).toBeNull()
  })
  it('caps wallet redemption at half the monthly invoice', async () => {
    await mount({ ...summary, balance: 59000, first_purchase: false })
    expect(host.textContent!.replace(/\s/g, '').match(/Rp29\.500/g)).toHaveLength(2)
  })
  it('does not offer referral savings on the three-year plan', async () => {
    await mount({ ...summary, balance: 59000 }, 'pro-3year', 1499000)
    expect(host.textContent).toContain(summary.code)
    expect(host.textContent).not.toContain('Perkiraan pembayaran')
  })
})
