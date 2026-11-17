import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import VerifyEmailPage from './VerifyEmailPage'
import { verifyAccountOtp } from '@/api/auth'
import { applyReferral } from '@/api/referral'
const state = vi.hoisted(() => ({ authenticated: false }))
vi.mock('@/api/auth', () => ({ verifyAccountOtp: vi.fn(), resendAccountOtp: vi.fn() }))
vi.mock('@/api/referral', () => ({ applyReferral: vi.fn(), isReferralCode: (code: string) => /^[A-Z0-9]{4,12}$/.test(code) }))
vi.mock('@/store/authStore', () => ({ useAuthStore: (selector: (s: unknown) => unknown) => selector({ setAuth: () => { state.authenticated = true } }) }))
vi.mock('@/lib/jwt', () => ({ hydrateUserFromToken: (user: unknown) => user }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
let root: Root
let host: HTMLDivElement
afterEach(() => { act(() => root?.unmount()); host?.remove(); sessionStorage.clear() })
it('applies the sales invitation after OTP authentication and before onboarding', async () => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  state.authenticated = false
  sessionStorage.setItem('referral-code', 'SALEABCDEFGH')
  vi.mocked(verifyAccountOtp).mockResolvedValue({ data: { status: true, data: { id: 'owner', token: 'owner-token' } } } as Awaited<ReturnType<typeof verifyAccountOtp>>)
  vi.mocked(applyReferral).mockImplementation(async () => { expect(state.authenticated).toBe(true); return { data: { status: true } } as Awaited<ReturnType<typeof applyReferral>> })
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  await act(async () => { root.render(<MemoryRouter initialEntries={[{ pathname: '/verifikasi-email', state: { email: 'owner@example.test', from: 'register', referralCode: 'SALEABCDEFGH' } }]}><Routes><Route path="/verifikasi-email" element={<VerifyEmailPage />} /><Route path="/mulai" element={<p>Onboarding ready</p>} /></Routes></MemoryRouter>) })
  await act(async () => { const input = host.querySelector<HTMLInputElement>('#otp')!; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '123456'); input.dispatchEvent(new Event('input', { bubbles: true })) })
  await act(async () => { host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await new Promise(resolve => setTimeout(resolve,20)) })
  expect(applyReferral).toHaveBeenCalledWith('SALEABCDEFGH')
  expect(sessionStorage.getItem('referral-code')).toBeNull()
  expect(host.textContent).toContain('Onboarding ready')
})
