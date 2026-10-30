import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useCanWrite, useSubscriptionStatus, effectiveStatus } from './useSubscription'
import { usePermissions } from './usePermissions'
import { useAuthStore } from '@/store/authStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { SubscriptionLockedBanner } from '@/components/membership/SubscriptionLock'
import { setActiveLocale } from '@/lib/i18n'
import type { AuthUser, Membership } from '@/types'

const future = new Date(Date.now() + 86_400_000).toISOString()
const past = new Date(Date.now() - 86_400_000).toISOString()
const membership = (o: Partial<Membership>): Membership =>
  ({ id: 'm', type: 'trial', tier: 'trial', is_active: true, start_date: past, end_date: future, days_remaining: 1, is_pro: true, ...o })

function signIn(m: Membership | null, role = 'OWNER', permissions: string[] = []) {
  useAuthStore.setState({
    token: 't',
    user: { role: { code: role, name: role }, permissions, business: { membership: m } } as unknown as AuthUser,
  })
}

let host: HTMLDivElement
let root: Root
function Probe() {
  const value = { status: useSubscriptionStatus(), canWrite: useCanWrite(), isPro: usePermissions().isPro }
  return <output>{JSON.stringify(value)}</output>
}
const seen = () => JSON.parse(host.querySelector('output')!.textContent!) as { status: string; canWrite: boolean; isPro: boolean }
function render(node: React.ReactNode) {
  act(() => root.render(<MemoryRouter>{node}</MemoryRouter>))
}

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  setActiveLocale('id')
  useSubscriptionStore.getState().reset()
  host = document.createElement('div')
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  useAuthStore.setState({ user: null, token: null })
  useSubscriptionStore.getState().reset()
})

describe('subscription access', () => {
  it('a running trial can write', () => {
    signIn(membership({}))
    render(<Probe />)
    expect(seen()).toEqual({ status: 'TRIAL', canWrite: true, isPro: true })
  })

  it('an ended trial is view-only but keeps Pro pages viewable', () => {
    signIn(membership({ end_date: past }))
    render(<Probe />)
    expect(seen()).toEqual({ status: 'EXPIRED', canWrite: false, isPro: true })
  })

  it('a 402 overrides stale login data', () => {
    signIn(membership({ type: 'pro', tier: 'pro' }))
    useSubscriptionStore.getState().setStatus('EXPIRED')
    render(<Probe />)
    expect(seen().status).toBe('EXPIRED')
    expect(seen().canWrite).toBe(false)
  })

  it('outside a dashboard session nothing is locked', () => {
    render(<Probe />)
    expect(seen().canWrite).toBe(true)
  })

  it('effectiveStatus prefers the direct signal', () => {
    expect(effectiveStatus(null, membership({}))).toBe('TRIAL')
    expect(effectiveStatus('ACTIVE', membership({ end_date: past }))).toBe('ACTIVE')
  })
})

describe('SubscriptionLockedBanner', () => {
  it('stays hidden while the subscription is running', () => {
    signIn(membership({}))
    render(<SubscriptionLockedBanner />)
    expect(host.textContent).toBe('')
  })

  it('offers the owner a renew action', () => {
    signIn(membership({ status: 'expired', tier: 'expired' }))
    render(<SubscriptionLockedBanner />)
    expect(host.textContent).toContain('Langganan berakhir — mode lihat saja')
    expect(host.querySelector('button')?.textContent).toBe('Perpanjang')
  })

  it('tells staff without billing access to ask the owner', () => {
    signIn(membership({ status: 'expired', tier: 'expired' }), 'KASIR', ['pos.create_order'])
    render(<SubscriptionLockedBanner />)
    expect(host.querySelector('button')).toBeNull()
    expect(host.textContent).toContain('Minta pemilik memperpanjang')
  })
})
