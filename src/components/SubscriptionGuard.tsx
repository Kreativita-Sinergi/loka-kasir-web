import { Navigate, useLocation } from 'react-router-dom'
import { useSubscriptionStore, deriveStatus } from '@/store/subscriptionStore'
import { useAuthStore } from '@/store/authStore'

/**
 * Subscription-aware route guard. Must sit inside <ProtectedRoute> so that
 * `authStore.user` is always populated when this component renders.
 *
 * Status resolution (two-signal approach):
 *  1. PRIMARY  — `subscriptionStore.status` (set reactively by the Axios
 *                 interceptor on HTTP 402, or proactively after a successful
 *                 upgrade on MembershipPage)
 *  2. FALLBACK — derived inline from `authStore.user.business.membership`
 *                 (the data stored at login time).
 *
 * Using the fallback means the guard is correct on the very first render
 * after a page refresh — no 402 round-trip needed to discover an expired
 * trial. Once the store is seeded (status !== null) the fallback is ignored.
 *
 * Access rules:
 *  - TRIAL   → full dashboard access (active free trial)
 *  - ACTIVE  → full dashboard access (paid subscription)
 *  - EXPIRED → hard redirect to /membership; the /membership route itself
 *               is explicitly exempted to avoid a redirect loop
 *  - null    → falls back to inline derivation; never blocks on its own
 */
export default function SubscriptionGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const status = useSubscriptionStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const { pathname } = useLocation()

  // If the store hasn't been seeded yet, derive the status proactively
  // from the membership data that was persisted in localStorage at login.
  const effectiveStatus = status ?? deriveStatus(user?.business?.membership)

  // Allow /membership and any nested path through unconditionally —
  // this is where expired users go to pay, so blocking it would create
  // an unescapable redirect loop.
  const isBillingRoute =
    pathname === '/membership' || pathname.startsWith('/membership/')

  if (effectiveStatus === 'EXPIRED' && !isBillingRoute) {
    return <Navigate to="/membership" replace />
  }

  return <>{children}</>
}
