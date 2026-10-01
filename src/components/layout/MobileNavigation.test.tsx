import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MobileNavigation from './MobileNavigation'

const access = vi.hoisted(() => ({ can: vi.fn(), canAny: vi.fn(), roleCode: 'OWNER' }))
const openMenu = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/usePermissions', async (original) => ({
  ...await original<typeof import('@/hooks/usePermissions')>(),
  usePermissions: () => access,
}))
vi.mock('@/store/uiStore', () => ({ useUIStore: () => ({ openMobileSidebar: openMenu, mobileSidebarOpen: false }) }))

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  access.can.mockReturnValue(true)
  access.canAny.mockReturnValue(true)
  openMenu.mockClear()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })
function render(path = '/') {
  act(() => root.render(<MemoryRouter initialEntries={[path]}><MobileNavigation /></MemoryRouter>))
}

describe('mobile navigation', () => {
  it('keeps only destinations the user has permission to access', () => {
    access.can.mockImplementation(permission => permission === 'inventory.view')
    render('/products')
    expect([...host.querySelectorAll('a')].map(link => link.getAttribute('href'))).toEqual(['/products'])
    expect(host.querySelector('button')).not.toBeNull()
  })
  it('highlights products while viewing a nested product page', () => {
    render('/products/new')
    expect(host.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe('/products')
  })
  it('opens the full menu from another section', () => {
    render('/settings')
    act(() => host.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(openMenu).toHaveBeenCalledOnce()
  })
})
