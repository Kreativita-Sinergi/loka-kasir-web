import { usePermissions } from '@/hooks/usePermissions'
import type { PermissionCode } from '@/types'

interface PermissionGuardProps {
  /**
   * The user must hold THIS permission for children to be visible.
   * If omitted, children are always shown (use RequireRole for role-only checks).
   */
  permission?: PermissionCode

  /**
   * Alternative: user must hold ANY of these codes.
   * Use when multiple roles should see the same element.
   */
  anyOf?: PermissionCode[]

  children: React.ReactNode

  /**
   * Rendered when the permission check fails.
   * Defaults to null (hidden, no DOM node at all).
   */
  fallback?: React.ReactNode
}

/**
 * Inline component guard — renders `children` only if the logged-in user
 * has the required permission. Renders `fallback` (default: nothing) otherwise.
 *
 * Prefer this over conditional `{can(...) && <X />}` because it is explicit
 * about intent and testable in isolation.
 *
 * @example
 * // Hide the Refund button from Kasir (who lacks pos.refund)
 * <PermissionGuard permission="pos.refund">
 *   <RefundButton />
 * </PermissionGuard>
 *
 * @example
 * // Show a degraded CTA when Pelayan cannot pay
 * <PermissionGuard
 *   permission="pos.do_payment"
 *   fallback={<p className="text-gray-400 text-sm">Hubungi kasir untuk pembayaran</p>}
 * >
 *   <PayButton />
 * </PermissionGuard>
 *
 * @example
 * // Visible to either Owner or Manager
 * <PermissionGuard anyOf={['reports.financial', 'reports.view']}>
 *   <FinancialSummaryCard />
 * </PermissionGuard>
 */
export default function PermissionGuard({
  permission,
  anyOf,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { can, canAny } = usePermissions()

  const allowed = (() => {
    if (anyOf && anyOf.length > 0) return canAny(...anyOf)
    if (permission) return can(permission)
    return true // no restriction specified
  })()

  return allowed ? <>{children}</> : <>{fallback}</>
}
