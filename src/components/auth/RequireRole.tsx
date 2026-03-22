import { useAuthStore } from '@/store/authStore'

interface RequireRoleProps {
  /** Role names that are permitted to see the children, e.g. ['Owner', 'Manager'] */
  allowedRoles: string[]
  children: React.ReactNode
  /** What to render when the user's role is not allowed. Defaults to null (hidden). */
  fallback?: React.ReactNode
}

/**
 * Hides `children` when the logged-in user's role is not in `allowedRoles`.
 *
 * Usage:
 *   <RequireRole allowedRoles={['Owner', 'Manager']}>
 *     <button>Approve Transfer</button>
 *   </RequireRole>
 *
 *   <RequireRole allowedRoles={['Owner']} fallback={<span>No access</span>}>
 *     <AdminPanel />
 *   </RequireRole>
 */
export default function RequireRole({ allowedRoles, children, fallback = null }: RequireRoleProps) {
  const { user } = useAuthStore()
  const roleName = user?.role?.name ?? ''

  if (!allowedRoles.includes(roleName)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
