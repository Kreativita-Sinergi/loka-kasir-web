import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import MainLayout from '@/components/layout/MainLayout'
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
        <Route index element={<DashboardPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="shifts" element={<ShiftsPage />} />
        <Route path="membership" element={<MembershipPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="platform" element={<PlatformPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
