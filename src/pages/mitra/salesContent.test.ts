import { describe, expect, it } from 'vitest'
import { strFromU8, unzipSync } from 'fflate'
import type { SalesContent } from '@/api/sales'
import { createSalesContentZip, salesContentCaption, salesContentImageURL } from './salesContent'
import { salesContentAssets } from '@/data/salesContentAssets'

const content: SalesContent = { id: 'abcdef01-1234-1234-1234-123456789000', caption: 'Kasir lebih rapi.\n\nCatat transaksi hari ini.', threads_text: 'Mulai dari catatan hari ini.', scheduled_at: null, media: [{ id: 'second', position: 1, url: 'https://example.test/2.jpg', width: 1080, height: 1350 }, { id: 'first', position: 0, url: 'https://example.test/1.jpg', width: 1080, height: 1350 }] }
const vars = { active: true, code: 'SALEABCDEFGH', link: 'https://app.lokakasir.id/register?ref=SALEABCDEFGH' }

describe('sales content downloads', () => {
  it('preserves image order and includes usable personalized captions in a real ZIP', async () => {
    const bytes = await createSalesContentZip(content, vars, async (media) => new Uint8Array(media.id === 'first' ? [255, 216, 1, 255, 217] : [255, 216, 2, 255, 217]))
    const files = unzipSync(bytes)
    expect(files['01.jpg'][2]).toBe(1)
    expect(files['02.jpg'][2]).toBe(2)
    expect(strFromU8(files['caption-instagram.txt'])).toContain(vars.link)
    expect(strFromU8(files['caption-threads.txt'])).toContain(vars.link)
    expect(strFromU8(files['baca-dulu.txt'])).toContain('sesuai urutan nomor')
  })
  it('does not promote a pending or suspended referral code', () => {
    expect(salesContentCaption(content, 'instagram', { ...vars, active: false })).toBe(content.caption)
    expect(salesContentCaption(content, 'threads', { ...vars, active: false })).not.toContain('SALEABCDEFGH')
  })
  it('does not exceed platform limits when adding a link', () => {
    expect(salesContentCaption({ ...content, threads_text: 'a'.repeat(490) }, 'threads', vars)).toHaveLength(490)
    expect(salesContentCaption(content, 'threads', vars).length).toBeLessThanOrEqual(500)
  })
  it('keeps HD library copies available independently of archived social URLs', () => {
    expect(Object.keys(salesContentAssets)).toHaveLength(408)
    const id = Object.keys(salesContentAssets)[0]
    expect(salesContentImageURL({ ...content.media[0], id, url: 'https://example.test/archive.webp' })).toBe(salesContentAssets[id])
  })
})
