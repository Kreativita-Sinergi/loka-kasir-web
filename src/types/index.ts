// ─── Base ──────────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  status: boolean
  message: string
  data: T
}

export interface PaginatedApiResponse<T> {
  status: boolean
  message: string
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    order_by: string
    sort_by: string
  }
}

export interface CursorPaginatedApiResponse<T> {
  status: boolean
  message: string
  data: T[]
  meta: {
    limit: number
    sort_by: string
    order_by: string
    next_cursor: string
    has_next: boolean
  }
}

// ─── Auth ──────────────────────────────────────────────────────────────────
export interface Role {
  id: number
  /** Stable uppercase code, e.g. "KASIR", "KOKI", "GUDANG". Added in RBAC v2. */
  code?: string
  name: string
}

/** Permission codes embedded in the JWT and stored locally. */
export type PermissionCode = string

/** App mode driven by the tenant's BusinessType archetype. */
export type AppMode = 'FNB' | 'RETAIL' | 'SERVICES'

export interface BusinessType {
  id: number
  code: string
  name: string
  description: string
  order_archetype: string
}

export interface Membership {
  id: string
  type: string
  start_date: string
  end_date: string
  is_active: boolean
}

export interface Business {
  id: string
  business_name: string
  owner_name: string
  image: string | null
  is_active: boolean
  business_type: BusinessType
  membership: Membership | null
  address?: string
  email?: string
  phone?: string
  provinsi?: string
  kota?: string
  kecamatan?: string
  postal_code?: string
  rating?: string
}

export interface AuthUser {
  id: string
  email: string | null
  phone_number: string
  token: string
  is_verified: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  role: Role
  business: Business
  /**
   * Flat list of permission codes decoded from the JWT.
   * Populated client-side by parseJwtPayload() after login.
   * Example: ["pos.create_order", "reports.view", "inventory.view"]
   */
  permissions: PermissionCode[]
  /**
   * UI mode driven by the tenant's BusinessType archetype.
   * Populated client-side from the JWT claim.
   */
  app_mode: AppMode
}

// ─── Users ─────────────────────────────────────────────────────────────────
export interface UserBusiness {
  id: string
  email: string | null
  phone_number: string
  token?: string
  is_verified: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  role: Role
  business: Business
}

// ─── Employee ──────────────────────────────────────────────────────────────
export interface Employee {
  id: string
  business: Business
  email: string | null
  phone_number: string | null
  name: string
  role: Role
  shift_schedule: ShiftSchedule | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Category ──────────────────────────────────────────────────────────────
export interface Category {
  id: string
  name: string
  parent_id: string | null
}

// ─── Brand ─────────────────────────────────────────────────────────────────
export interface Brand {
  id: string
  name: string
}

// ─── Tax ───────────────────────────────────────────────────────────────────
export interface Tax {
  id: string
  name: string
  is_percentage: boolean
  amount: number
  is_global: boolean
  is_active: boolean
}

// ─── Unit ──────────────────────────────────────────────────────────────────
export interface Unit {
  id: string
  business_id: string
  name: string
  alias: string
}

// ─── Discount ──────────────────────────────────────────────────────────────
export interface Discount {
  id: string
  name: string
  description: string | null
  amount: number
  is_percentage: boolean
  is_global: boolean
  is_multiple: boolean
  is_active: boolean
  start_at: string | null
  end_at: string | null
}

// ─── Terminal ──────────────────────────────────────────────────────────────
export interface Terminal {
  id: string
  business_id: string
  outlet_id: string | null
  outlet: Outlet | null
  name: string
  location: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Product ───────────────────────────────────────────────────────────────
export interface ProductVariant {
  id: string
  sku: string | null
  name: string
  description: string | null
  base_price: number | null
  sell_price: number | null
  final_price: number | null
  track_stock: boolean
  ignore_stock_check: boolean | null
  stock: number | null
  is_available: boolean
  is_active: boolean
}

export interface ProductAttribute {
  id: string
  name: string
  price: number
  image: string | null
  is_available: boolean
  is_active: boolean
}

export interface Product {
  id: string
  sku: string | null
  name: string
  description: string | null
  image: string | null
  base_price: number | null
  sell_price: number | null
  final_price: number | null
  stock: number | null
  track_stock: boolean
  ignore_stock_check: boolean | null
  minimum_sales: number | null
  is_available: boolean
  is_active: boolean
  has_variant: boolean
  variants: ProductVariant[] | null
  attributes: ProductAttribute[]
  category: Category | null
  brand: Brand | null
  tax: Tax | null
  discount: Discount | null
  unit: Unit | null
  created_at: string
  updated_at: string
}

// ─── Bundle ────────────────────────────────────────────────────────────────
export interface BundleItem {
  id: string
  product_id: string
  name: string
  description: string | null
  image: string | null
  base_price: number | null
  sell_price: number | null
  sku: string | null
  stock: number | null
  is_available: boolean
  is_active: boolean
  quantity: number
}

export interface Bundle {
  id: string
  name: string
  description: string | null
  image: string | null
  base_price: number | null
  sell_price: number | null
  sku: string | null
  stock: number | null
  is_available: boolean
  is_active: boolean
  items: BundleItem[]
}

// ─── Order Type ────────────────────────────────────────────────────────────
export interface OrderType {
  id: number
  code: string
  name: string
}

// ─── Table ─────────────────────────────────────────────────────────────────
export interface Table {
  id: string
  outlet_id: string
  outlet: Outlet | null
  number: string
  status: 'available' | 'occupied' | 'reserved'
  created_at: string
  updated_at: string
}

// ─── Customer ──────────────────────────────────────────────────────────────
export interface Customer {
  id: string
  business_id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  created_at: string
  updated_at: string
}

// ─── Payment Method ────────────────────────────────────────────────────────
export interface PaymentMethod {
  id: number
  code: string
  name: string
}

// ─── Transaction ───────────────────────────────────────────────────────────
export interface TransactionItemAttribute {
  id: string
  product_attribute_id: string
  additional_price: number
}

export type KitchenStatus = 'WAITING' | 'PREPARING' | 'READY' | 'SERVED'

export interface TransactionItem {
  id: string
  item_type: 'PRODUCT' | 'VARIANT' | 'BUNDLE'
  reference_id: string | null
  /** Denormalized name at time of purchase */
  name: string
  product_id: string | null
  product: Product | null
  bundle_id: string | null
  bundle: Bundle | null
  product_attribute_id: string | null
  product_variant_id: string | null
  quantity: number
  attributes: TransactionItemAttribute[]
  discount: number
  promo: number
  tax: number
  unit_price: number
  total: number
  base_price: number
  sell_price: number
  kitchen_status: KitchenStatus | null
  prepared_at: string | null
  served_at: string | null
  rating: number | null
}

export interface TransactionPayment {
  id: string
  transaction_id: string
  payment_method_id: number
  payment_method: PaymentMethod | null
  amount: number
  /** QRIS ref, card last 4, etc. */
  reference: string | null
  paid_at: string
}

export interface Transaction {
  transaction_id: string
  business_id: string
  outlet_id: string | null
  outlet: Outlet | null
  customer: Customer
  cashier: UserBusiness
  payment_method_id: number | null
  bill_number: string
  items: TransactionItem[]
  payments: TransactionPayment[] | null
  final_price: number
  base_price: number
  sell_price: number
  discount: number
  promo: number
  tax: number
  order_type: OrderType
  table: Table | null
  payment_status: string
  fulfillment_status: string | null
  /** @deprecated use payment_status */
  status: string
  order_status: string | null
  rating: number | null
  notes: string | null
  amount_received: number | null
  change: number | null
  paid_at: string | null
  refunded_at: string | null
  refunded_by: string | null
  refund_reason: string | null
  is_refunded: boolean
  canceled_at: string | null
  canceled_by: string | null
  canceled_reason: string | null
  is_canceled: boolean
  created_at: string
  updated_at: string
}

// ─── Shift ─────────────────────────────────────────────────────────────────
export interface ShiftSchedule {
  id: string
  business: Business
  name: string
  start_hour: number
  start_minute: number
  end_hour: number
  end_minute: number
  is_next_day: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Shift {
  id: string
  business: Business
  terminal: Terminal
  cashier: UserBusiness
  outlet: Outlet | null
  shift_schedule: ShiftSchedule | null
  opened_at: string
  closed_at: string | null
  scheduled_end_at: string | null
  opening_cash: number
  closing_cash: number | null
  total_sales: number
  total_refunds: number
  status: string
  notes: string | null
  alert_status: string
  time_remaining_minutes: number | null
}

// ─── Notification ──────────────────────────────────────────────────────────
export interface Notification {
  id: string
  business_id: string
  user_id: string
  title: string
  body: string
  type: string
  reference_id: string | null
  is_read: boolean
  created_at: string
}

// ─── Home/Dashboard ────────────────────────────────────────────────────────
export interface TopProduct {
  product_id: string
  product_name: string
  order_count: number
}

export interface TodaySummary {
  total_revenue: number
  total_orders: number
  total_items: number
}

export interface HomeData {
  today_summary: TodaySummary
  recent_orders: Transaction[]
  recent_items: TransactionItem[]
  recent_items_total: number
  top_products: TopProduct[]
}

// ─── Analytics ─────────────────────────────────────────────────────────────
export interface InsightItem {
  type: 'warning' | 'info' | 'success'
  title: string
  description: string
  metric?: string | number
}

export interface PeakHour {
  hour: number
  order_count: number
  revenue: number
}

export interface ProductPerformance {
  product_id: string
  product_name: string
  total_sold: number
  total_revenue: number
  growth_percentage: number | null
  is_slow_moving: boolean
}

export interface OutletComparison {
  business_id: string
  business_name: string
  total_revenue: number
  total_orders: number
  growth_percentage: number | null
}

export interface RevenueTrend {
  date: string
  revenue: number
  orders: number
}

export interface AnalyticsInsights {
  insights: InsightItem[]
  generated_at: string
}

// ─── Outlet ────────────────────────────────────────────────────────────────
export interface Outlet {
  id: string
  business_id: string
  name: string
  address: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OutletStock {
  id: string
  outlet_id: string
  product_id: string
  product: Product | null
  quantity: number
  is_available: boolean
}

export interface StockEntryPayload {
  outlet_id: string
  product_id: string
  quantity: number
  notes?: string | null
}

export interface StockAdjustmentPayload {
  outlet_id: string
  product_id: string
  actual_quantity: number
}

export interface UserOutlet {
  id: string
  user_id: string
  outlet_id: string
  employee: Employee | null
}

// ─── StockTransfer ─────────────────────────────────────────────────────────
export interface StockTransfer {
  id: string
  business_id: string
  from_outlet_id: string
  from_outlet: Outlet | null
  to_outlet_id: string
  to_outlet: Outlet | null
  product_id: string
  product: Product | null
  variant_id: string | null
  transfer_code: string
  quantity: number
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'CANCELED'
  notes: string | null
  created_by: string
  creator: { id: string; business: { owner_name: string } } | null
  approved_by: string | null
  approved_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

// ─── StockMovement ──────────────────────────────────────────────────────────
export interface StockMovement {
  id: string
  product_id: string
  product: Product | null
  variant_id: string | null
  outlet_id: string | null
  outlet: Outlet | null
  quantity: number
  type: 'IN' | 'OUT' | 'SALE' | 'REFUND' | 'ADJUSTMENT' | 'TRANSFER'
  reference_id: string | null
  reference_type: string | null
  created_by: string | null
  created_at: string
}

// ─── OutletConfig ───────────────────────────────────────────────────────────
export interface OutletConfig {
  id: string
  outlet_id: string
  has_table: boolean
  has_kitchen: boolean
  auto_print: boolean
  created_at: string
  updated_at: string
}

// ─── Pagination params ─────────────────────────────────────────────────────
export interface PaginationParams {
  page?: number
  limit?: number
  sort_by?: string
  order_by?: string
  search?: string
  status?: string
}
