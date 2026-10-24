import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { getPublicRating, submitPublicRating } from '@/api/public'
import { setActiveLocale, t } from '@/lib/i18n'
import RatingPage from './RatingPage'

vi.mock('@/api/public', () => ({ getPublicRating: vi.fn(), submitPublicRating: vi.fn() }))

let host: HTMLDivElement, root: Root, client: QueryClient
const info = { business_name: 'Seblak Teh Ocha', business_logo: null, outlet_name: 'Utama', bill_found: true, bill_number: 'INV-7', already_rated: false }

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  setActiveLocale('id')
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  client.clear()
  vi.clearAllMocks()
})

async function render(data = info) {
  vi.mocked(getPublicRating).mockResolvedValue({ data: { data } } as never)
  vi.mocked(submitPublicRating).mockResolvedValue({ data: { data: { ok: true } } } as never)
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/nilai/tok?n=INV-7']}>
        <QueryClientProvider client={client}>
          <Routes><Route path="/nilai/:token" element={<RatingPage />} /></Routes>
        </QueryClientProvider>
      </MemoryRouter>,
    )
    await new Promise((r) => setTimeout(r, 30))
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30))
  })
}

const click = async (el: Element | null | undefined) => {
  await act(async () => {
    ;(el as HTMLElement).click()
    await new Promise((r) => setTimeout(r, 30))
  })
}

it('membaca nomor nota dari QR dan mengirim bintang yang dipilih', async () => {
  await render()
  expect(getPublicRating).toHaveBeenCalledWith('tok', 'INV-7')
  expect(host.textContent).toContain(t('rtgBill', { bill: 'INV-7' }))
  await click(host.querySelectorAll('[role="radio"]')[1])
  // Nilai rendah meminta keluhannya, bukan pujian.
  expect(host.textContent).toContain(t('rtgCommentLow'))
  const submit = [...host.querySelectorAll('button')].find((b) => b.textContent === t('rtgSubmit'))
  await click(submit)
  expect(submitPublicRating).toHaveBeenCalledWith('tok', expect.objectContaining({ bill: 'INV-7', rating: 2, consent: false }))
  expect(host.textContent).toContain(t('rtgThanks'))
})

it('nota yang sudah dinilai tidak meminta nilai lagi', async () => {
  await render({ ...info, already_rated: true })
  expect(host.querySelector('[role="radio"]')).toBeNull()
  expect(host.textContent).toContain(t('rtgAlready'))
})
