// POS-specific types shared across the kasir feature (cart, payment, offline queue).
// These mirror the Flutter app's `order` + `payment` feature so the backend
// contract (`POST /transaction`, `PUT /transaction/payment/:id`,
// `POST /transaction/sync`) is identical across web and mobile.

import type { Product, ProductVariant, ProductAttribute } from '@/types'

export type CartItemType = 'PRODUCT' | 'VARIANT' | 'BUNDLE'

/** A single line in the cart. Mirrors app `CartRequest`. */
export interface CartItem {
  /** Stable client-side line id (so identical products with different modifiers stay distinct). */
  lineId: string
  itemType: CartItemType
  /** reference_id sent to backend: product id, variant id, or bundle id. */
  referenceId: string
  productId: string
  variantId: string | null
  name: string
  image: string | null
  /** Unit sell price BEFORE modifiers/discount/tax. */
  unitPrice: number
  quantity: number
  /** Selected modifiers (product attributes); each adds `price` per unit. */
  modifiers: ProductAttribute[]
  /** Whether the source product is taxed (PB1). */
  isTaxable: boolean
  /** Tax percentage (e.g. 10) resolved from the product's tax, if any. */
  taxPercent: number
  /** Per-unit discount nominal already resolved (item-level). */
  discountPerUnit: number
  notes: string | null
}

/** Backend payload item for `POST /transaction` & `POST /transaction/sync`. */
export interface TransactionItemPayload {
  item_type: CartItemType
  reference_id: string
  quantity: number
  attributes: { product_attribute_id: string; additional_price: number }[]
}

/** Backend payload for `POST /transaction` (create, unpaid). */
export interface CreateTransactionPayload {
  business_id: string
  cashier_id: string
  customer_name?: string | null
  service_type: number
  table?: string | null
  items: TransactionItemPayload[]
  notes?: string | null
  idempotency_key?: string | null
}

/** Backend payload for `PUT /transaction/payment/:id` (settle). */
export interface PaymentPayload {
  cashier_id: string
  payment_method_id: number
  amount_received?: number | null
  is_kasbon?: boolean
  reference?: string | null
  edc_reference_no?: string | null
  edc_approval_code?: string | null
  edc_card_type?: string | null
  edc_acquirer?: string | null
}

/** Offline queue row persisted in IndexedDB. */
export type PendingStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'CONFLICT'

export interface PendingTransaction {
  /** Local UUID. */
  id: string
  /** SHA-256 hex (64 chars) for backend idempotency. */
  idempotencyKey: string
  createdAtMs: number
  /** The create payload (sent via /transaction/sync). */
  create: CreateTransactionPayload
  /** The intended settlement, replayed via /transaction/payment/:id after sync. */
  payment: PaymentPayload | null
  status: PendingStatus
  retryCount: number
  conflictReason?: string | null
  serverTransactionId?: string | null
  /** True once the post-sync payment settlement succeeded. */
  settled: boolean
}

/** A held (parked) order for later recall. Mirrors app held orders. */
export interface HeldOrder {
  id: string
  label: string
  items: CartItem[]
  customerName: string | null
  orderTypeId: number
  tableId: string | null
  notes: string | null
  heldAt: number
}

/** Helpers to build backend payloads from a cart item. */
export function toItemPayload(item: CartItem): TransactionItemPayload {
  return {
    item_type: item.itemType,
    reference_id: item.referenceId,
    quantity: item.quantity,
    attributes: item.modifiers.map((m) => ({
      product_attribute_id: m.id,
      additional_price: m.price,
    })),
  }
}

/** Per-unit price including selected modifiers (before discount/tax). */
export function unitPriceWithModifiers(item: CartItem): number {
  const mods = item.modifiers.reduce((s, m) => s + (m.price ?? 0), 0)
  return item.unitPrice + mods
}

/** Resolve the effective sell price for a product/variant. */
export function resolveSellPrice(p: Pick<Product | ProductVariant, 'sell_price' | 'final_price' | 'base_price'>): number {
  return p.final_price ?? p.sell_price ?? p.base_price ?? 0
}
