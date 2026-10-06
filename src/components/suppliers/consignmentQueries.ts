import type { QueryClient } from '@tanstack/react-query'

// Kunci query konsinyasi di satu tempat supaya setiap mutasi menyegarkan
// daftar yang sama — angka kewajiban, riwayat, dan penjualan tidak boleh
// bercerita berbeda setelah uang diserahkan.
export const CS_KEYS = {
  outstanding: 'consignment-outstanding',
  unsettled: 'consignment-unsettled',
  settlements: 'consignment-settlements',
  settlement: 'consignment-settlement',
  sales: 'consignment-sales',
  returns: 'consignment-returns',
  products: 'consignment-products',
  consignors: 'consignors',
} as const

/** Setelah penyerahan uang / pelunasan berubah. */
export function invalidateConsignmentMoney(qc: QueryClient) {
  for (const key of [CS_KEYS.outstanding, CS_KEYS.unsettled, CS_KEYS.settlements, CS_KEYS.settlement, CS_KEYS.sales]) {
    qc.invalidateQueries({ queryKey: [key] })
  }
}

/** Setelah retur dibuat: stok outlet berkurang, jadi semua daftar stok ikut disegarkan. */
export function invalidateConsignmentReturns(qc: QueryClient) {
  for (const key of [CS_KEYS.returns, CS_KEYS.products, 'outlet-stocks-all', 'outlet-stocks', 'outlet-stocks-selector', 'stock-movements', 'current-stock', 'stock']) {
    qc.invalidateQueries({ queryKey: [key] })
  }
}
