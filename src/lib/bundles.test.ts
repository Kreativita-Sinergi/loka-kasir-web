import { beforeEach, describe, expect, it } from 'vitest'
import { setActiveLocale } from '@/lib/i18n'
import type { Bundle, Product } from '@/types'
import {
  bundleInitials, bundleItemKey, bundleItemsPreview, bundlePicks, bundlePriceSummary, bundleSaving,
  bundleSummaryLines, newBundleLink, parseNewBundleParam, suggestBundleName,
} from '@/lib/bundles'

const prod = (sell_price: number | null, base_price: number | null = null) => ({ sell_price, base_price })
const bundle = (sell_price: number, items: [string, number, number][]) =>
  ({ sell_price, items: items.map(([name, price, quantity]) => ({ name, sell_price: price, quantity })) }) as unknown as Bundle

describe('ringkasan harga paket', () => {
  beforeEach(() => setActiveLocale('id'))

  it('menjumlah harga satuan dan modal × jumlah', () => {
    expect(bundlePriceSummary([{ product: prod(15000, 6000), quantity: 1 }, { product: prod(6000, 2250), quantity: 2 }]))
      .toEqual({ normal: 27000, cost: 10500 })
  })

  it('isi tanpa harga atau modal membuat angkanya tidak diketahui', () => {
    expect(bundlePriceSummary([{ product: prod(15000), quantity: 1 }, { product: undefined, quantity: 1 }]))
      .toEqual({ normal: null, cost: null })
  })

  it('lebih murah: hemat hijau berikut persennya, lalu modal & untung', () => {
    const lines = bundleSummaryLines([{ product: prod(15000, 6000), quantity: 1 }, { product: prod(6000, 2250), quantity: 2 }], 24000)
    expect(lines.map((l) => l.tone)).toEqual(['success', 'muted'])
    expect(lines[0].text).toMatch(/^Kalau dibeli satuan Rp\s?27\.000 · pembeli hemat Rp\s?3\.000 \(11%\)$/)
    expect(lines[1].text).toMatch(/^Modal Rp\s?10\.500 · untung Rp\s?13\.500$/)
  })

  it('tidak lebih murah dari satuan: peringatan', () => {
    const [line] = bundleSummaryLines([{ product: prod(10000), quantity: 2 }], 20000)
    expect(line.tone).toBe('warning')
    expect(line.text).toMatch(/^Tidak lebih murah dari dibeli satuan \(Rp\s?20\.000\)/)
  })

  it('harga belum diisi: hanya harga satuan; modal kosong: ajakan mengisi', () => {
    const items = [{ product: prod(10000), quantity: 1 }]
    expect(bundleSummaryLines(items, 0).map((l) => l.text)).toEqual([expect.stringMatching(/^Kalau dibeli satuan Rp\s?10\.000$/)])
    expect(bundleSummaryLines(items, 9000)[1].text).toBe('Isi harga modal isinya untuk melihat untung paket')
    expect(bundleSummaryLines([], 9000)).toEqual([])
  })

  it('rugi ditandai merah', () => {
    expect(bundleSummaryLines([{ product: prod(10000, 9000), quantity: 1 }], 8000)[1].tone).toBe('danger')
  })
})

describe('daftar paket', () => {
  it('pratinjau isi, hemat, dan inisial', () => {
    const b = bundle(18000, [['Seblak', 15000, 1], ['Es Teh', 5000, 1]])
    expect(bundleItemsPreview(b)).toBe('Seblak ×1 · Es Teh ×1')
    const kaos = { items: [{ name: 'Kaos', variant_name: 'L', quantity: 2 }] } as unknown as Bundle
    expect(bundleItemsPreview(kaos)).toBe('Kaos · L ×2')
    expect(bundleSaving(b)).toBe(2000)
    expect(bundleSaving(bundle(25000, [['Seblak', 15000, 1]]))).toBe(0)
    expect(bundleInitials('Paket Hemat Siang')).toBe('PH')
  })
})

describe('form paket', () => {
  beforeEach(() => setActiveLocale('id'))

  it('menyarankan nama dari isinya', () => {
    expect(suggestBundleName(['Seblak', 'Es Teh'])).toBe('Paket Seblak + Es Teh')
    expect(suggestBundleName([])).toBe('')
    setActiveLocale('en')
    expect(suggestBundleName(['Noodles', 'Iced Tea'])).toBe('Noodles + Iced Tea Combo')
  })

  it('produk bervarian dipilih per varian; bertimer redup; nonaktif tidak tampil', () => {
    const p = (patch: Partial<Product>) =>
      ({ id: 'x', name: 'X', is_active: true, has_variant: false, variants: null, timer_mode: 'NONE', sell_price: 5000, base_price: 2000, ...patch }) as Product
    const variant = (id: string, name: string, sell_price: number, base_price: number) =>
      ({ id, name, sell_price, base_price }) as NonNullable<Product['variants']>[number]
    const picks = bundlePicks([
      p({ id: 'seblak', name: 'Seblak' }),
      p({ id: 'kaos', name: 'Kaos', has_variant: true, variants: [variant('m', 'M', 50000, 30000), variant('l', 'L', 55000, 32000)] }),
      p({ id: 'meja', name: 'Meja Biliar', timer_mode: 'METER' }),
      p({ id: 'lama', name: 'Lama', is_active: false }),
    ])
    expect(picks.map((x) => [x.key, x.label, x.sell_price, x.blocked])).toEqual([
      ['seblak', 'Seblak', 5000, null],
      ['kaos:m', 'Kaos · M', 50000, null],
      ['kaos:l', 'Kaos · L', 55000, null],
      ['meja', 'Meja Biliar', 5000, 'Bertimer — tidak bisa masuk paket'],
    ])
    expect(picks[2]).toMatchObject({ productId: 'kaos', variantId: 'l', base_price: 32000 })
    expect(bundleItemKey('kaos', 'l')).toBe('kaos:l')
    expect(bundleItemKey('seblak', null)).toBe('seblak')
  })

  it('tautan ?new= dari Rapor bolak-balik', () => {
    expect(newBundleLink(['p1', 'p2'])).toBe('/products/bundles?new=p1,p2')
    expect(parseNewBundleParam('p1, p2,,p1')).toEqual(['p1', 'p2'])
    expect(parseNewBundleParam('')).toEqual([])
    expect(parseNewBundleParam(null)).toEqual([])
  })
})
