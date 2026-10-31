import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type AxiosResponse } from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import BalanceQrPage from './BalanceQrPage'
import { checkBalance, getBalanceCheckStore, type PublicBalance } from '@/api/public'
import { setActiveLocale, t } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'

vi.mock('@/api/public', () => ({ getBalanceCheckStore: vi.fn(), checkBalance: vi.fn() }))

const balance: PublicBalance = {
  business_name: 'kopi senja', customer_name: 'bu ima', is_member: true, points_balance: 120, deposit_balance: 50000,
  movements: [], kasbon_outstanding: 15000,
  kasbon_bills: [
    { bill_number: '261030-0007', created_at: '2026-10-30T12:00:00Z', total: 6000, paid: 0, remaining: 6000,
      items: [{ name: 'es teh', quantity: 1, is_weight_based: false, total: 6000 }] },
    { bill_number: '261024-0003', created_at: '2026-10-24T02:00:00Z', total: 14000, paid: 5000, remaining: 9000,
      items: [{ name: 'kopi susu', quantity: 2, is_weight_based: false, total: 13000 }, { name: 'gula pasir', quantity: 250, is_weight_based: true, total: 1000 }] },
  ],
  packages: [{ name: 'creambath', quantity: 3 }], time_balances: [{ name: 'ps5', quantity: 150 }],
}

let host: HTMLDivElement, root: Root, client: QueryClient
const tick = () => new Promise((r) => setTimeout(r, 50))
const type = (el: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}
const submit = async (phone: string, code: string) => {
  await act(async () => {
    type(host.querySelector('#bq-phone') as HTMLInputElement, phone)
    type(host.querySelector('#bq-code') as HTMLInputElement, code)
    await tick()
  })
  await act(async () => {
    host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await tick()
  })
}

beforeEach(async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  setActiveLocale('id')
  vi.clearAllMocks()
  vi.mocked(getBalanceCheckStore).mockResolvedValue({ data: { data: { business_name: 'kopi senja' } } } as Awaited<ReturnType<typeof getBalanceCheckStore>>)
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/cek-saldo/tok']}>
          <Routes><Route path="/cek-saldo/:token" element={<BalanceQrPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  })
  await act(async () => { await tick() })
})
afterEach(() => { act(() => root.unmount()); host.remove(); client.clear() })

it('shows every balance once phone and code match', async () => {
  vi.mocked(checkBalance).mockResolvedValue({ data: { data: balance } } as Awaited<ReturnType<typeof checkBalance>>)
  expect(host.textContent).toContain(t('bqTitle'))
  await submit('0812 3456 7890', '48 29 13')
  // Kode diketik apa adanya, tetapi hanya angka yang terkirim.
  expect(checkBalance).toHaveBeenCalledWith('tok', { phone: '0812 3456 7890', code: '482913' })
  const text = host.textContent ?? ''
  expect(text).toContain('Bu Ima')
  expect(text).toContain(t('balMember'))
  expect(text).toContain(t('balKasbon'))
  // Bon dirinci per nota beserta barangnya, bukan hanya totalnya.
  expect(text).toContain('#261030-0007')
  expect(text).toContain('Es Teh')
  expect(text).toContain('250 g Gula Pasir')
  expect(text).toContain(t('balKasbonPaid', { total: formatCurrency(14000), paid: formatCurrency(5000) }))
  expect(text).toContain(t('balKasbonRemaining', { amount: formatCurrency(9000) }))
  expect(text).toContain(t('balSessions', { count: 3 }))
  expect(text).toContain(t('durHoursMinutes', { h: 2, m: 30 }))
})

it('shows the server reason when the code is wrong and clears the code', async () => {
  const response = { status: 401, data: { message: 'Nomor HP atau kode cek saldo tidak cocok' } } as AxiosResponse
  vi.mocked(checkBalance).mockRejectedValue(new AxiosError('401', '401', undefined, undefined, response))
  await submit('081234567890', '000000')
  expect(host.textContent).toContain('tidak cocok')
  expect((host.querySelector('#bq-code') as HTMLInputElement).value).toBe('')
})
