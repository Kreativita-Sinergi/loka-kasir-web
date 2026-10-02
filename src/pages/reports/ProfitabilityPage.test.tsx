import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { ProductRow } from './ProfitabilityPage'
import type { ProductProfitability } from '@/types'
import { setActiveLocale } from '@/lib/i18n'

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  setActiveLocale('id')
  host = document.createElement('div')
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()) })
const product: ProductProfitability = {
  product_id: 'tea', product_name: 'Teh', units_sold: 10, is_weight_based: false,
  revenue: 100000, base_hpp: 6000, total_cogs: 60000, gross_profit: 40000,
  gross_margin: 40, overhead_per_item: 0, has_bom: false, has_cost: true,
}
function render(overrides: Partial<ProductProfitability> = {}) {
  act(() => root.render(<table><tbody><ProductRow product={{ ...product, ...overrides }} /></tbody></table>))
}
it('shows product cost and profit without requiring a recipe', () => {
  render()
  expect(host.querySelectorAll('td')).toHaveLength(6)
  expect(host.textContent).toContain('60.000')
  expect(host.textContent).toContain('40.000')
  expect(host.textContent).toContain('40.0%')
  expect(host.textContent).not.toContain('Resep')
})
it('missing cost does not display misleading 100 percent profit', () => {
  render({ has_cost: false, total_cogs: 0, base_hpp: 0, gross_profit: 100000, gross_margin: 100 })
  expect(host.textContent).toContain('Modal belum diisi')
  expect(host.textContent).not.toContain('100.0%')
  expect(host.textContent).not.toContain('Resep')
})
it('supports older API rows with a modal but no has_cost field', () => {
  render({ has_cost: undefined })
  expect(host.textContent).toContain('60.000')
  expect(host.textContent).toContain('40.0%')
})
