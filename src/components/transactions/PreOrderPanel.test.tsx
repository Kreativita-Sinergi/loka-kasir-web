import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Transaction } from '@/types'
import { setActiveLocale } from '@/lib/i18n'

const updatePreOrderStatus = vi.fn().mockResolvedValue({ data: { status: true } })
vi.mock('@/api/transactions', () => ({ updatePreOrderStatus: (...a: unknown[]) => updatePreOrderStatus(...a) }))
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ can: () => true }),
  PERMS: { POS_DO_PAYMENT: 'pos.do_payment' },
}))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const { default: PreOrderPanel } = await import('./PreOrderPanel')

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  setActiveLocale('id')
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  updatePreOrderStatus.mockClear()
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function render(overrides: Partial<Transaction>) {
  const tx = {
    transaction_id: 't-1',
    payment_status: 'partial_paid',
    is_canceled: false,
    is_refunded: false,
    is_pre_order: true,
    pre_order_status: 'WAITING',
    pre_order_ready_date: '2026-10-10',
    ...overrides,
  } as Transaction
  act(() =>
    root.render(
      <QueryClientProvider client={new QueryClient()}>
        <PreOrderPanel tx={tx} />
      </QueryClientProvider>,
    ),
  )
}

const button = (label: string) =>
  [...host.querySelectorAll('button')].find((b) => b.textContent === label) as HTMLButtonElement | undefined

it('menunggu barang & belum lunas: tandai siap aktif, serahkan menunggu pelunasan', async () => {
  render({})
  expect(host.textContent).toContain('PO · Menunggu barang')
  expect(button('Tandai siap')).toBeDefined()
  expect(button('Serahkan barang')?.disabled).toBe(true)
  expect(host.textContent).toContain('Lunasi sisa tagihan')

  await act(async () => button('Tandai siap')!.click())
  expect(updatePreOrderStatus).toHaveBeenCalledWith('t-1', 'READY')
})

it('siap & lunas: serahkan aktif dan memotong stok lewat PICKED_UP', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  render({ pre_order_status: 'READY', payment_status: 'paid' })
  expect(button('Tandai siap')).toBeUndefined()
  expect(button('Serahkan barang')?.disabled).toBe(false)
  await act(async () => button('Serahkan barang')!.click())
  expect(updatePreOrderStatus).toHaveBeenCalledWith('t-1', 'PICKED_UP')
})

it('sudah diserahkan atau bukan PO: tanpa tombol', () => {
  render({ pre_order_status: 'PICKED_UP', payment_status: 'paid' })
  expect(host.querySelectorAll('button')).toHaveLength(0)
  render({ is_pre_order: false })
  expect(host.textContent).toBe('')
})
