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
  it('OutletFormModal', () => render(<OutletFormModal open businessId="b" onClose={() => {}} onSuccess={() => {}} outlet={null} />))
})
