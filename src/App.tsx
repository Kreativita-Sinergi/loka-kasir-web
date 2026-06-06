import { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { lazyWithRetry as lazy } from '@/lib/lazyWithRetry'
import ProtectedRoute from '@/components/ProtectedRoute'
import SubscriptionGuard from '@/components/SubscriptionGuard'
import MainLayout from '@/components/layout/MainLayout'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import PlanGate from '@/components/ui/PlanGate'
import { PERMS } from '@/hooks/usePermissions'

// ─── Eagerly loaded (always needed on first paint) ───────────────────────────
import LoginPage from '@/pages/LoginPage'
import RequestAccessPage from '@/pages/RequestAccessPage'
import UnauthorizedPage from '@/pages/UnauthorizedPage'
import NotFoundPage from '@/pages/NotFoundPage'

// ─── Lazy-loaded pages (split into separate chunks) ──────────────────────────
const DashboardPage        = lazy(() => import('@/pages/DashboardPage'))
const MembershipPage       = lazy(() => import('@/pages/MembershipPage'))
const TransactionsPage     = lazy(() => import('@/pages/TransactionsPage'))
const ProductsPage         = lazy(() => import('@/pages/ProductsPage'))
const EmployeesPage        = lazy(() => import('@/pages/EmployeesPage'))
const ShiftsPage           = lazy(() => import('@/pages/ShiftsPage'))
const NotificationsPage    = lazy(() => import('@/pages/NotificationsPage'))
const PlatformPage         = lazy(() => import('@/pages/PlatformPage'))
const LibraryPage          = lazy(() => import('@/pages/LibraryPage'))
const OutletsPage          = lazy(() => import('@/pages/OutletsPage'))
const CustomersPage        = lazy(() => import('@/pages/CustomersPage'))
const ReportsPage          = lazy(() => import('@/pages/ReportsPage'))
const FinancialReportsPage = lazy(() => import('@/pages/FinancialReportsPage'))
const AttendancePage       = lazy(() => import('@/pages/AttendancePage'))
const ProfilePage          = lazy(() => import('@/pages/ProfilePage'))

// Inventory
const StockCurrentPage    = lazy(() => import('@/pages/inventory/StockCurrentPage'))
const StockTransferPage   = lazy(() => import('@/pages/inventory/StockTransferPage'))
const StockMovementPage   = lazy(() => import('@/pages/inventory/StockMovementPage'))
const RawMaterialsPage    = lazy(() => import('@/pages/inventory/RawMaterialsPage'))
const SuppliersPage       = lazy(() => import('@/pages/inventory/SuppliersPage'))
const PurchaseOrdersPage  = lazy(() => import('@/pages/inventory/PurchaseOrdersPage'))

// Master / settings
const TerminalsPage          = lazy(() => import('@/pages/master/TerminalsPage'))
const TablesPage             = lazy(() => import('@/pages/master/TablesPage'))
const RbacPage               = lazy(() => import('@/pages/settings/RbacPage'))
const PrivilegeListPage      = lazy(() => import('@/pages/settings/PrivilegeListPage'))
const FinanceSettingsPage    = lazy(() => import('@/pages/settings/FinanceSettingsPage'))
const LoyaltySettingsPage    = lazy(() => import('@/pages/settings/LoyaltySettingsPage'))

// HPP / pricing / reports
const PricingInsightsPage = lazy(() => import('@/pages/pricing/PricingInsightsPage'))
const ProfitabilityPage   = lazy(() => import('@/pages/reports/ProfitabilityPage'))

// Kasbon & Audit Log
const KasbonPage    = lazy(() => import('@/pages/KasbonPage'))
const AuditLogPage  = lazy(() => import('@/pages/AuditLogPage'))

// ─── Page shell: Suspense + ErrorBoundary + optional permission guard ────────
function PageFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  )
}

function Page({
  element,
  permission,
}: {
  element: React.ReactElement
  permission?: string
}) {
  return (
    <ProtectedRoute permission={permission}>
      <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          {element}
        </Suspense>
      </ErrorBoundary>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"        element={<LoginPage />} />
      <Route path="/register"     element={<RequestAccessPage />} />
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
        <Route path="kasbon"       element={<Page element={<KasbonPage />}       permission={PERMS.POS_CREATE_ORDER} />} />
        <Route path="customers"    element={<Page element={<PlanGate require="lite" feature="Pelanggan"><CustomersPage /></PlanGate>} permission={PERMS.POS_CREATE_ORDER} />} />
        <Route path="shifts"       element={<Page element={<ShiftsPage />}       permission={PERMS.POS_OPEN_SHIFT} />} />

        {/* Catalog */}
        <Route path="products" element={<Page element={<ProductsPage />} permission={PERMS.INVENTORY_VIEW} />} />
        <Route path="library"  element={<Page element={<LibraryPage />}  permission={PERMS.INVENTORY_VIEW} />} />

        {/* Inventory */}
        <Route path="inventory/current-stock"   element={<Page element={<StockCurrentPage />}   permission={PERMS.INVENTORY_VIEW} />} />
        <Route path="inventory/transfers"       element={<Page element={<PlanGate require="pro" feature="Transfer Stok"><StockTransferPage /></PlanGate>}  permission={PERMS.INVENTORY_TRANSFER} />} />
        <Route path="inventory/movements"       element={<Page element={<PlanGate require="pro" feature="Riwayat Stok"><StockMovementPage /></PlanGate>}  permission={PERMS.INVENTORY_VIEW} />} />
        <Route path="inventory/raw-materials"   element={<Page element={<PlanGate require="pro" feature="Bahan Baku"><RawMaterialsPage /></PlanGate>}   permission={PERMS.INVENTORY_VIEW} />} />
        <Route path="inventory/suppliers"       element={<Page element={<PlanGate require="pro" feature="Supplier"><SuppliersPage /></PlanGate>}       permission={PERMS.INVENTORY_VIEW} />} />
        <Route path="inventory/purchase-orders" element={<Page element={<PlanGate require="pro" feature="Purchase Order"><PurchaseOrdersPage /></PlanGate>}  permission={PERMS.INVENTORY_VIEW} />} />

        {/* Management */}
        <Route path="attendance"       element={<Page element={<PlanGate require="pro" feature="Absensi Karyawan"><AttendancePage /></PlanGate>} permission={PERMS.EMPLOYEE_VIEW} />} />
        <Route path="outlets"          element={<Page element={<OutletsPage />}   permission={PERMS.SETTINGS_VIEW} />} />
        <Route path="employees"        element={<Page element={<EmployeesPage />} permission={PERMS.EMPLOYEE_VIEW} />} />
        <Route path="master/terminals" element={<Page element={<TerminalsPage />} permission={PERMS.SETTINGS_VIEW} />} />
        <Route path="master/tables"    element={<Page element={<PlanGate require="lite" feature="Meja"><TablesPage /></PlanGate>} permission={PERMS.SETTINGS_VIEW} />} />
        <Route path="membership"       element={<Page element={<MembershipPage />} permission={PERMS.SETTINGS_VIEW} />} />

        {/* Reports */}
        <Route path="reports"               element={<Page element={<PlanGate require="pro" feature="Laporan Analitik"><ReportsPage /></PlanGate>} permission={PERMS.REPORTS_VIEW} />} />
        <Route path="reports/financial"     element={<Page element={<PlanGate require="lite" feature="Laporan Keuangan"><FinancialReportsPage /></PlanGate>}  permission={PERMS.REPORTS_FINANCIAL} />} />
        <Route path="reports/profitability" element={<Page element={<PlanGate require="pro" feature="Profitabilitas HPP"><ProfitabilityPage /></PlanGate>}     permission={PERMS.REPORTS_PROFITABILITY} />} />

        {/* Settings / Admin */}
        <Route path="audit-log"              element={<Page element={<AuditLogPage />}        permission={PERMS.SETTINGS_VIEW} />} />
        <Route path="settings/privilege-list" element={<Page element={<PrivilegeListPage />}  permission={PERMS.RBAC_MANAGE} />} />
        <Route path="settings/rbac"           element={<Page element={<RbacPage />}           permission={PERMS.RBAC_MANAGE} />} />
        <Route path="settings/finance"        element={<Page element={<PlanGate require="pro" feature="Pengaturan Keuangan"><FinanceSettingsPage /></PlanGate>} permission={PERMS.SETTINGS_VIEW} />} />
        <Route path="settings/loyalty"        element={<Page element={<PlanGate require="pro" feature="Program Loyalty"><LoyaltySettingsPage /></PlanGate>} permission={PERMS.SETTINGS_VIEW} />} />
        <Route path="pricing/insights"        element={<Page element={<PlanGate require="pro" feature="Rekomendasi Harga"><PricingInsightsPage /></PlanGate>} permission={PERMS.INVENTORY_VIEW} />} />

        {/* Platform — owner-level */}
        <Route path="platform" element={<Page element={<PlatformPage />} permission={PERMS.SETTINGS_EDIT} />} />

        {/* Available to all authenticated users */}
        <Route path="notifications" element={<Page element={<NotificationsPage />} />} />
        <Route path="profile"       element={<Page element={<ProfilePage />} />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
