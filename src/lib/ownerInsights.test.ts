import { beforeEach, describe, expect, it } from 'vitest'
import { setActiveLocale } from '@/lib/i18n'
import { leakFindingText, winbackMessage } from '@/lib/ownerInsights'
import { whatsAppNumber, whatsAppUrl, type LeakFinding, type WinbackCustomer } from '@/api/ownerInsights'

const finding = (over: Partial<LeakFinding>): LeakFinding => ({
  code: 'cancel_rate', severity: 'high', actor_id: 'a', actor_name: 'Ani', count: 12,
  amount: 240000, rate: 13.4, baseline: 3.2, refs: [], ...over,
})

const customer = (over: Partial<WinbackCustomer>): WinbackCustomer => ({
  customer_id: 'c', name: 'Budi Santoso', phone: '0812', segment: 'lost', visits: 12,
  avg_gap_days: 3, days_since: 29, last_visit: '2026-09-25', total_spent: 0, avg_ticket: 0,
  monthly_value: 0, favorite_item: '', last_contacted_at: null, contact_count: 0, ...over,
})

describe('kalimat wawasan pemilik', () => {
  beforeEach(() => setActiveLocale('id'))

  it('merangkai temuan dari kode, nama, dan angkanya', () => {
    const [title, body] = leakFindingText(finding({}))
    expect(title).toBe('Ani sering membatalkan nota')
    expect(body).toContain('12 nota batal (13,4%)')
    expect(body).toContain('rekan biasanya 3,2%')
  })

  it('susut stok menyebut barang terbanyak', () => {
    const [, body] = leakFindingText(finding({ code: 'stock_shrink', actor_name: '', items: ['Beras', 'Minyak'] }))
    expect(body).toContain('Beras, Minyak')
  })

  it('QRIS tanpa pelaku memakai judul toko', () => {
    const [title] = leakFindingText(finding({ code: 'qris_unverified', actor_name: '' }))
    expect(title).toBe('QRIS tanpa dana masuk')
  })

  it('pesan sapaan memakai nama depan dan menu kesukaan', () => {
    const text = winbackMessage(customer({ favorite_item: 'Seblak Ceker' }), 'Seblak Teh Ocha')
    expect(text).toContain('Halo Budi!')
    expect(text).toContain('Seblak Teh Ocha')
    expect(text).toContain('Seblak Ceker')
  })

  it('pelanggan baru sekali tidak disapa "kangen"', () => {
    const text = winbackMessage(customer({ segment: 'new_once' }), '')
    expect(text).toContain('Terima kasih')
    expect(text).not.toContain('kangen')
  })
})

describe('nomor WhatsApp', () => {
  it('menyamakan penulisan lokal dan internasional', () => {
    expect(whatsAppNumber('0812-3456-7890')).toBe('6281234567890')
    expect(whatsAppNumber('+62 812 3456 7890')).toBe('6281234567890')
    expect(whatsAppNumber('-')).toBeNull()
  })

  it('tanpa nomor tetap membuka WhatsApp dengan pesannya', () => {
    expect(whatsAppUrl(null, 'Halo')).toBe('https://wa.me/?text=Halo')
    expect(whatsAppUrl('62812', 'a b')).toBe('https://wa.me/62812?text=a%20b')
  })
})
