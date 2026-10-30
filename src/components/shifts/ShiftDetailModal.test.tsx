import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { getShiftCashFlows, voidShiftCashFlow } from '@/api/cashAccounts'
import { setActiveLocale, t } from '@/lib/i18n'
import { useAuthStore } from '@/store/authStore'
import type { Shift } from '@/types'
import ShiftDetailModal from './ShiftDetailModal'

vi.mock('@/components/ui/Modal', () => ({ default: ({ open = true, children }: { open?: boolean; children: ReactNode }) => open ? <div>{children}</div> : null }))
vi.mock('@/api/cashAccounts', () => ({ getShiftCashFlows: vi.fn(), voidShiftCashFlow: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

let host: HTMLDivElement
let root: Root
let qc: QueryClient
beforeEach(() => {
  vi.clearAllMocks()
  qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  useAuthStore.setState({ user: null });
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  setActiveLocale('id')
  host = document.createElement('div')
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); qc.clear() })
function render(overrides: Partial<Shift> = {}) {
  const shift = {
    status: 'closed', opened_at: '2026-10-02T01:00:00Z', closed_at: '2026-10-02T09:00:00Z',
    cashier: { name: 'Rina' }, terminal: { name: 'Kasir 1' }, outlet: { name: 'Cabang A' },
    opening_cash: 0, closing_cash: 0, expected_cash: 10000, discrepancy: -10000,
    total_sales: 30000, cash_amount: 10000, qris_amount: 20000,
    total_refunds: 0, total_cash_in: 0, total_cash_out: 0, notes: 'Laci kosong',
    ...overrides,
  } as Shift
  act(() => root.render(<QueryClientProvider client={qc}><ShiftDetailModal shift={shift} onClose={() => {}} /></QueryClientProvider>))
}
it('shows counted zero cash, the real shortage, payment breakdown, and notes', () => {
  render()
  expect(host.textContent).toContain('Rina')
  expect(host.textContent).toContain('Penjualan lunas tunai')
  expect(host.textContent).toContain('Penjualan lunas QRIS')
  expect(host.textContent).toContain('Kas AktualRp')
  expect(host.textContent).toContain('-Rp')
  expect(host.textContent).toContain('Laci kosong')
  expect(host.textContent).not.toContain('Tidak dihitung fisik')
})
it('does not portray forced closure as counted and balanced cash', () => {
  render({ closing_cash: 10000, discrepancy: 0,
    notes: 'Ditutup paksa oleh Budi — kas tidak dihitung fisik. Alasan: perangkat rusak' })
  expect(host.textContent?.match(/Tidak dihitung fisik/g)).toHaveLength(2)
  expect(host.textContent).toContain('perangkat rusak')
  expect(host.textContent).not.toContain('+Rp')
})
it('shows unavailable closing data as unknown rather than a zero balance', () => {
  render({ closing_cash: null, discrepancy: null, expected_cash: null })
  expect(host.textContent).toContain('Kas Aktual—')
  expect(host.textContent).toContain('Selisih Kas—')
})
it('shows corrected counted cash after an earlier forced closure', () => {
  render({ closing_cash: 0, discrepancy: -10000,
    notes: 'Ditutup paksa oleh Budi — kas tidak dihitung fisik. Alasan: rusak\nKoreksi kas penutup oleh Budi: 10000 → 0. Alasan: salah input' })
  expect(host.textContent).toContain('Kas AktualRp')
  expect(host.textContent).not.toContain('Tidak dihitung fisik')
})

const flow = (overrides: Record<string, unknown>) => ({
  id: 'f1', type: 'OUT', source: 'manual', amount: 20000, description: 'Beli galon', created_at: '2026-10-02T02:00:00Z',
  created_by_name: 'Rina', cash_account_id: null, cash_account_name: null,
  voided: false, voided_at: null, void_reason: null, voided_by_name: null, voidable: true, ...overrides,
})
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
function input(element: HTMLTextAreaElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

it('lists shift cash in/out with the linked account and voided rows struck through', async () => {
  useAuthStore.setState({ user: { id: 'u', role: { code: 'OWNER', name: 'Owner' }, permissions: [] } as never })
  vi.mocked(getShiftCashFlows).mockResolvedValue({ data: { status: true, data: [
    flow({ id: 'f1', cash_account_id: 'a1', cash_account_name: 'Kas Besar', description: 'Setor siang' }),
    flow({ id: 'f2', description: 'Beli galon', voided: true, voidable: false, void_reason: 'Tercatat dua kali', voided_by_name: 'Budi' }),
  ] } } as never)
  render({ id: 'shift-1' })
  await settle()
  expect(getShiftCashFlows).toHaveBeenCalledWith('shift-1')
  expect(host.textContent).toContain(t('shiftCashFlowDepositTo', { name: 'Kas Besar' }))
  expect(host.textContent).toContain('Tercatat dua kali')
  const rows = host.querySelectorAll('[data-testid="shift-cash-flow"]')
  expect(rows[1].querySelector('.line-through')?.textContent).toContain('Beli galon')
  const voidButtons = Array.from(host.querySelectorAll('button')).filter(b => b.textContent === t('cashAccVoidAction'))
  expect(voidButtons).toHaveLength(1)
})

it('voids a manual flow with a reason and refreshes shift totals', async () => {
  useAuthStore.setState({ user: { id: 'u', role: { code: 'OWNER', name: 'Owner' }, permissions: [] } as never })
  vi.mocked(getShiftCashFlows).mockResolvedValue({ data: { status: true, data: [flow({})] } } as never)
  vi.mocked(voidShiftCashFlow).mockResolvedValue({ data: { status: true, data: flow({ voided: true }) } } as never)
  const invalidate = vi.spyOn(qc, 'invalidateQueries')
  render({ id: 'shift-1', status: 'open' })
  await settle()
  act(() => Array.from(host.querySelectorAll('button')).find(b => b.textContent === t('cashAccVoidAction'))!.click())
  const form = host.querySelector('form')!
  const textarea = form.querySelector('textarea')!
  input(textarea, 'ab')
  act(() => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
  expect(voidShiftCashFlow).not.toHaveBeenCalled()
  expect(host.textContent).toContain(t('cashAccVoidReasonInvalid'))
  input(textarea, ' Tercatat dua kali ')
  await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await new Promise(resolve => setTimeout(resolve, 20)) })
  expect(voidShiftCashFlow).toHaveBeenCalledWith('shift-1', 'f1', 'Tercatat dua kali')
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['shifts-financial'] })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['shift-detail'] })
})
