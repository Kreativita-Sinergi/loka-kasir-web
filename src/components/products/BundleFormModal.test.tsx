import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { getProducts } from '@/api/products'
import { createBundle } from '@/api/bundles'
import { setActiveLocale } from '@/lib/i18n'
import BundleFormModal from './BundleFormModal'
vi.mock('@/components/ui/Modal', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('@/api/products', () => ({ getProducts: vi.fn() }))
vi.mock('@/api/bundles', () => ({ createBundle: vi.fn(), updateBundle: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const product = (patch: Record<string, unknown>) =>
  ({ is_active: true, has_variant: false, variants: null, timer_mode: 'NONE', sell_price: 20000, base_price: 9000, ...patch })
const PRODUCTS = [
  product({ id: 'seblak', name: 'Seblak' }),
  product({
    id: 'teh', name: 'Teh Manis', has_variant: true, sell_price: null, base_price: null,
    variants: [{ id: 'kcl', name: 'Kecil', sell_price: 5000, base_price: 1000 }, { id: 'bsr', name: 'Besar', sell_price: 8000, base_price: 1500 }],
  }),
]

let host: HTMLDivElement
let root: Root
let qc: QueryClient
beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  setActiveLocale('id')
  vi.mocked(getProducts).mockResolvedValue({ data: { data: PRODUCTS } } as never)
  host = document.createElement('div')
  root = createRoot(host)
  qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
})
afterEach(() => { act(() => root.unmount()); qc.clear() })

async function render(initialProductIds: string[] = []) {
  await act(async () => {
    root.render(<QueryClientProvider client={qc}><BundleFormModal bundle={null} initialProductIds={initialProductIds} onClose={() => {}} /></QueryClientProvider>)
  })
  await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
}
const pick = (label: string) => act(() => {
  const button = [...host.querySelectorAll('li button')].find((b) => b.textContent?.startsWith(label)) as HTMLButtonElement
  button.click()
})
const searchBox = () => host.querySelector('input[aria-label="Cari produk untuk ditambahkan"]') as HTMLInputElement

it('produk bervarian dipilih per varian dan variant_id ikut terkirim', async () => {
  vi.mocked(createBundle).mockResolvedValue({ data: { status: true } } as never)
  await render()
  expect(host.textContent).toContain('Teh Manis · Kecil')
  expect(host.textContent).toContain('Teh Manis · Besar')

  pick('Seblak'); pick('Teh Manis · Besar')
  expect(host.textContent).toContain('Isi paket (2)')
  expect((host.querySelector('input:not([type=file])') as HTMLInputElement).value).toBe('Paket Seblak + Teh Manis · Besar')
  expect(host.textContent).toMatch(/Kalau dibeli satuan Rp\s?28\.000/)

  const price = host.querySelector('input[placeholder="0"]') as HTMLInputElement
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(price, '25000')
    price.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((r) => setTimeout(r, 20))
  })
  expect(createBundle).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Paket Seblak + Teh Manis · Besar',
    sell_price: 25000,
    items: [
      { product_id: 'seblak', quantity: 1 },
      { product_id: 'teh', variant_id: 'bsr', quantity: 1 },
    ],
  }))
})

it('saran Rapor dengan produk bervarian: diminta memilih variannya', async () => {
  await render(['seblak', 'teh'])
  expect(host.textContent).toContain('Isi paket (1)')
  expect(searchBox().value).toBe('Teh Manis')
  expect(host.textContent).toContain('Teh Manis · Kecil')
  expect(host.textContent).toContain('Teh Manis · Besar')
})
