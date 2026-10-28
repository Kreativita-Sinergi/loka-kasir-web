import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import PublicBookingManagePage from './PublicBookingManagePage'
import { getBookingManage, reschedulePublicBooking, type PublicBookingManage } from '@/api/public'
import { setActiveLocale, t } from '@/lib/i18n'

vi.mock('@/api/public', () => ({ getBookingManage: vi.fn(), reschedulePublicBooking: vi.fn() }))

// Booking 08.00–09.00 WIB; 10.00 terisi orang lain.
const fixture: PublicBookingManage = {
  booking: {
    booking_number: 'BK-300110-001', customer_name: 'Bu Ima', court_id: 'c1', court_name: 'Lapangan 1',
    starts_at: '2030-01-10T01:00:00Z', ends_at: '2030-01-10T02:00:00Z', total_price: 100000, deposit_amount: 0,
    status: 'booked', customer_reschedules: 0,
  },
  store_name: 'Padel Mutiara', outlet_name: 'Pusat', contact_phone: '6281234567890', timezone: 'Asia/Jakarta',
  can_reschedule: true, reschedule_block: '', reschedule_min_hours: 3, reschedule_left: 1, date: '2030-01-10',
  courts: [{ id: 'c1', name: 'Lapangan 1', sport: 'PADEL', hourly_rate: 100000, open_minute: 480, close_minute: 720, slot_minutes: 60 }],
  busy: [{ court_id: 'c1', starts_at: '2030-01-10T03:00:00Z', ends_at: '2030-01-10T04:00:00Z' }],
}

let host: HTMLDivElement, root: Root, client: QueryClient
const tick = () => new Promise((r) => setTimeout(r, 100))
const button = (text: string) => Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes(text))

const mount = async (data: PublicBookingManage) => {
  vi.mocked(getBookingManage).mockResolvedValue({ data: { data } } as Awaited<ReturnType<typeof getBookingManage>>)
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/booking/kelola/tok']}>
          <Routes><Route path="/booking/kelola/:token" element={<PublicBookingManagePage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  })
  await act(async () => { await tick() })
  await act(async () => { await tick() })
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  setActiveLocale('id')
  vi.clearAllMocks()
  vi.mocked(reschedulePublicBooking).mockImplementation(async (_token, input) => ({ data: { data: {
    total_price: 150000, previous_total: 100000,
    booking: input.preview ? undefined : { ...fixture.booking, starts_at: input.starts_at, ends_at: input.ends_at, customer_reschedules: 1 },
  } } }) as Awaited<ReturnType<typeof reschedulePublicBooking>>)
})
afterEach(() => { act(() => root.unmount()); host.remove(); client.clear() })

it('shows the booking with a WhatsApp link to the store', async () => {
  await mount(fixture)
  expect(host.textContent).toContain('BK-300110-001')
  expect(host.textContent).toContain('Lapangan 1')
  const wa = host.querySelector('a[href^="https://wa.me/6281234567890"]') as HTMLAnchorElement
  expect(decodeURIComponent(wa.href)).toContain('BK-300110-001')
})

it('offers only free slots other than the current one, previews the price, then moves', async () => {
  await mount(fixture)
  // 08.00 = jadwal sekarang, 10.00 = terisi orang lain.
  expect(button('08.00')).toBeUndefined()
  expect(button('10.00')).toBeUndefined()
  await act(async () => { button('09.00')!.click(); await tick() })
  expect(reschedulePublicBooking).toHaveBeenCalledWith('tok', expect.objectContaining({
    court_id: 'c1', starts_at: '2030-01-10T09:00:00+07:00', ends_at: '2030-01-10T10:00:00+07:00', preview: true,
  }))
  expect(host.textContent).toContain(t('bmNewPrice'))
  await act(async () => { button('Pindahkan')!.click(); await tick() })
  expect(reschedulePublicBooking).toHaveBeenLastCalledWith('tok', expect.not.objectContaining({ preview: true }))
  expect(host.textContent).toContain(t('bmMoved'))
})

it('explains why the schedule cannot be changed', async () => {
  await mount({ ...fixture, can_reschedule: false, reschedule_block: 'Booking ini sudah dibayar. Hubungi toko.', date: undefined, courts: [], busy: [] })
  expect(host.textContent).toContain('sudah dibayar')
  expect(button(t('bmReschedule'))).toBeUndefined()
})
