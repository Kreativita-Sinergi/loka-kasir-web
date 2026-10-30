// Saklar "Pakai Purchase Order": nyala = halaman PO seperti biasa; mati =
// halaman yang sama menjadi "Pembelian" sekali jalan. Respons berbentuk sama
// dengan controller Go.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const calls = vi.hoisted(() => [] as { method: string; url: string; body?: unknown }[])

vi.mock('lottie-react', () => ({ default: () => null }))
vi.mock('@/lib/axios', () => {
  const list = {
    status: true, message: '!OK',
    data: [
      { id: 'po1', po_number: 'PB-20261030-001', status: 'received', is_direct: true, order_date: '2026-10-30', total_amount: 240000,
        received_amount: 240000, paid_amount: 0, payable_balance: 240000, payment_status: 'unpaid', items: [], created_at: '2026-10-30T03:00:00Z' },
      { id: 'po2', po_number: 'PO-LAMA', status: 'ordered', order_date: '2026-10-01', total_amount: 50000,
        received_amount: 0, paid_amount: 0, payable_balance: 0, payment_status: 'none', items: [], created_at: '2026-10-01T03:00:00Z' },
    ],
    pagination: { page: 1, limit: 20, total: 2 },
  }
  const byUrl = (url: string) => (url === '/purchase-order' ? list : { status: true, data: [] })
  const record = (method: string) => (url: string, body?: unknown) => {
    calls.push({ method, url, body })
    if (url === '/business/purchase-orders') {
      return Promise.resolve({ data: { status: true, data: { purchase_orders_enabled: (body as { enabled: boolean }).enabled } } })
    }
    return Promise.resolve({ data: byUrl(url) })
  }
  return { default: { get: record('get'), post: record('post'), put: record('put'), patch: record('patch'), delete: record('delete'),
    interceptors: { request: { use() {} }, response: { use() {} } } } }
})

import { useAuthStore } from '@/store/authStore'
import PurchaseOrdersPage from './PurchaseOrdersPage'
import PurchaseOrdersToggle from '@/components/settings/PurchaseOrdersToggle'
import { NAV_ITEMS, navLabel } from '@/components/layout/navItems'
import { t } from '@/lib/i18n'

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  calls.length = 0
})
afterEach(() => { act(() => root.unmount()); host.remove() })

function login(purchaseOrders?: boolean) {
  useAuthStore.setState({
    token: 'x',
    user: { id: 'u', role: { code: 'OWNER', name: 'Owner' }, permissions: [],
      business: { business_name: 'Toko Uji', owner_name: 'Uji', purchase_orders_enabled: purchaseOrders } } as never,
  })
}

async function render(el: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await act(async () => { root.render(<QueryClientProvider client={qc}><MemoryRouter>{el}</MemoryRouter></QueryClientProvider>) })
  await act(async () => { await new Promise(r => setTimeout(r, 50)) })
}

const buttons = () => Array.from(document.querySelectorAll('button'))
const poNav = NAV_ITEMS.find(item => item.path === '/inventory/purchase-orders')!

describe('Pakai Purchase Order', () => {
  it('nyala (bawaan, juga sesi lama tanpa kolomnya): halaman PO apa adanya', async () => {
    login(undefined)
    await render(<PurchaseOrdersPage />)
    const text = document.body.textContent ?? ''
    expect(text).toContain(t('navPurchaseOrders'))
    expect(buttons().some(b => b.textContent === t('poStatusOrderedTab'))).toBe(true)
    expect(buttons().some(b => b.textContent?.includes(t('poCreateShort')))).toBe(true)
    expect(navLabel(poNav)).toBe(t('navPurchaseOrders'))
  })

  it('mati: "Pembelian", tanpa tab status, tombol Catat Pembelian', async () => {
    login(false)
    await render(<PurchaseOrdersPage />)
    const text = document.body.textContent ?? ''
    expect(text).toContain(t('dpurTitle'))
    expect(buttons().some(b => b.textContent === t('poStatusOrderedTab'))).toBe(false)
    expect(navLabel(poNav)).toBe(t('dpurTitle'))
    // Pembelian langsung memperlihatkan status bayar, PO lama status PO-nya.
    const directRow = Array.from(document.querySelectorAll('tr')).find(tr => tr.textContent?.includes('PB-20261030-001'))!
    expect(directRow.textContent).toContain(t('htsStatusUnpaid'))
    expect(directRow.textContent).not.toContain(t('poStatusReceived'))
    const oldRow = Array.from(document.querySelectorAll('tr')).find(tr => tr.textContent?.includes('PO-LAMA'))!
    expect(oldRow.textContent).toContain(t('poStatusOrdered'))

    const add = buttons().find(b => b.textContent?.includes(t('dpurNew')))!
    await act(async () => { add.click() })
    await act(async () => { await new Promise(r => setTimeout(r, 20)) })
    const modal = document.body.textContent ?? ''
    expect(modal).toContain(t('dpurDate'))
    expect(modal).toContain(t('dpurPayNow'))
    expect(modal).not.toContain(t('poExpectedDate'))
    expect(document.querySelector('input[placeholder="PO-2024-001"]')).toBeNull()
  })

  it('saklar pengaturan: PATCH lalu sesi ikut berubah', async () => {
    login(true)
    await render(<PurchaseOrdersToggle />)
    const sw = document.querySelector('button[role="switch"]') as HTMLButtonElement
    expect(sw.getAttribute('aria-checked')).toBe('true')
    await act(async () => { sw.click() })
    await act(async () => { await new Promise(r => setTimeout(r, 20)) })
    expect(calls).toContainEqual({ method: 'patch', url: '/business/purchase-orders', body: { enabled: false } })
    expect(useAuthStore.getState().user?.business?.purchase_orders_enabled).toBe(false)
  })

  it('saklar pengaturan disembunyikan dari selain pemilik', async () => {
    useAuthStore.setState({ token: 'x', user: { id: 'u', role: { code: 'MANAGER', name: 'Manajer' }, permissions: [], business: {} } as never })
    await render(<PurchaseOrdersToggle />)
    expect(document.querySelector('button[role="switch"]')).toBeNull()
  })
})
