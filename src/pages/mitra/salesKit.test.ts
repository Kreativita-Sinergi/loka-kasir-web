import { describe, expect, it } from 'vitest'
import { captionPlatforms, captions, fillSalesTemplate, objections, sellingPoints, tutorialSteps } from './salesKit'
import { tutorialGroups } from './salesVideos'

const vars = { code: 'ODHI20', link: 'https://app.lokakasir.id/register?ref=ODHI20' }

describe('bahan jualan mitra', () => {
  it('setiap caption terisi kode & link tanpa sisa placeholder dan muat batas platform', () => {
    for (const p of captionPlatforms) {
      expect(captions[p.key].length).toBeGreaterThanOrEqual(2)
      for (const c of captions[p.key]) {
        const text = fillSalesTemplate(c.text, vars)
        expect(text).not.toMatch(/\{(kode|link|app)\}/)
        expect(text).toContain('ODHI20')
        if (p.limit) expect(text.length).toBeLessThanOrEqual(p.limit)
      }
    }
  })

  it('poin jualan & jawaban tidak menyisakan placeholder', () => {
    for (const t of [...sellingPoints, ...objections.map((o) => o.a), ...tutorialSteps.map((s) => s.body)]) {
      expect(fillSalesTemplate(t, vars)).not.toMatch(/\{(kode|link|app)\}/)
    }
  })

  it('setiap langkah tutorial menunjuk video yang ada', () => {
    const keys = new Set(tutorialGroups.flatMap((g) => g.videos.map((v) => v.key)))
    for (const step of tutorialSteps) for (const k of step.videos) expect(keys.has(k)).toBe(true)
    for (const g of tutorialGroups) for (const v of g.videos) expect(v.phone ?? v.tablet).toMatch(/^[\w-]{11}$/)
  })
})
