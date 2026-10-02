import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NAV_ITEMS, type NavItem } from './navItems'
import HubNavigation from './HubNavigation'
import PlanGate from '@/components/ui/PlanGate'
import { setActiveLocale } from '@/lib/i18n'

let allowed: NavItem[]
let pro: boolean
vi.mock('./useNavigationItems', () => ({ useNavigationItems: () => allowed }))
vi.mock('@/hooks/usePermissions', async original => ({
  ...await original<typeof import('@/hooks/usePermissions')>(),
  usePermissions: () => ({ isPro: pro }),
}))

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  setActiveLocale('id')
  allowed = NAV_ITEMS
  pro = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

function Location() {
  return <output>{useLocation().pathname}</output>
}
function render(path: string, gated = false) {
  act(() => root.render(<MemoryRouter initialEntries={[path]}>
    {gated ? <PlanGate feature="Pelanggan"><p>Data pelanggan</p></PlanGate> : <HubNavigation />}
    <Location />
  </MemoryRouter>))
}
function clickLabel(label: string) {
  const link = [...host.querySelectorAll('a')].find(link => link.textContent === label)!
  act(() => link.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}

it('report links update the URL and selected page, supporting browser navigation', () => {
  render('/reports/financial')
  expect(host.querySelector('[aria-current="page"]')?.textContent).toBe('Laporan Keuangan')
  clickLabel('Keuntungan per Produk')
  expect(host.querySelector('output')?.textContent).toBe('/reports/profitability')
  expect(host.querySelector('[aria-current="page"]')?.textContent).toBe('Keuntungan per Produk')
})

it('product sections switch to stock without rendering eleven tabs at once', () => {
  render('/products')
  expect(host.textContent).toContain('Kategori, Merek & Satuan')
  expect(host.textContent).not.toContain('Transfer Stok')
  clickLabel('Stok')
  expect(host.querySelector('output')?.textContent).toBe('/inventory/current-stock')
  expect(host.textContent).toContain('Transfer Stok')
  expect(host.textContent).not.toContain('Kategori, Merek & Satuan')
  expect(host.querySelector('[aria-current="page"]')?.textContent).toBe('Stok Produk')
})

it('tabs exclude pages absent from the user permissions', () => {
  allowed = NAV_ITEMS.filter(item => ['/reports', '/reports/profitability'].includes(item.path))
  render('/reports')
  expect(host.querySelectorAll('a')).toHaveLength(2)
  expect(host.textContent).not.toContain('Laporan Keuangan')
})

it('a free user can navigate back to kasbon from the Pro customer gate', () => {
  pro = false
  render('/customers', true)
  expect(host.textContent).not.toContain('Data pelanggan')
  expect(host.querySelector('[aria-current="page"]')?.textContent).toBe('Pelanggan')
  clickLabel('Tagihan Kasbon')
  expect(host.querySelector('output')?.textContent).toBe('/kasbon')
})
