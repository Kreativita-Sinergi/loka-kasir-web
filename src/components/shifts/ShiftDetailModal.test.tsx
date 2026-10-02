import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { setActiveLocale } from '@/lib/i18n'
import type { Shift } from '@/types'
import ShiftDetailModal from './ShiftDetailModal'

vi.mock('@/components/ui/Modal', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }))

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  setActiveLocale('id')
  host = document.createElement('div')
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()) })
function render(overrides: Partial<Shift> = {}) {
  const shift = {
    status: 'closed', opened_at: '2026-10-02T01:00:00Z', closed_at: '2026-10-02T09:00:00Z',
    cashier: { name: 'Rina' }, terminal: { name: 'Kasir 1' }, outlet: { name: 'Cabang A' },
    opening_cash: 0, closing_cash: 0, expected_cash: 10000, discrepancy: -10000,
    total_sales: 30000, cash_amount: 10000, qris_amount: 20000,
    total_refunds: 0, total_cash_in: 0, total_cash_out: 0, notes: 'Laci kosong',
    ...overrides,
  } as Shift
  act(() => root.render(<ShiftDetailModal shift={shift} onClose={() => {}} />))
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
