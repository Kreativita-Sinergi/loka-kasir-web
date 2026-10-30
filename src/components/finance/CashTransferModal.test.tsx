import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createCashTransfer } from '@/api/cashAccounts'
import type { CashAccount } from '@/api/cashAccounts'
import { setActiveLocale, t } from '@/lib/i18n'
import CashTransferModal from './CashTransferModal'

vi.mock('@/components/ui/Modal', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('@/api/cashAccounts', () => ({ createCashTransfer: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const account = (id: string, name: string, balance: number) =>
  ({ id, name, kind: 'cash', balance, is_active: true, bank_name: null, account_number: null, account_holder: null, opening_balance: 0, sort_order: 0, created_at: '' }) as CashAccount

let host: HTMLDivElement
let root: Root
let qc: QueryClient
const onClose = vi.fn()
beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  setActiveLocale('id')
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  act(() => root.render(<QueryClientProvider client={qc}>
    <CashTransferModal accounts={[account('a1', 'Kas Kecil', 500000), account('a2', 'BCA', 100000)]} defaultFromId="a1" onClose={onClose} />
  </QueryClientProvider>))
})
afterEach(() => { act(() => root.unmount()); host.remove(); qc.clear() })

function type(element: HTMLInputElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const amountInput = () => host.querySelector('input[inputmode="decimal"], input[inputmode="numeric"]') as HTMLInputElement
const submit = () => act(async () => {
  host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await new Promise(resolve => setTimeout(resolve, 20))
})

it('shows terbilang and both balances before and after the transfer', () => {
  type(amountInput(), '200000')
  const text = host.textContent ?? ''
  expect(text).toContain('Dua ratus ribu rupiah')
  expect(text).toContain(t('cashAccBalanceOf', { name: 'Kas Kecil' }))
  expect(text).toContain(t('cashAccBalanceOf', { name: 'BCA' }))
  expect(text.match(/Rp\s?300\.000/g)).toHaveLength(2)
})

it('sends no number while Otomatis is on and reuses the idempotency key on retry', async () => {
  vi.mocked(createCashTransfer)
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce({ data: { status: true, data: { transfer_id: 't1', number: 'TRF/2610/0001', from_balance: 300000, to_balance: 300000 } } } as never)
  type(amountInput(), '200000')
  await submit()
  await submit()
  expect(createCashTransfer).toHaveBeenCalledTimes(2)
  const [first, second] = vi.mocked(createCashTransfer).mock.calls
  expect(first[0]).toMatchObject({ from_account_id: 'a1', to_account_id: 'a2', amount: 200000, number: undefined })
  expect(first[1]).toBeTruthy()
  expect(second[1]).toBe(first[1])
  expect(onClose).toHaveBeenCalledOnce()
})

it('sends the typed number once Otomatis is switched off', async () => {
  vi.mocked(createCashTransfer).mockResolvedValue({ data: { status: true, data: { transfer_id: 't1', number: 'BKK-7', from_balance: 0, to_balance: 0 } } } as never)
  act(() => (host.querySelector('[role="switch"]') as HTMLButtonElement).click())
  type(host.querySelector(`input[aria-label="${t('cashAccTransferNumber')}"]`) as HTMLInputElement, ' BKK-7 ')
  type(amountInput(), '5000')
  await submit()
  expect(createCashTransfer).toHaveBeenCalledWith(expect.objectContaining({ number: 'BKK-7', amount: 5000 }), expect.any(String))
})
