import { beforeEach, describe, expect, it } from 'vitest'
import { setActiveLocale } from '@/lib/i18n'
import type { ReportArgs, ReportPillar, ReportRecommendation } from '@/api/ownerInsights'
import { cashierInsightText, pillarNote, recommendationAction, recommendationText, reportArg, signedPct } from '@/lib/reportCard'

const arg = (kind: 'money' | 'pct' | 'count' | 'number' | 'text', value = 0, text = '') => ({ kind, value, text })

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

  it('kalimat bimbingan kasir', () => {
    expect(cashierInsightText({ code: 'late', args: { count: arg('count', 5), days: arg('count', 20) } }))
      .toBe('Terlambat 5 dari 20 hari.')
  })
})
