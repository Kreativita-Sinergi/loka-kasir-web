import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TableQrModal from './TableQrModal'
import type { Table } from '@/types'

// QR meja sudah dilaminating dan ditempel: kasir yang boleh Tandai dipesan
// tidak boleh ikut melihat tombol yang mematikan QR itu.
const state = vi.hoisted(() => ({ perms: [] as string[] }))
vi.mock('@/store/authStore', () => ({
  useAuthStore: (select: (s: { can: (c: string) => boolean }) => unknown) =>
    select({ can: (c: string) => state.perms.includes(c) }),
}))
vi.mock('@/api/tables', () => ({ regenerateTableQr: vi.fn() }))
vi.mock('@/lib/i18n', () => ({ t: (key: string) => key }))
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async () => 'data:image/png;base64,') } }))

const table = { id: 't1', number: 'meja 1', status: 'available', menu_url: 'https://app.lokakasir.id/menu/abc' } as unknown as Table
let host: HTMLDivElement, root: Root, client: QueryClient
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  client = new QueryClient()
})
afterEach(() => { act(() => root.unmount()); client.clear(); host.remove() })

const render = async () => {
  await act(async () => {
    root.render(<QueryClientProvider client={client}><TableQrModal table={table} open onClose={() => {}} /></QueryClientProvider>)
  })
}
const hasRegenerate = () => Array.from(document.querySelectorAll('button')).some((b) => b.textContent?.includes('qrRegenerate'))

describe('table QR regenerate access', () => {
  it('hides regenerate for a cashier who only manages tables', async () => {
    state.perms = ['pos.view_tables', 'pos.manage_tables']
    await render()
    expect(document.body.textContent).toContain('actionPrint')
    expect(hasRegenerate()).toBe(false)
  })
  it('shows regenerate for table setup permission', async () => {
    state.perms = ['pos.setup_tables']
    await render()
    expect(hasRegenerate()).toBe(true)
  })
})
