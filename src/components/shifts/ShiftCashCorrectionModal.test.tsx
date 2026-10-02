import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { correctClosingCash } from '@/api/shifts'
import { setActiveLocale } from '@/lib/i18n'
import type { Shift } from '@/types'
import ShiftCashCorrectionModal from './ShiftCashCorrectionModal'
vi.mock('@/components/ui/Modal', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('@/api/shifts', () => ({ correctClosingCash: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
let host: HTMLDivElement
let root: Root
let qc: QueryClient
const success = vi.fn()
beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  setActiveLocale('id')
  host = document.createElement('div')
  root = createRoot(host)
  qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  act(() => root.render(<QueryClientProvider client={qc}><ShiftCashCorrectionModal
    shift={{ id: 'shift-1', closing_cash: 50000, expected_cash: 10000 } as Shift}
    onClose={() => {}} onSuccess={success} /></QueryClientProvider>))
})
afterEach(() => { act(() => root.unmount()); qc.clear() })
function input(selector: string, value: string) {
  const element = host.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement
  act(() => {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const submit = () => act(() => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
it('does not submit missing cash, unchanged cash, or a blank reason', () => {
  submit()
  input('input', '50000'); input('textarea', 'salah input'); submit()
  input('input', '0'); input('textarea', '   '); submit()
  expect(correctClosingCash).not.toHaveBeenCalled()
})
it('allows zero cash and sends the previous amount and reason, then refreshes reports', async () => {
  vi.mocked(correctClosingCash).mockResolvedValue({ data: { status: true } } as never)
  const invalidate = vi.spyOn(qc, 'invalidateQueries')
  input('input', '0'); input('textarea', ' Salah ketik ')
  await act(async () => { submit(); await new Promise(resolve => setTimeout(resolve, 20)) })
  expect(correctClosingCash).toHaveBeenCalledWith('shift-1', { closing_cash: 0, previous_closing_cash: 50000, reason: 'Salah ketik' })
  expect(success).toHaveBeenCalledOnce()
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['cash-discrepancy'] })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['shifts-financial'] })
})
