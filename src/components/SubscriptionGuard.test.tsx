import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import SubscriptionGuard from './SubscriptionGuard'
import { useSubscriptionStore } from '@/store/subscriptionStore'

it('legacy expired status leaves the dashboard accessible', () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  useSubscriptionStore.setState({ status: 'EXPIRED' })
  const host = document.createElement('div')
  const root = createRoot(host)
  try {
    act(() => root.render(<MemoryRouter initialEntries={['/dashboard']}><SubscriptionGuard><div>Dashboard accessible</div></SubscriptionGuard></MemoryRouter>))
    expect(host.textContent).toBe('Dashboard accessible')
  } finally {
    act(() => root.unmount())
    useSubscriptionStore.setState({ status: null })
  }
})
