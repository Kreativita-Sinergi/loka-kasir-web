import { publicApi } from '@/lib/axios'
import type { ApiResponse, Product } from '@/types'

// ─── QR Scan-to-Order (public, no auth) ──────────────────────────────────────

export interface PublicMenuCategory {
  id: string | null
  name: string
  products: Product[]
}

export interface PublicMenu {
  business_name: string
  business_logo: string | null
  outlet_name: string
  outlet_id: string
  table_number: string
  /** "table" = QR meja, "pickup" = link pesan online (ambil sendiri). */
  mode?: 'table' | 'pickup'
  categories: PublicMenuCategory[]
  /** Outlet siap menerima pembayaran QRIS langsung dari meja. */
  self_payment_enabled: boolean
  /** Mode pickup: "auto" | "manual"; kosong = bawa pulang tidak tersedia. */
  pickup_payment?: 'auto' | 'manual' | ''
  pickup_payment_minutes?: number
  /** Bayar QRIS dari HP untuk pesanan makan di tempat yang sudah diterima. */
  self_payment_mode?: 'auto' | 'manual' | ''
  /** Makan di tempat wajib dibayar QRIS saat dipesan (setiap pesanan). */
  prepay_dine_in?: boolean
  /** Pesan online: makan di tempat boleh dibayar di kasir. */
  pay_at_counter?: boolean
  /** Total di atas ini wajib QRIS (0/kosong = tanpa batas). */
  pay_at_counter_max?: number
  /** Outlet menjalankan dapur (KDS) — hanya dengan dapur status "siap" &
   * "diantar" bergerak sendiri. Rental PS/biliar selalu false. */
  has_kitchen?: boolean
  /** Hanya untuk meja rental (PS, biliar): sesi waktu & pesanannya. */
  rental?: PublicRental
}

// ─── Meja rental ─────────────────────────────────────────────────────────────

export interface PublicRentalProduct {
  id: string
  name: string
  image: string | null
  /** PAKET = bayar paket, timer mundur. METER = per jam, timer maju. */
  mode: 'PAKET' | 'METER'
  /** Harga satu paket (PAKET) atau tarif per jam (METER). */
  price: number
  package_minutes: number
  min_minutes: number
  max_packages: number
}

export interface PublicRentalOrderItem {
  name: string
  quantity: number
  total: number
  kitchen_status: string | null
}

export interface PublicRentalOrder {
  id: string
  /** pending = menunggu kasir; selain itu sudah diterima. */
  status: string
  created_at: string
  items: PublicRentalOrderItem[]
  total: number
}

export interface PublicRentalSession {
  id: string
  status: 'REQUESTED' | 'RUNNING' | 'STOPPED' | 'CANCELED'
  mode: 'PAKET' | 'METER'
  requested_at: string
  started_at: string | null
  ended_at: string | null
  planned_minutes: number
  /** PAKET berjalan: kapan paket habis. */
  ends_at: string | null
  elapsed_minutes: number
  remaining_minutes: number | null
  overtime_minutes: number
  price_per_hour: number
  package_price: number
  round_minutes: number
  /** Ditagih per detik; round_minutes diabaikan. Server lama tidak mengirimnya. */
  per_second?: boolean
  min_minutes: number
  rental_amount: number
  /** Sewa yang sudah dibayar di muka lewat QRIS. */
  prepaid_amount: number
  /** Perpanjangan yang menunggu kasir (0 = tidak ada). */
  extend_request_minutes: number
  request_expires_at: string | null
  /** Alasan penolakan (CANCELED). */
  note: string | null
  orders: PublicRentalOrder[]
  orders_total: number
}

export interface PublicRentalPayment {
  /** Dibayar lewat payPickupOrder(order_id). */
  order_id: string
  /** START = memulai meja, EXTEND = memperpanjang. */
  kind: 'START' | 'EXTEND'
  packages: number
  minutes: number
  amount: number
  /** Pembeli sudah menekan "Saya sudah bayar"; menunggu dicek kasir. */
  claimed: boolean
  expires_at: string
}

export interface PublicRental {
  product: PublicRentalProduct
  /** null = meja siap dipakai (kecuali pending_payment terisi). */
  session: PublicRentalSession | null
  /** Paket bisa dibayar QRIS dari HP. */
  prepay_available: boolean
  /** Pembayaran di muka meja ini yang belum lunas. */
  pending_payment: PublicRentalPayment | null
  /** Jam server, untuk mengoreksi selisih jam HP. */
  server_time: string
}

export interface SelfOrderItem {
  item_type: 'PRODUCT' | 'VARIANT' | 'BUNDLE'
  reference_id: string
  quantity: number
  attributes?: { product_attribute_id: string; additional_price: number }[]
}

export interface SelfOrderPayload {
  customer_name?: string | null
  /** Opsional di QR meja: menyambungkan pesanan ke pelanggan bernomor sama. */
  customer_phone?: string | null
  notes?: string | null
  items: SelfOrderItem[]
}

export interface PublicOrderResult {
  transaction_id: string
  bill_number?: string
  queue_number?: string | null
  fulfillment_status?: string | null
  payment_status?: string
  final_price?: number
  order_type?: { code?: string } | null
  canceled_reason?: string | null
  payment_claimed_at?: string | null
  /** Wajib dibayar QRIS sebelum sampai ke kasir. */
  requires_prepayment?: boolean
}

/** Tagihan QRIS pesanan bawa pulang. */
export interface PickupPayment {
  mode: 'auto' | 'manual'
  amount: number
  qris_payload: string | null
  qris_image_url: string | null
  expires_at: string
}

/** Harus sama persis dengan PickupExpiredReason di server. */
export const PICKUP_EXPIRED_REASON = 'Kedaluwarsa — belum dibayar'
/** Harus sama persis dengan NoShowReason di server. */
export const NO_SHOW_REASON = 'Pembeli tidak datang'
/** Harus sama persis dengan CounterUnconfirmedReason di server. */
export const COUNTER_UNCONFIRMED_REASON = 'Kedaluwarsa — tidak dikonfirmasi kasir'

export const payPickupOrder = (orderId: string) =>
  publicApi.post<ApiResponse<PickupPayment>>(`/public/pickup/${orderId}/pay`)

export const claimPickupPayment = (orderId: string) =>
  publicApi.post<ApiResponse<PublicOrderResult>>(`/public/pickup/${orderId}/claim`)

export const getPublicMenu = (token: string) =>
  publicApi.get<ApiResponse<PublicMenu>>(`/public/menu/${token}`)

export const createPublicOrder = (token: string, payload: SelfOrderPayload) =>
  publicApi.post<ApiResponse<PublicOrderResult>>(`/public/order/${token}`, payload)

/** Pesan online (ambil sendiri, bayar di kasir): nama & WA wajib. */
export interface PickupOrderPayload {
  customer_name: string
  customer_phone: string
  service_type: 'pickup' | 'dine_in'
  /** Makan di tempat, dibayar di kasir (bila outlet mengizinkan). */
  pay_at_counter?: boolean
  notes?: string | null
  items: SelfOrderItem[]
}

export const getStoreMenu = (token: string) =>
  publicApi.get<ApiResponse<PublicMenu>>(`/public/store/${token}/menu`)

export const createStoreOrder = (token: string, payload: PickupOrderPayload) =>
  publicApi.post<ApiResponse<PublicOrderResult>>(`/public/store/${token}/order`, payload)

export const getPublicOrderStatus = (orderId: string) =>
  publicApi.get<ApiResponse<PublicOrderResult>>(`/public/order/${orderId}`)

/** Tagihan QRIS untuk satu pesanan meja. Nominal sudah tertanam di payload. */
export interface PublicPaymentOrder {
  id: string
  amount: number
  status: string
  qris_payload: string | null
  expired_at: string
}

/**
 * Terbitkan tagihan QRIS untuk pesanan meja.
 *
 * Ditolak (409) selama kasir belum menerima pesanannya — halaman hanya
 * memanggil ini setelah status pesanan melewati "pending".
 */
export const payPublicOrder = (orderId: string) =>
  publicApi.post<ApiResponse<PublicPaymentOrder>>(`/public/pay/${orderId}`)

// ─── QR Cek Pesanan ──────────────────────────────────────────────────────────

export interface PublicCheckItem {
  name: string
  quantity: number
  /** quantity dalam gram. */
  is_weight_based: boolean
  total: number
}

/** Detail pesanan — hanya dari [lookupOrderCheck], setelah pembeli membuktikan
 *  ia tahu nomor nota/antrean atau nama lengkapnya. */
export interface PublicCheckOrder {
  bill_number: string
  queue_number: string | null
  /** Nama lengkap pemesan. */
  customer: string
  table_number: string | null
  created_at: string
  items: PublicCheckItem[]
  total: number
  paid: number
}

/** Baris daftar publik: tanpa nomor nota, antrean, maupun harga. */
export interface PublicCheckListOrder {
  /** Disamarkan server ("Od***"). */
  customer: string
  table_number: string | null
  created_at: string
  items: Omit<PublicCheckItem, 'total'>[]
}

export interface PublicOrderCheck {
  business_name: string
  business_logo: string | null
  outlet_name: string
  server_time: string
  orders: PublicCheckListOrder[]
}

/** Pesanan berjalan outlet dari QR "Cek Pesanan" — tanpa autentikasi. */
export const getOrderCheck = (token: string) =>
  publicApi.get<ApiResponse<PublicOrderCheck>>(`/public/order-check/${token}`)

/** Buka detail pesanan dengan nomor nota/antrean atau nama lengkap pemesan. */
export const lookupOrderCheck = (token: string, query: string) =>
  publicApi.post<ApiResponse<{ orders: PublicCheckOrder[] }>>(`/public/order-check/${token}/lookup`, { query })

/** Keadaan meja rental — dipanggil berkala selama halaman QR terbuka. */
export const getPublicRental = (token: string) =>
  publicApi.get<ApiResponse<PublicRental>>(`/public/rental/${token}`)

/** Minta meja rental dimulai. Waktunya baru berjalan setelah kasir menerima. */
export const startPublicRental = (token: string, payload: { packages?: number; customer_name?: string | null; prepay?: boolean }) =>
  publicApi.post<ApiResponse<PublicRental>>(`/public/rental/${token}/start`, payload)

/** Minta paket yang berjalan diperpanjang — bayar QRIS sekarang, atau lewat kasir. */
export const extendPublicRental = (token: string, payload: { packages?: number; prepay?: boolean }) =>
  publicApi.post<ApiResponse<PublicRental>>(`/public/rental/${token}/extend`, payload)
