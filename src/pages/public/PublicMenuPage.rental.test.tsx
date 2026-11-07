import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { getPublicMenu, getPublicRental, startPublicRental, createPublicOrder, type PublicRental } from '@/api/public'
import { setActiveLocale, t } from '@/lib/i18n'
import { saveOrder, removeOrders } from '@/lib/publicOrderHistory'
import PublicMenuPage from './PublicMenuPage'

vi.mock('@/api/public')
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

// Meja billiard: pembeli memilih paket di kartu meja, lalu langsung memesan
// minuman. Paket yang dipilih harus ikut di keranjang dan dimulai oleh tombol
// Kirim Pesanan yang sama — dulu hanya minumannya yang terkirim, dan mejanya
// tidak pernah berjalan.
const oneHour = { id: 'one-hour', name: '1 Jam', mode: 'PAKET' as const, price: 8000, package_minutes: 60, min_minutes: 0, max_packages: 1, image: null }
const rental: PublicRental = {
  product: oneHour,
  choices: [oneHour, { ...oneHour, id: 'two-hours', name: '2 Jam', price: 15000, package_minutes: 120 }],
  session: null, pending_payment: null, prepay_available: false, server_time: new Date().toISOString(),
}
const menu = {
  business_name: 'Caffe & Billiard', outlet_name: 'Jenggrik', table_number: 'Billiard 1', business_logo: null, mode: 'table',
  rental,
  categories: [{ id: null, name: 'Minuman', products: [{ id: 'kopi', name: 'Es Kopi Gula Aren', sell_price: 5000, is_available: true, is_active: true, has_variant: false, attributes: [] }] }],
}

let host: HTMLDivElement, root: Root, client: QueryClient
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  setActiveLocale('id')
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  vi.mocked(getPublicMenu).mockResolvedValue({ data: { data: menu } } as never)
  vi.mocked(getPublicRental).mockResolvedValue({ data: { data: rental } } as never)
  vi.mocked(startPublicRental).mockResolvedValue({ data: { data: rental } } as never)
  vi.mocked(createPublicOrder).mockResolvedValue({ data: { data: { transaction_id: 'trx-1', requires_prepayment: false } } } as never)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); client.clear(); vi.clearAllMocks() })

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 30)) })
async function render() {
  await act(async () => {
    root.render(<MemoryRouter initialEntries={['/t/table-token']}><QueryClientProvider client={client}><Routes><Route path="/t/:token" element={<PublicMenuPage mode="table" />} /></Routes></QueryClientProvider></MemoryRouter>)
  })
  await settle(); await settle()
}
async function click(text: string) {
  const button = Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes(text))
  expect(button, text).toBeTruthy()
  await act(async () => { button!.click(); await new Promise((r) => setTimeout(r, 20)) })
}
function type(selector: string, value: string) {
  const input = host.querySelector<HTMLInputElement>(selector)
  expect(input, selector).toBeTruthy()
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
  input!.dispatchEvent(new Event('input', { bubbles: true }))
}
async function orderDrinkWithPackage(pkg: string) {
  await render()
  const radio = Array.from(host.querySelectorAll('[role=radio]')).find((b) => b.textContent?.includes(pkg)) as HTMLButtonElement
  await act(async () => { radio.click(); await new Promise((r) => setTimeout(r, 10)) })
  await click(t('rentalAddOrder'))
  await click('Es Kopi Gula Aren')
  await click(t('menuViewOrder'))
  await act(async () => { type('input[autocomplete="name"]', 'Md'); type('input[autocomplete="tel"]', '085733134056') })
}

it('puts the chosen table package in the cart and starts it with the same Send button', async () => {
  await orderDrinkWithPackage('2 Jam')
  expect(host.textContent).toContain('BILLIARD 1 · 2 Jam')
  expect(host.textContent).toContain(t('rentalInCartHint'))
  await click(t('menuSendOrder')); await settle()

  expect(startPublicRental).toHaveBeenCalledWith('table-token', expect.objectContaining({ product_id: 'two-hours', prepay: false, customer_name: 'Md' }))
  expect(createPublicOrder).toHaveBeenCalled()
  // Meja dulu, baru pesanan.
  expect(vi.mocked(startPublicRental).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(createPublicOrder).mock.invocationCallOrder[0])
})

it('sends only the drinks when the customer removes the table package', async () => {
  await orderDrinkWithPackage('1 Jam')
  const remove = host.querySelector<HTMLButtonElement>(`[aria-label="${t('rentalRemoveFromCart')}"]`)
  expect(remove).toBeTruthy()
  await act(async () => { remove!.click(); await new Promise((r) => setTimeout(r, 10)) })
  await click(t('menuSendOrder')); await settle()

  expect(startPublicRental).not.toHaveBeenCalled()
  expect(createPublicOrder).toHaveBeenCalled()
})

it('does not send the order when the table cannot be started', async () => {
  vi.mocked(startPublicRental).mockRejectedValue(new Error('meja sedang dipakai'))
  await orderDrinkWithPackage('1 Jam')
  await click(t('menuSendOrder')); await settle()

  expect(startPublicRental).toHaveBeenCalled()
  expect(createPublicOrder).not.toHaveBeenCalled()
})

// Keluhan pelanggan: pembeli memilih sewa meja, menambah minuman, lalu
// langsung mengirim — tanpa pernah memilih bayar sekarang atau lewat kasir,
// dan mengira mejanya sudah beres. Bila meja bisa dibayar di depan, cara
// bayarnya kini wajib dipilih di keranjang.
const sendButton = () => Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes(t('menuSendOrder')))!
// Kartu meja di belakang keranjang punya tombol berlabel sama — klik yang di keranjang.
async function choosePay(text: string) {
  const button = Array.from(host.querySelectorAll('[data-testid="rental-pay"] button')).find((b) => b.textContent?.includes(text)) as HTMLButtonElement
  expect(button, text).toBeTruthy()
  await act(async () => { button.click(); await new Promise((r) => setTimeout(r, 20)) })
}

it('requires choosing how to pay for the table before sending, when prepay is available', async () => {
  const prepayRental = { ...rental, prepay_available: true }
  vi.mocked(getPublicMenu).mockResolvedValue({ data: { data: { ...menu, rental: prepayRental } } } as never)
  vi.mocked(getPublicRental).mockResolvedValue({ data: { data: prepayRental } } as never)
  vi.mocked(startPublicRental).mockResolvedValue({ data: { data: prepayRental } } as never)
  await orderDrinkWithPackage('1 Jam')

  expect(host.querySelector('[data-testid="rental-pay"]')).toBeTruthy()
  expect(host.textContent).toContain(t('rentalChoosePay'))
  expect(sendButton().disabled).toBe(true)

  await choosePay(t('rentalAskCashier'))
  expect(sendButton().disabled).toBe(false)
  await click(t('menuSendOrder')); await settle()
  expect(startPublicRental).toHaveBeenCalledWith('table-token', expect.objectContaining({ product_id: 'one-hour', prepay: false }))
  expect(createPublicOrder).toHaveBeenCalled()
})

it('starts the table with QRIS prepay when the customer picks Pay now', async () => {
  const prepayRental = { ...rental, prepay_available: true }
  vi.mocked(getPublicMenu).mockResolvedValue({ data: { data: { ...menu, rental: prepayRental } } } as never)
  vi.mocked(getPublicRental).mockResolvedValue({ data: { data: prepayRental } } as never)
  vi.mocked(startPublicRental).mockResolvedValue({ data: { data: prepayRental } } as never)
  await orderDrinkWithPackage('2 Jam')

  await choosePay(t('rentalPayNow'))
  await click(t('menuSendOrder')); await settle()
  expect(startPublicRental).toHaveBeenCalledWith('table-token', expect.objectContaining({ product_id: 'two-hours', prepay: true }))
})

it('needs no payment choice when the table can only be started by the cashier', async () => {
  await orderDrinkWithPackage('1 Jam')
  expect(host.querySelector('[data-testid="rental-pay"]')).toBeNull()
  expect(host.textContent).toContain(t('rentalCartCashierOnly'))
  expect(sendButton().disabled).toBe(false)
})

it('warns that the order goes without the table after removing it, and can add it back', async () => {
  await orderDrinkWithPackage('1 Jam')
  const remove = host.querySelector<HTMLButtonElement>(`[aria-label="${t('rentalRemoveFromCart')}"]`)
  await act(async () => { remove!.click(); await new Promise((r) => setTimeout(r, 10)) })
  expect(host.textContent).toContain(t('rentalSkippedWarning'))

  await click(t('rentalAddBack'))
  expect(host.textContent).not.toContain(t('rentalSkippedWarning'))
  expect(host.textContent).toContain('BILLIARD 1 · 1 Jam')
})

// Bar keranjang di bawah layar harus sama dengan isi keranjang: sewa meja
// ikut terhitung, bukan hanya minumannya.
it('counts the table package in the floating cart bar', async () => {
  await render()
  const radio = Array.from(host.querySelectorAll('[role=radio]')).find((b) => b.textContent?.includes('1 Jam')) as HTMLButtonElement
  await act(async () => { radio.click(); await new Promise((r) => setTimeout(r, 10)) })
  await click(t('rentalAddOrder'))
  await click('Es Kopi Gula Aren')
  const bar = Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes(t('menuViewOrder')))!
  expect(bar.querySelector('.rounded-full')?.textContent).toBe('2')
})

it('says only the table is paid by QRIS now when Pay now is chosen', async () => {
  const prepayRental = { ...rental, prepay_available: true }
  vi.mocked(getPublicMenu).mockResolvedValue({ data: { data: { ...menu, rental: prepayRental } } } as never)
  vi.mocked(getPublicRental).mockResolvedValue({ data: { data: prepayRental } } as never)
  await orderDrinkWithPackage('1 Jam')
  expect(host.textContent).toContain(t('menuPayAtCounter'))

  await choosePay(t('rentalPayNow'))
  expect(host.textContent).toContain(t('rentalCartPayNowFooter'))
  expect(host.textContent).not.toContain(t('menuPayAtCounter'))
})

// Bayar sekarang: sesi meja baru ada setelah QRIS lunas, padahal minumannya
// sudah terkirim. Selama menunggu bayar, "Pesanan saya" tetap memuatnya.
it('keeps the order sent with an unpaid table QRIS under My orders', async () => {
  saveOrder({ id: 'trx-1', token: 'table-token', mode: 'table', businessName: 'Caffe & Billiard', outletName: 'Jenggrik', createdAt: new Date().toISOString(), items: ['1× Es Kopi Gula Aren'], total: 5000 })
  const waiting = { ...rental, prepay_available: true, pending_payment: { order_id: 'pay-1', kind: 'START', packages: 1, minutes: 60, amount: 8007, claimed: false, expires_at: new Date(Date.now() + 600_000).toISOString() } }
  vi.mocked(getPublicMenu).mockResolvedValue({ data: { data: { ...menu, rental: waiting } } } as never)
  vi.mocked(getPublicRental).mockResolvedValue({ data: { data: waiting } } as never)
  await render()
  expect(host.querySelector(`[aria-label="${t('menuMyOrders')}"]`)).toBeTruthy()
  removeOrders(['trx-1'])
})

// Keranjang menyebut pajak & biaya layanan outlet: tanpa ini, QRIS sewa
// Rp11.562 terasa "naik sendiri" dari Rp10.000 di keranjang.
it('tells the customer the cart excludes tax & service charge', async () => {
  vi.mocked(getPublicMenu).mockResolvedValue({ data: { data: { ...menu, charges: { tax_rate: 10, service_fee: 5 } } } } as never)
  await orderDrinkWithPackage('1 Jam')
  const list = [t('menuChargesTax', { rate: '10' }), t('menuChargesServicePct', { rate: '5' })].join(' & ')
  expect(host.textContent).toContain(t('menuChargesNote', { list }))
  expect(host.textContent).toContain(t('menuSubtotalLabel', { n: 2 }))
})

it('says nothing about charges when the outlet adds none', async () => {
  await orderDrinkWithPackage('1 Jam')
  // Awal kalimat catatan ("Belum termasuk ") tidak muncul sama sekali.
  expect(host.textContent).not.toContain(t('menuChargesNote', { list: '|' }).split('|')[0])
  expect(host.textContent).toContain(t('menuSubtotalItems', { n: 2 }))
})
