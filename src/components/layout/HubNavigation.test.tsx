import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NAV_ITEMS, type NavItem } from './navItems'
import HubNavigation from './HubNavigation'
import SidebarHubNavigation from './SidebarHubNavigation'
import { findNavigationHub } from './navigationHubs'
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

function Location({ side }: { side: boolean }) {
  const { pathname } = useLocation()
  const hub = findNavigationHub(pathname)
  return <>
    {side && hub && <SidebarHubNavigation key={pathname} hub={hub} accessible={allowed} pathname={pathname} isPro={pro} />}
    <output>{pathname}</output>
  </>
}

function render(path: string, { side = true, gated = false } = {}) {
  act(() => root.render(<MemoryRouter initialEntries={[path]}>
    {gated ? <PlanGate feature="Pelanggan"><p>Data pelanggan</p></PlanGate> : <HubNavigation />}
    <Location side={side} />
  </MemoryRouter>))
}

function clickLabel(label: string, selector: 'button' | 'a') {
  const element = [...host.querySelectorAll(selector)].find(item => item.textContent === label)!
  act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}

it('opens the section for a deep-linked report and lets users expand another without leaving the page', () => {
  render('/reports/stock-card')
  expect(host.querySelector('[aria-current="page"]')?.textContent).toBe('Kartu Stok')
  expect(host.textContent).not.toContain('Keuntungan per Produk')
  clickLabel('Penjualan & laba', 'button')
  expect(host.querySelector('output')?.textContent).toBe('/reports/stock-card')
  expect(host.textContent).not.toContain('Kartu Stok')
  clickLabel('Keuntungan per Produk', 'a')
  expect(host.querySelector('output')?.textContent).toBe('/reports/profitability')
  expect(host.querySelector('[aria-current="page"]')?.textContent).toBe('Keuntungan per Produk')
})

it('moves Products and Reports to the sidebar while stock links still use their original URLs', () => {
  render('/products')
  expect(host.textContent).toContain('Menu Produk')
  expect(host.querySelectorAll('nav')).toHaveLength(0)
  expect(host.textContent).toContain('Kategori, Merek & Satuan')
  expect(host.textContent).not.toContain('Transfer Stok')
  clickLabel('Stok', 'button')
  expect(host.querySelector('output')?.textContent).toBe('/products')
  expect(host.textContent).not.toContain('Kategori, Merek & Satuan')
  clickLabel('Transfer Stok', 'a')
  expect(host.querySelector('output')?.textContent).toBe('/inventory/transfers')
  expect(host.querySelector('[aria-current="page"]')?.textContent).toBe('Transfer Stok')
})

it('shows only report pages allowed by the user permissions', () => {
  allowed = NAV_ITEMS.filter(item => ['/reports', '/reports/profitability'].includes(item.path))
  render('/reports')
  expect(host.querySelectorAll('a')).toHaveLength(2)
  expect(host.textContent).not.toContain('Laporan Keuangan')
})

it('keeps the horizontal tabs for other areas', () => {
  render('/customers', { side: false })
  expect(host.querySelector('nav')).not.toBeNull()
  expect(host.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe('/customers')
  expect([...host.querySelectorAll('nav a')].map(link => link.getAttribute('href'))).toEqual(['/customers', '/kasbon'])
})

it('Pro pages stay viewable behind PlanGate — there is no Free plan to lock out', () => {
  render('/customers', { side: false, gated: true })
  expect(host.textContent).toContain('Data pelanggan')
})
