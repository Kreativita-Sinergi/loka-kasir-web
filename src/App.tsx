import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import MainLayout from '@/components/layout/MainLayout'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import LoginPage from '@/pages/LoginPage'
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
import CustomersPage from '@/pages/CustomersPage'
import TerminalsPage from '@/pages/master/TerminalsPage'
import TablesPage from '@/pages/master/TablesPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
        <Route path="transactions" element={<ErrorBoundary><TransactionsPage /></ErrorBoundary>} />
        <Route path="products" element={<ErrorBoundary><ProductsPage /></ErrorBoundary>} />
        <Route path="employees" element={<ErrorBoundary><EmployeesPage /></ErrorBoundary>} />
        <Route path="shifts" element={<ErrorBoundary><ShiftsPage /></ErrorBoundary>} />
        <Route path="membership" element={<ErrorBoundary><MembershipPage /></ErrorBoundary>} />
        <Route path="notifications" element={<ErrorBoundary><NotificationsPage /></ErrorBoundary>} />
        <Route path="platform" element={<ErrorBoundary><PlatformPage /></ErrorBoundary>} />
        <Route path="library" element={<ErrorBoundary><LibraryPage /></ErrorBoundary>} />
        <Route path="outlets" element={<ErrorBoundary><OutletsPage /></ErrorBoundary>} />
        {/* Inventory */}
        <Route path="inventory/transfers" element={<ErrorBoundary><StockTransferPage /></ErrorBoundary>} />
        <Route path="inventory/movements" element={<ErrorBoundary><StockMovementPage /></ErrorBoundary>} />
        {/* CRM */}
        <Route path="customers" element={<ErrorBoundary><CustomersPage /></ErrorBoundary>} />
        {/* Master */}
        <Route path="master/terminals" element={<ErrorBoundary><TerminalsPage /></ErrorBoundary>} />
        <Route path="master/tables" element={<ErrorBoundary><TablesPage /></ErrorBoundary>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
