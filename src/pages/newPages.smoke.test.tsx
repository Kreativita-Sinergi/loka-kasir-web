// Tes render halaman yang baru ditambahkan: menjaga agar halaman tidak crash
// saat runtime dengan respons kosong berbentuk sama seperti dari server Go.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('lottie-react', () => ({ default: () => null }))
vi.mock('@/lib/axios', () => {
  // Bentuk respons mengikuti controller Go: daftar produk/karyawan/slip
  // berpaginasi, komponen gaji dan tahapan berupa objek, sisanya array.
  const paginated = { status: true, message: '!OK', data: [], pagination: { page: 1, limit: 20, total: 0, order_by: 'asc', sort_by: 'id' } }
  const byUrl = (url: string) => {
    if (/^\/(product|employee|payroll\/slips|payroll\/my-slips)/.test(url)) return paginated
    if (url.startsWith('/payroll/components')) return { status: true, data: { components: [], legacy: {}, max_components: 10 } }
    if (url.startsWith('/payroll/stage-settings')) return { status: true, data: { payroll_stage_count: 1, payroll_stage_gap_days: 0, payroll_stage_shares: [100], is_equal_split: true, min_stage_count: 1, max_stage_count: 4, max_gap_days: 30 } }
    if (url.startsWith('/outlet/')) return { status: true, data: null }
    if (/^\/finance\/cash-accounts\/[^/]+\/ledger/.test(url)) return { status: true, data: {
      account: { id: 'a1', kind: 'cash', name: 'Kas Besar', balance: 1250000, is_active: true },
      opening_balance: 1000000, total_in: 500000, total_out: 250000, closing_balance: 1250000,
      entries: [
        { id: 'l1', source: 'transfer', type: 'OUT', amount: 250000, category: 'transfer', description: null, reference: 'BCA', number: 'TRF/2610/0001',
          transaction_id: null, shift_id: null, occurred_at: '2026-10-30T03:00:00Z', balance_after: 1250000, created_by_name: 'Budi',
          voided: false, voided_at: null, void_reason: null, voided_by_name: null, voidable: true },
        { id: 'l2', source: 'manual', type: 'OUT', amount: 50000, category: 'expense', description: 'Bayar listrik', reference: null, number: null,
          transaction_id: null, shift_id: null, occurred_at: '2026-10-29T03:00:00Z', balance_after: null, created_by_name: 'Budi',
          voided: true, voided_at: '2026-10-29T04:00:00Z', void_reason: 'Tercatat dua kali', voided_by_name: 'Rina', voidable: false },
      ],
      pagination: { page: 1, limit: 50, total: 2 },
    } }
    if (url.startsWith('/finance/cash-accounts')) return { status: true, data: [
      { id: 'a1', kind: 'cash', name: 'Kas Besar', bank_name: null, account_number: null, account_holder: null, opening_balance: 0, is_active: true, sort_order: 0, balance: 1250000, created_at: '2026-10-01T00:00:00Z' },
      { id: 'a2', kind: 'bank', name: 'BCA', bank_name: 'BCA', account_number: '1234567890', account_holder: 'Toko Uji', opening_balance: 0, is_active: true, sort_order: 1, balance: 250000, created_at: '2026-10-01T00:00:00Z' },
    ] }
    if (url.startsWith('/staff-commission/report')) return { status: true, data: {
      rows: [
        { employee_id: 'e1', employee_name: 'Budi', lines: 2, quantity: 3, sales: 3000000, commission: 60000 },
        { employee_id: null, employee_name: '', lines: 1, quantity: 1, sales: 500000, commission: 10000 },
      ],
      total_sales: 3500000, total_commission: 70000,
    } }
    return { status: true, data: [] }
  }
  const call = (url: string) => Promise.resolve({ data: byUrl(url) })
  return { default: { get: call, post: call, put: call, patch: call, delete: call, interceptors: { request: { use() {} }, response: { use() {} } } } }
})

import { useAuthStore } from '@/store/authStore'
import BasePricesPage from './products/BasePricesPage'
import PayrollPage from './payroll/PayrollPage'
import MyPayrollPage from './payroll/MyPayrollPage'
import ConsignmentPage from './inventory/ConsignmentPage'
import OutletFormModal from '@/components/outlets/OutletFormModal'
import BundlesPage from './products/BundlesPage'
import BundleFormModal from '@/components/products/BundleFormModal'
import StaffCommissionPage from './reports/StaffCommissionPage'
import CashAccountsPage from './finance/CashAccountsPage'
import { t } from '@/lib/i18n'

let host: HTMLDivElement
let root: Root
const errors: string[] = []
beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  useAuthStore.setState({
    token: 'x',
    user: { id: 'u', role: { code: 'OWNER', name: 'Owner' }, business: { business_name: 'Toko Uji', owner_name: 'Uji' }, permissions: [] } as never,
  })
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ')) })
})
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks() })

async function render(el: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await act(async () => { root.render(<QueryClientProvider client={qc}><MemoryRouter>{el}</MemoryRouter></QueryClientProvider>) })
  await act(async () => { await new Promise(r => setTimeout(r, 50)) })
  const fatal = errors.filter(e => !/act\(|Warning:/.test(e))
  expect(fatal, fatal.join('\n')).toEqual([])
  expect(document.body.textContent?.length ?? 0).toBeGreaterThan(0)
}

describe('smoke halaman baru', () => {
  it('BasePricesPage', () => render(<BasePricesPage />))
  it('PayrollPage', () => render(<PayrollPage />))
  it('MyPayrollPage', () => render(<MyPayrollPage />))
  it('ConsignmentPage', () => render(<ConsignmentPage />))
  it('BundlesPage', () => render(<BundlesPage />))
  it('BundleFormModal', () => render(<BundleFormModal bundle={null} initialProductIds={['p1', 'p2']} onClose={() => {}} />))
  it('StaffCommissionPage', async () => {
    await render(<StaffCommissionPage />)
    expect(document.body.textContent).toContain('Budi')
    expect(document.body.textContent).toContain(t('scmNoEmployee'))
  })
  it('CashAccountsPage', async () => {
    await render(<CashAccountsPage />)
    const text = document.body.textContent ?? ''
    expect(text).toContain(t('cashAccLedgerTitle', { name: 'Kas Besar' }))
    expect(text).toContain('1234567890')
    expect(text).toContain('TRF/2610/0001')
    expect(text).toContain(t('cashAccRefTo', { name: 'BCA' }))
    expect(text).toContain(t('cashAccVoided'))
    expect(text).toContain('Tercatat dua kali')
    // Hanya baris yang masih bisa dibatalkan yang punya tombol Batalkan.
    expect(Array.from(document.querySelectorAll('button')).filter(b => b.textContent === t('cashAccVoidAction'))).toHaveLength(1)
  })
  it('OutletFormModal', () => render(<OutletFormModal open businessId="b" onClose={() => {}} onSuccess={() => {}} outlet={null} />))
})
