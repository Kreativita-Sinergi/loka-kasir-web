import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import PublicBookingPage from './PublicBookingPage'
import { createPublicBooking, getPublicBooking, type PublicBookingInfo } from '@/api/public'
import { setActiveLocale, t } from '@/lib/i18n'

vi.mock('@/api/public', () => ({ getPublicBooking: vi.fn(), createPublicBooking: vi.fn() }))

const fixture: PublicBookingInfo = {
  store_name: 'Padel Mutiara', outlet_name: 'Pusat', date: '2030-01-10', timezone: 'Asia/Jakarta',
  courts: [{ id: 'c1', name: 'Lapangan 1', sport: 'PADEL', hourly_rate: 100000, open_minute: 480, close_minute: 720, slot_minutes: 60 }],
  busy: [{ court_id: 'c1', starts_at: '2030-01-10T02:00:00Z', ends_at: '2030-01-10T03:00:00Z' }],
}

let host: HTMLDivElement, root: Root, client: QueryClient
const tick = () => new Promise((r) => setTimeout(r, 100))
const button = (text: string) => Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes(text))!
const type = (el: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

beforeEach(async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  setActiveLocale('id')
  vi.clearAllMocks()
  vi.mocked(getPublicBooking).mockResolvedValue({ data: { data: fixture } } as Awaited<ReturnType<typeof getPublicBooking>>)
  vi.mocked(createPublicBooking).mockResolvedValue({ data: { data: {
    booking_number: 'BK-300110-001', court_name: 'Lapangan 1', starts_at: '2030-01-10T01:00:00Z', ends_at: '2030-01-10T02:00:00Z', total_price: 100000,
    manage_url: 'https://app.lokakasir.id/booking/kelola/abc',
  } } } as Awaited<ReturnType<typeof createPublicBooking>>)
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/booking/tok']}>
          <Routes><Route path="/booking/:token" element={<PublicBookingPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  })
  await act(async () => { await tick() })
  await act(async () => { await tick() })
})
afterEach(() => { act(() => root.unmount()); host.remove(); client.clear() })

it('shows taken slots as booked, and books the chosen free one', async () => {
  expect(host.textContent).toContain('Padel Mutiara')
  expect(button('08.00')).toBeDefined()
  // 09.00 terisi: tetap tampil (dicoret, "Penuh") tetapi bukan tombol.
  expect(host.textContent).toContain('09.00')
  expect(host.textContent).toContain(t('pbLegendTaken'))
  expect(Array.from(host.querySelectorAll('button')).some((b) => b.textContent === '09.00')).toBe(false)
  await act(async () => { button('08.00').click(); await tick() })
  const inputs = host.querySelectorAll('input:not([type=date])') as NodeListOf<HTMLInputElement>
  await act(async () => { type(inputs[0], 'Bu Ima'); type(inputs[1], '0812 3456 789'); await tick() })
  expect(button(t('pbSubmit')).disabled).toBe(false)
  await act(async () => {
    host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await tick()
  })
  expect(createPublicBooking).toHaveBeenCalledWith('tok', expect.objectContaining({
    court_id: 'c1', starts_at: '2030-01-10T08:00:00+07:00', ends_at: '2030-01-10T09:00:00+07:00',
    customer_name: 'Bu Ima', customer_phone: '0812 3456 789',
  }))
  expect(host.textContent).toContain(t('pbSuccessTitle'))
  expect(host.textContent).toContain('BK-300110-001')
  // Link kelola: tempat pelanggan kembali untuk melihat atau mengubah jadwal.
  expect(host.querySelector('a[href="https://app.lokakasir.id/booking/kelola/abc"]')).not.toBeNull()
})

it('picks a court and time straight from the all-courts schedule', async () => {
  const two: PublicBookingInfo = {
    ...fixture,
    courts: [...fixture.courts, { ...fixture.courts[0], id: 'c2', name: 'Lapangan 2' }],
  }
  vi.mocked(getPublicBooking).mockResolvedValue({ data: { data: two } } as Awaited<ReturnType<typeof getPublicBooking>>)
  await act(async () => { void client.invalidateQueries(); await tick() })
  await act(async () => { button(t('pbViewGrid')).click(); await tick() })
  // Lapangan 2 · 09.00 kosong (yang terisi hanya Lapangan 1).
  const cell = host.querySelector('button[aria-label="Lapangan 2 09.00 ' + t('pbLegendFree') + '"]') as HTMLButtonElement
  expect(cell).not.toBeNull()
  await act(async () => { cell.click(); await tick() })
  expect(host.textContent).toContain(t('pbSummary', { court: 'Lapangan 2', time: '09.00–10.00' }))
})
