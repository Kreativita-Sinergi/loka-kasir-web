import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { PermissionCode } from '@/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  /**
   * Optional: redirect to /unauthorized if the user lacks this permission.
   * Omit for routes that only require authentication (any logged-in user).
   */
  permission?: PermissionCode
}

/**
 * Route-level guard. Two layers:
 *  1. Authentication — if no valid token → /login
 *  2. Authorization  — if `permission` is provided and the user lacks it → /unauthorized
 *
 * Usage in App.tsx:
 *   <ProtectedRoute permission="reports.financial">
 *     <FinancialReportPage />
 *   </ProtectedRoute>
 */
export default function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  const can = useAuthStore((s) => s.can)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (permission && !can(permission)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
