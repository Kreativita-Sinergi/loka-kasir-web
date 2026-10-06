import { NAV_ITEMS, type NavItem } from './navItems'
import type { MessageKey } from '@/lib/messages'

export interface NavigationSection {
  labelKey: MessageKey
  paths: string[]
}

export interface NavigationHub {
  labelKey: MessageKey
  sections: NavigationSection[]
}

// Existing URLs remain the destinations, so bookmarks and page permissions
// continue to work. Only the navigation groups change.
export const NAV_HUBS: NavigationHub[] = [
  { labelKey: 'navProductHub', sections: [
    { labelKey: 'navProductHub', paths: ['/products', '/catalog/attributes', '/discounts', '/pricing/insights', '/products/base-prices'] },
    { labelKey: 'navStockHub', paths: ['/inventory/current-stock', '/inventory/transfers', '/inventory/stock-opname', '/inventory/movements', '/inventory/raw-materials'] },
    { labelKey: 'navPurchasingHub', paths: ['/inventory/suppliers', '/inventory/purchase-orders', '/inventory/consignment'] },
  ] },
  { labelKey: 'navReportsHub', sections: [
    { labelKey: 'navReportsHub', paths: ['/reports/financial', '/reports', '/reports/profitability', '/reports/cash-discrepancy', '/reports/shrinkage'] },
  ] },
  { labelKey: 'navCustomerHub', sections: [
    { labelKey: 'navCustomerHub', paths: ['/customers', '/kasbon'] },
  ] },
  { labelKey: 'navStoreHub', sections: [
    { labelKey: 'navStoreHub', paths: ['/outlets', '/master/terminals', '/master/tables'] },
  ] },
  { labelKey: 'bkCourts', sections: [
    { labelKey: 'bkCourts', paths: ['/booking/calendar', '/booking/courts', '/booking/rates'] },
  ] },
]

export function hubPaths(hub: NavigationHub): string[] {
  return hub.sections.flatMap(section => section.paths)
}

export function findNavigationHub(path: string): NavigationHub | undefined {
  return NAV_HUBS.find(hub => hubPaths(hub).includes(path))
}

export function sectionItems(section: NavigationSection, accessible: NavItem[]): NavItem[] {
  return section.paths.flatMap(path => {
    const item = accessible.find(item => item.path === path)
    return item ? [item] : []
  })
}

export interface SidebarNavItem extends NavItem {
  activePaths?: string[]
}

export function groupSidebarItems(accessible: NavItem[], isPro: boolean, simpleMode: boolean): SidebarNavItem[] {
  const result: SidebarNavItem[] = []
  const added = new Set<NavigationHub>()
  for (const item of accessible) {
    if (item.sidebar === false) continue
    const hub = findNavigationHub(item.path)
    if (!hub) {
      if (!simpleMode || !item.advanced) result.push(item)
      continue
    }
    if (added.has(hub)) continue
    const children = hub.sections.flatMap(section => sectionItems(section, accessible))
    if (simpleMode && children.every(child => child.advanced)) continue
    added.add(hub)
    // Prefer a page the current plan can open over an upgrade screen.
    const destination = children.find(child => !child.planRequired || isPro) ?? children[0]
    result.push({
      ...destination,
      group: NAV_ITEMS.find(entry => entry.path === hubPaths(hub)[0])!.group,
      labelKey: children.length === 1 ? destination.labelKey : hub.labelKey,
      advanced: children.every(child => child.advanced),
      activePaths: hubPaths(hub),
    })
  }
  return result
}
