/** Panjang maksimal awalan nomor nota — entity.BillPrefixMaxLen di service. */
export const BILL_PREFIX_MAX = 6

/**
 * Nomor nota pertama hari ini dengan awalan outlet: "ALS-261031-0001", atau
 * "261031-0001" tanpa awalan. Nomor sungguhan dibuat server
 * (generateBillNumber); ini hanya contoh di pengaturan.
 */
export function billNumberExample(prefix: string, now = new Date()) {
  const two = (n: number) => String(n).padStart(2, '0')
  const date = `${two(now.getFullYear() % 100)}${two(now.getMonth() + 1)}${two(now.getDate())}`
  return prefix ? `${prefix}-${date}-0001` : `${date}-0001`
}
