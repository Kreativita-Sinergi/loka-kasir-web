import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import SubscriptionGuard from './SubscriptionGuard'
import { useSubscriptionStore } from '@/store/subscriptionStore'

it.each(['/dashboard', '/membership'])('an expired business can still open %s (read-only, no redirect)', path => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  useSubscriptionStore.setState({ status: 'EXPIRED' })
  const host = document.createElement('div')
  const root = createRoot(host)
  try {
    act(() => root.render(<MemoryRouter initialEntries={[path]}><SubscriptionGuard><div>Page accessible</div></SubscriptionGuard></MemoryRouter>))
    expect(host.textContent).toBe('Page accessible')
  } finally {
    act(() => root.unmount())
    useSubscriptionStore.getState().reset()
  }
})
