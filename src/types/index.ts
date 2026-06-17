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
  /** "free" | "trial" | "lite" | "pro" */
  type: string
  start_date: string
  end_date: string
  is_active: boolean
  /** Computed by backend: "free" | "trial" | "lite" | "pro" */
  tier: string
  /** Hari tersisa sampai masa aktif habis (≥ 0) */
  days_remaining: number
  /** true jika tier "pro" ATAU trial aktif belum kadaluarsa */
  is_pro: boolean
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
  is_email_verified: boolean
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
  is_email_verified: boolean
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
export type DiscountScope = 'global' | 'category' | 'product' | 'variant'

export interface Discount {
  id: string
  name: string
  description: string | null
  amount: number
  is_percentage: boolean
  /** Scope hierarki diskon: global | category | product | variant */
  scope: DiscountScope | null
  /** ID entitas yang dikenai diskon (category_id / product_id / variant_id). Null jika scope=global. */
  ref_id: string | null
  /** @deprecated gunakan scope="global". Dipertahankan untuk backward compat. */
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
  /** Apakah produk ini dikenakan pajak (PB1/Pajak Restoran). Default true. */
  is_taxable: boolean
  /** Apakah produk ini perlu dimasak/diproses dapur. Jika true, tampil di KDS. */
  is_cookable: boolean
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
  notes: string | null
  points_balance: number
  created_at: string
  updated_at: string
}

// ─── Payment Method ────────────────────────────────────────────────────────
export interface PaymentMethod {
  id: number
  code: string
  name: string
}

// ─── Sold products (agregasi "Produk Terjual") ───────────────────────────────
export interface SoldProduct {
  product_id: string
  product_name: string
  units_sold: number
  revenue: number
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
  /** Harga jual per unit sebelum diskon (termasuk modifier) */
  sell_price: number
  /** Total nominal diskon item-level untuk baris ini (sudah × qty) */
  discount_amount: number
  /** Harga per unit setelah item-level discount, sebelum pajak */
  net_price: number
  /** @deprecated sama dengan discount_amount; dipertahankan untuk backward compat */
  discount: number
  promo: number
  /** Total pajak untuk baris ini */
  tax: number
  unit_price: number
  /** Jumlah akhir baris: (net_price × qty) + tax */
  total: number
  base_price: number
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
  /** Nama metode bayar dari server (mis. "Tunai", "QRIS"). */
  payment_method_name?: string | null
  amount: number
  /** QRIS ref, card last 4, etc. */
  reference: string | null
  /** EDC (ECR) reference/trace number. */
  edc_reference_no: string | null
  /** EDC approval (auth) code from the acquirer. */
  edc_approval_code: string | null
  /** Card type / network or DEBIT|CREDIT|QRIS. */
  edc_card_type: string | null
  /** Acquirer/bank of the EDC, e.g. BCA/MANDIRI. */
  edc_acquirer: string | null
  paid_at: string
}

export interface Transaction {
  transaction_id: string
  business_id: string
  outlet_id: string | null
  outlet: Outlet | null
  customer: Customer
  cashier: Employee | null
  payment_method_id: number | null
  bill_number: string
  queue_number?: string | null
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
  cashier: Employee | null
  outlet: Outlet | null
  shift_schedule: ShiftSchedule | null
  opened_at: string
  closed_at: string | null
  scheduled_end_at: string | null
  opening_cash: number
  closing_cash: number | null
  total_sales: number
  total_refunds: number
  /** Jumlah transaksi lunas pada shift ini per metode pembayaran + nominalnya. */
  cash_orders?: number | null
  qris_orders?: number | null
  cash_amount?: number | null
  qris_amount?: number | null
  status: string
  notes: string | null
  alert_status: string
  time_remaining_minutes: number | null
  expected_cash: number | null
  discrepancy: number | null
  total_cash_in: number | null
  total_cash_out: number | null
  total_cancels: number | null
  total_tax?: number | null
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
export type OutletSubscriptionStatus = 'active' | 'trial' | 'expired' | 'inactive'

export interface Outlet {
  id: string
  business_id: string
  name: string
  address: string | null
  phone: string | null
  is_active: boolean
  subscription_status: OutletSubscriptionStatus
  subscription_end_date: string | null
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
  /** Diisi untuk produk bervarian — stok dicatat di level varian. */
  variant_id?: string | null
  quantity: number
  notes?: string | null
}

export interface StockAdjustmentPayload {
  outlet_id: string
  product_id: string
  /** Diisi untuk produk bervarian. */
  variant_id?: string | null
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
  require_pin_for_void: boolean
  // Receipt / struk settings
  header_text: string | null
  footer_text: string | null
  note_text: string | null
  show_logo: boolean
  show_tax_percentage: boolean
  paper_size: string
  show_social_media: boolean
  instagram_handle: string | null
  logo_url: string | null
  // Queue
  queue_enabled: boolean
  queue_last_number: number
  queue_prefix: string | null
  queue_suffix: string | null
  // Service fee
  service_fee_enabled: boolean
  service_fee_rate: number
  service_fee_taxable: boolean
  service_fee_order_types: string
  // Rounding
  rounding_enabled: boolean
  rounding_denomination: number
  // Kasbon / Bayar Sebagian
  allow_partial_payment: boolean
  // QRIS milik merchant. mode 'static' (manual) | 'dynamic' (Duitku merchant).
  qris_enabled: boolean
  qris_mode: 'static' | 'dynamic'
  qris_image_url: string | null
  payment_link: string | null
  duitku_merchant_code: string | null
  /** true bila API key Duitku merchant sudah tersimpan (key tidak pernah dikirim balik). */
  duitku_configured: boolean
  created_at: string
  updated_at: string
}

// ─── PaymentOrder ──────────────────────────────────────────────────────────

export type PaymentOrderStatus = 'pending' | 'paid' | 'expired' | 'cancelled'
export type PaymentOrderType   = 'membership_upgrade' | 'outlet_addon' | 'pos_transaction'

export interface PaymentOrder {
  id: string
  business_id: string
  type: PaymentOrderType
  reference_id: string | null
  plan: string | null
  amount: number
  status: PaymentOrderStatus
  /** Reference ID dari Duitku, tersedia setelah invoice berhasil dibuat. */
  duitku_reference: string | null
  /** URL halaman checkout Duitku yang dibuka oleh user untuk membayar. */
  payment_url: string | null
  expired_at: string
  paid_at: string | null
  created_at: string
}

// ─── Attendance ────────────────────────────────────────────────────────────
export type AttendanceStatus = 'ONTIME' | 'LATE'

export interface AttendanceEmployeeSummary {
  id: string
  name: string
  role: string
}

export interface AttendanceOutletSummary {
  id: string
  name: string
}

export interface Attendance {
  id: string
  business_id: string
  employee_id: string
  employee: AttendanceEmployeeSummary | null
  outlet_id: string | null
  outlet: AttendanceOutletSummary | null
  clock_in: string
  clock_out: string | null
  lat: number | null
  lng: number | null
  status: AttendanceStatus
  /** Path di device kasir (Flutter). Null jika tidak ada foto. */
  local_image_path: string | null
  notes: string | null
  /** Durasi kerja dalam format "Xj Ym" atau "-" jika belum clock-out. */
  duration: string
  created_at: string
  updated_at: string
}

export interface AttendanceFilterParams {
  start_date?: string
  end_date?: string
  outlet_id?: string
  employee_id?: string
  employee_name?: string
  status?: AttendanceStatus | ''
  page?: number
  limit?: number
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

// ─── Raw Materials (Bahan Baku) ─────────────────────────────────────────────

export interface RawMaterial {
  id: string
  name: string
  sku: string | null
  stock: number
  avg_cost: number
  min_stock: number
  is_low_stock: boolean
  is_active: boolean
  unit: UnitSummary | null
  created_at: string
  updated_at: string
}

export interface UnitSummary {
  id: string
  name: string
  alias: string
}

export interface RawMaterialMovement {
  id: string
  raw_material_id: string
  type: 'IN' | 'OUT' | 'ADJUSTMENT'
  quantity: number
  unit_cost: number
  total_cost: number
  avg_cost_before: number
  avg_cost_after: number
  stock_before: number
  stock_after: number
  notes: string | null
  created_by: string
  created_at: string
}

// ─── Product BOM / Ingredients ───────────────────────────────────────────────

export interface ProductIngredient {
  id: string
  raw_material_id: string
  raw_material: RawMaterial | null
  quantity: number
  line_cost: number
}

export interface ProductBOM {
  product_id: string
  ingredients: ProductIngredient[]
  total_base_hpp: number
}

// ─── Business OPEX ──────────────────────────────────────────────────────────

export interface BusinessOpex {
  id?: string
  business_id: string
  monthly_fixed_costs: number
  target_sales_volume: number
  default_margin: number
  overhead_per_item: number
  created_at?: string
  updated_at?: string
}

// ─── Smart Pricing ──────────────────────────────────────────────────────────

export interface PricingSuggestion {
  product_id: string
  product_name: string
  current_sell_price: number | null
  base_hpp: number
  overhead_per_item: number
  target_margin_percent: number
  suggested_price: number
  suggested_discount_limit: number
  price_diff: number
  is_outdated: boolean
}

// ─── Profitability Report ────────────────────────────────────────────────────

export interface ProductProfitability {
  product_id: string
  product_name: string
  units_sold: number
  revenue: number
  base_hpp: number
  overhead_per_item: number
  total_cogs: number
  gross_profit: number
  gross_margin: number
  has_bom: boolean
}

export interface ProfitabilityReport {
  period: string
  total_revenue: number
  total_cogs: number
  gross_profit: number
  gross_margin: number
  products: ProductProfitability[]
}

// ─── Supplier ────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string
  name: string
  code?: string | null
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  is_active: boolean
  created_at: string
}

// ─── Purchase Order ──────────────────────────────────────────────────────────

export interface POItem {
  id: string
  raw_material_id: string
  raw_material_name: string
  unit_alias: string
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  subtotal: number
}

export interface PurchaseOrder {
  id: string
  po_number: string
  status: 'draft' | 'ordered' | 'partial_received' | 'received' | 'cancelled'
  supplier?: Supplier | null
  order_date: string
  expected_date?: string | null
  notes?: string | null
  total_amount: number
  items: POItem[]
  created_at: string
}

// ─── Loyalty Program ─────────────────────────────────────────────────────────

export interface LoyaltyConfig {
  id: string
  business_id: string
  points_per_thousand_idr: number
  min_redeem_points: number
  point_value_idr: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LoyaltyTransaction {
  id: string
  customer_id: string
  type: 'EARN' | 'REDEEM'
  points: number
  balance_before: number
  balance_after: number
  notes: string | null
  ref_transaction_id: string | null
  created_at: string
}

export interface CustomerLoyalty {
  customer_id: string
  customer_name: string
  points_balance: number
  config: LoyaltyConfig | null
}
