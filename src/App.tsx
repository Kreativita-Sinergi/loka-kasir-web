import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import SubscriptionGuard from '@/components/SubscriptionGuard'
import MainLayout from '@/components/layout/MainLayout'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { PERMS } from '@/hooks/usePermissions'

import LoginPage from '@/pages/LoginPage'
import UnauthorizedPage from '@/pages/UnauthorizedPage'
import DashboardPage from '@/pages/DashboardPage'
import MembershipPage from '@/pages/MembershipPage'
import TransactionsPage from '@/pages/TransactionsPage'
import ProductsPage from '@/pages/ProductsPage'
import EmployeesPage from '@/pages/EmployeesPage'
import ShiftsPage from '@/pages/ShiftsPage'
import NotificationsPage from '@/pages/NotificationsPage'
import PlatformPage from '@/pages/PlatformPage'
import LibraryPage from '@/pages/LibraryPage'
import OutletsPage from '@/pages/OutletsPage'
import StockTransferPage from '@/pages/inventory/StockTransferPage'
import StockMovementPage from '@/pages/inventory/StockMovementPage'
import StockCurrentPage from '@/pages/inventory/StockCurrentPage'
import CustomersPage from '@/pages/CustomersPage'
import TerminalsPage from '@/pages/master/TerminalsPage'
import TablesPage from '@/pages/master/TablesPage'
import ReportsPage from '@/pages/ReportsPage'
import FinancialReportsPage from '@/pages/FinancialReportsPage'
import RbacPage from '@/pages/settings/RbacPage'

// ─── Helper: wrap page with ErrorBoundary + optional permission guard ────────
function Page({
  element,
  permission,
}: {
  element: React.ReactElement
  permission?: string
}) {
  return (
    <ProtectedRoute permission={permission}>
      <ErrorBoundary>{element}</ErrorBoundary>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* All authenticated routes live under MainLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <SubscriptionGuard>
              <MainLayout />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      >
        {/* Overview */}
        <Route index element={<Page element={<DashboardPage />} permission={PERMS.REPORTS_VIEW} />} />

        {/* POS Operations */}
        <Route path="transactions" element={<Page element={<TransactionsPage />} permission={PERMS.POS_CREATE_ORDER} />} />
        <Route path="customers"    element={<Page element={<CustomersPage />}    permission={PERMS.POS_CREATE_ORDER} />} />
        <Route path="shifts"       element={<Page element={<ShiftsPage />}       permission={PERMS.POS_OPEN_SHIFT} />} />

        {/* Catalog */}
        <Route path="products" element={<Page element={<ProductsPage />} permission={PERMS.INVENTORY_VIEW} />} />
        <Route path="library"  element={<Page element={<LibraryPage />}  permission={PERMS.INVENTORY_VIEW} />} />

        {/* Inventory */}
        <Route path="inventory/current-stock" element={<Page element={<StockCurrentPage />}  permission={PERMS.INVENTORY_VIEW} />} />
        <Route path="inventory/transfers"     element={<Page element={<StockTransferPage />} permission={PERMS.INVENTORY_TRANSFER} />} />
        <Route path="inventory/movements"     element={<Page element={<StockMovementPage />} permission={PERMS.INVENTORY_VIEW} />} />

        {/* Management — restricted to roles with settings/employee access */}
        <Route path="outlets"           element={<Page element={<OutletsPage />}   permission={PERMS.SETTINGS_VIEW} />} />
        <Route path="employees"         element={<Page element={<EmployeesPage />} permission={PERMS.EMPLOYEE_VIEW} />} />
        <Route path="master/terminals"  element={<Page element={<TerminalsPage />} permission={PERMS.SETTINGS_VIEW} />} />
        <Route path="master/tables"     element={<Page element={<TablesPage />}    permission={PERMS.SETTINGS_VIEW} />} />
        <Route path="membership"        element={<Page element={<MembershipPage />} permission={PERMS.SETTINGS_VIEW} />} />

        {/* Reports */}
        <Route path="reports"            element={<Page element={<ReportsPage />}          permission={PERMS.REPORTS_VIEW} />} />
        <Route path="reports/financial"  element={<Page element={<FinancialReportsPage />}  permission={PERMS.REPORTS_FINANCIAL} />} />

        {/* Settings / Admin */}
        <Route path="settings/rbac" element={<Page element={<RbacPage />} permission={PERMS.RBAC_MANAGE} />} />

        {/* Platform / Settings — owner-level */}
        <Route path="platform" element={<Page element={<PlatformPage />}    permission={PERMS.SETTINGS_EDIT} />} />

        {/* Notifications — available to all authenticated users */}
        <Route path="notifications" element={<Page element={<NotificationsPage />} />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
