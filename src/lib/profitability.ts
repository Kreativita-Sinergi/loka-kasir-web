import type { ProductProfitability } from '@/types'

/** Older API responses lack has_cost; do not show 100% profit on an empty cost. */
export function productHasCost(product: ProductProfitability): boolean {
  return product.has_cost ?? (product.base_hpp > 0 || product.total_cogs > 0)
}
