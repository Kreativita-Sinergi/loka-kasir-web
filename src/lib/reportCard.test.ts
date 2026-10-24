import { beforeEach, describe, expect, it } from 'vitest'
import { setActiveLocale } from '@/lib/i18n'
import type { ReportArgs, ReportPillar, ReportRecommendation } from '@/api/ownerInsights'
import { cashierInsightText, gradeMeaning, gradeTone, pillarNote, recommendationAction, recommendationText, reportArg, signedPct } from '@/lib/reportCard'

const arg = (kind: 'money' | 'pct' | 'count' | 'number' | 'text' | 'weekday', value = 0, text = '') => ({ kind, value, text })

const rec = (code: string, args: ReportArgs = {}, items: string[] = []): ReportRecommendation => ({
  code, kind: 'grow', impact_per_month: null, args, items,
})

const ALL_RECS: ReportRecommendation[] = [
  rec('restock', { days: arg('number', 1.5) }, ['Air Mineral']),
  rec('rising', { item: arg('text', 0, 'Es Kopi'), pct: arg('pct', 125) }),
  rec('falling', { item: arg('text', 0, 'Mie'), pct: arg('pct', 67) }),
  rec('raise_price', { item: arg('text', 0, 'Es Teh'), from: arg('money', 5000), to: arg('money', 5500) }),
  rec('promote', {}, ['Steak']),
  rec('review_dog', {}, ['Kerupuk']),
  rec('drop_idle', { count: arg('count', 14) }, ['Bakso Bakar', 'Cireng']),
  rec('bundle', { a: arg('text', 0, 'Seblak'), b: arg('text', 0, 'Es Teh'), pct: arg('pct', 30), price: arg('money', 20000) }),
  rec('attach', { category: arg('text', 0, 'Minuman'), pct: arg('pct', 80) }),
  rec('slow_hours', { from: arg('count', 13), to: arg('count', 15), pct: arg('pct', 3.1) }),
  rec('fill_cost', { count: arg('count', 7) }),
  rec('winback', { count: arg('count', 5) }),
  rec('record_buyers', { pct: arg('pct', 4.2) }),
  rec('leak', { count: arg('count', 3) }),
  rec('out_of_stock', { count: arg('count', 2), per_day: arg('money', 5000) }, ['Telur', 'Gas 3 kg']),
  rec('slow_day', { day: arg('weekday', 2), best: arg('weekday', 6), pct: arg('pct', 68.4), avg: arg('money', 150000), others: arg('money', 474000) }),
  rec('discount_heavy', { pct: arg('pct', 9.1), amount: arg('money', 1200000), tx: arg('pct', 50) }),
  rec('below_market', { count: arg('count', 1), item: arg('text', 0, 'Indomie Goreng'), price: arg('money', 3000), market: arg('money', 3500), stores: arg('count', 12) }),
  rec('above_market', { count: arg('count', 1), item: arg('text', 0, 'Aqua'), price: arg('money', 6000), market: arg('money', 4000), stores: arg('count', 9) }),
]

describe('kalimat rapor', () => {
  beforeEach(() => setActiveLocale('id'))

  it('memformat argumen menurut jenisnya', () => {
    const args = { p: arg('pct', 12.5), m: arg('money', 1250000), c: arg('count', 1240), t: arg('text', 0, 'Es Teh') }
    expect(reportArg(args, 'p')).toBe('12,5%')
    expect(reportArg(args, 'm')).toMatch(/^Rp\s?1\.250\.000$/)
    expect(reportArg(args, 'c')).toBe('1.240')
    expect(reportArg(args, 't')).toBe('Es Teh')
    expect(reportArg(args, 'tidak-ada')).toBe('')
    expect(signedPct(12.5)).toBe('+12,5%')
  })

  it('setiap saran punya kalimat utuh — bukan kode atau {placeholder}', () => {
    for (const r of ALL_RECS) {
      const [title, body] = recommendationText(r)
      expect(title, r.code).not.toBe(r.code)
      expect(`${title} ${body}`, r.code).not.toContain('{')
    }
    expect(recommendationText(ALL_RECS[8])).toEqual([
      'Tawarkan Minuman di setiap nota',
      expect.stringMatching(/^80% nota tidak membeli Minuman/),
    ])
    expect(recommendationText(ALL_RECS[9])[0]).toBe('Isi jam sepi 13.00–15.00')
  })

  it('hanya saran meja kasir yang tanpa tombol tujuan', () => {
    const noAction = ALL_RECS.filter((r) => recommendationAction(r) == null).map((r) => r.code)
    expect(noAction).toEqual(['attach', 'record_buyers'])
  })

  it('catatan pilar tanpa skor tetap terbaca', () => {
    const p: ReportPillar = { code: 'customers', score: null, grade: '', note: 'customers_unrecorded', args: { pct: arg('pct', 4.2) } }
    expect(pillarNote(p)).toContain('4,2%')
  })

  it('pelanggan sedikit dan kasir tanpa nilai', () => {
    const p: ReportPillar = { code: 'customers', score: null, grade: '', note: 'customers_few', args: { count: arg('count', 5) } }
    expect(pillarNote(p)).toBe('Baru 5 pelanggan tercatat — belum cukup untuk dinilai.')
    expect(gradeTone('')).toBe('gray')
    expect(gradeMeaning('')).toBe('Belum dinilai')
    expect(recommendationText(ALL_RECS[10])[0]).toBe('Isi harga modal 7 menu yang terjual')
  })

  it('saran hari sepi dan harga pasaran', () => {
    const find = (code: string) => recommendationText(ALL_RECS.find((r) => r.code === code)!)
    expect(find('slow_day')[0]).toBe('Selasa paling sepi')
    expect(find('slow_day')[1]).toContain('Sabtu hari paling ramai')
    expect(find('below_market')[1]).toMatch(/^Misalnya Indomie Goreng: kamu jual Rp\s?3\.000, median 12 toko Loka lain Rp\s?3\.500/)
    expect(find('out_of_stock')[0]).toBe('2 barang laris sedang habis')
  })

  it('kalimat bimbingan kasir', () => {
    expect(cashierInsightText({ code: 'late', args: { count: arg('count', 5), days: arg('count', 20) } }))
      .toBe('Terlambat 5 dari 20 hari.')
  })
})
