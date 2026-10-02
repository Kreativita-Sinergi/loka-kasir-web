import { describe, expect, it } from 'vitest'
import { NAV_ITEMS, roleAllowsNav } from './navItems'
import { findNavigationHub, groupSidebarItems, hubPaths, sectionItems } from './navigationHubs'
import { PERMS } from '@/hooks/usePermissions'

describe('combined navigation', () => {
  it('replaces related sidebar entries with one destination per hub', () => {
    const items = groupSidebarItems(NAV_ITEMS, true, false)
    expect(items.filter(item => item.labelKey === 'navProductHub')).toHaveLength(1)
    expect(items.filter(item => item.labelKey === 'navReportsHub')).toHaveLength(1)
    expect(items.filter(item => item.labelKey === 'navCustomerHub')).toHaveLength(1)
    expect(items.filter(item => item.labelKey === 'navStoreHub')).toHaveLength(1)
    expect(items.filter(item => item.path.startsWith('/inventory/')).map(item => item.path)).toEqual(['/inventory/expiry'])
  })

  it('keeps all grouped URLs and highlights the parent for stock and purchasing', () => {
    const hub = findNavigationHub('/inventory/purchase-orders')!
    expect(hub.labelKey).toBe('navProductHub')
    expect(hubPaths(hub)).toContain('/catalog/attributes')
    const parent = groupSidebarItems(NAV_ITEMS, true, false).find(item => item.labelKey === 'navProductHub')!
    expect(parent.activePaths).toContain('/inventory/purchase-orders')
    expect(hub.sections.map(section => sectionItems(section, NAV_ITEMS).length)).toEqual([4, 5, 2])
  })

  it('chooses an accessible report for users without financial permission', () => {
    const accessible = NAV_ITEMS.filter(item => item.permission === PERMS.REPORTS_VIEW)
    const report = groupSidebarItems(accessible, true, false).find(item => item.path === '/reports')!
    expect(report).toBeDefined()
    expect(report.path).not.toBe('/reports/financial')
    const hub = findNavigationHub('/reports')!
    expect(sectionItems(hub.sections[0], accessible).map(item => item.path)).toEqual(['/reports'])
  })

  it('free customers enter via kasbon rather than a locked Pro page', () => {
    expect(groupSidebarItems(NAV_ITEMS, false, false).find(item => item.labelKey === 'navCustomerHub')?.path).toBe('/kasbon')
  })

  it('stock entry staff still see only their stock destination', () => {
    const accessible = NAV_ITEMS.filter(item => roleAllowsNav(item, 'STOCK_IN'))
    const items = groupSidebarItems(accessible, true, false)
    expect(items.map(item => item.path)).toEqual(['/inventory/current-stock'])
    expect(items[0].labelKey).toBe('navStock')
  })

  it('simple mode hides advanced-only hubs but keeps their pages in product tabs', () => {
    const items = groupSidebarItems(NAV_ITEMS, true, true)
    expect(items.some(item => item.labelKey === 'navCustomerHub')).toBe(false)
    const products = items.find(item => item.labelKey === 'navProductHub')!
    expect(products.activePaths).toContain('/inventory/transfers')
  })
})
