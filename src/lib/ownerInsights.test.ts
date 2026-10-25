import { beforeEach, describe, expect, it } from 'vitest'
import { setActiveLocale } from '@/lib/i18n'
import { fewTracked, leakFindingText, ratingReplyMessage, taxMonthRows, winbackMessage } from '@/lib/ownerInsights'
import { whatsAppNumber, whatsAppUrl, type LeakFinding, type TaxMonth, type TaxMonthStatus, type WinbackCustomer, type WinbackData } from '@/api/ownerInsights'

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

const summary = (tracked?: number): WinbackData['summary'] => ({
  lost: 0, at_risk: 0, new_once: 0, monthly_at_stake: 0, contacted_30d: 0, returned_30d: 0,
  returned_revenue_30d: 0, without_phone: 0, ...(tracked == null ? {} : { tracked }),
})

describe('panggil balik & penilaian', () => {
  beforeEach(() => setActiveLocale('id'))

  it('daftar kosong dijelaskan hanya bila pelanggan tercatat < 20', () => {
    expect(fewTracked(summary(3))).toBe(true)
    expect(fewTracked(summary(0))).toBe(true)
    expect(fewTracked(summary(20))).toBe(false)
    // Server lama tanpa `tracked`: pesan kosong bawaan.
    expect(fewTracked(summary())).toBe(false)
    expect(fewTracked(undefined)).toBe(false)
  })

  it('balasan bintang rendah meminta maaf dan bertanya', () => {
    const text = ratingReplyMessage({ rating: 2, contact_name: 'Siti Aminah' }, 'Seblak Teh Ocha')
    expect(text).toContain('Halo Siti,')
    expect(text).toContain('Seblak Teh Ocha')
    expect(text).toContain('Mohon maaf')
  })

  it('balasan bintang tinggi berterima kasih; tanpa nama & toko memakai sapaan bawaan', () => {
    const text = ratingReplyMessage({ rating: 4, contact_name: '  ' }, '')
    expect(text).toContain('Halo Kak,')
    expect(text).toContain('toko kami')
    expect(text).not.toContain('Mohon maaf')
  })
})

const month = (m: number, status: TaxMonthStatus, omzet = 0): TaxMonth => ({
  month: m, period: `2026-${String(m).padStart(2, '0')}`, omzet, cumulative: 0, taxable: 0, pph_due: 0,
  due_date: '', status, payment: null, local_tax: 0,
})

describe('masa pajak', () => {
  beforeEach(() => setActiveLocale('id'))

  it('menyembunyikan bulan mendatang dan meringkas bulan awal tanpa penjualan', () => {
    const months = [
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((m) => month(m, 'none')),
      month(10, 'running', 1500000),
      month(11, 'future'),
      month(12, 'future'),
    ]
    const { shown, quiet } = taxMonthRows(2026, months)
    expect(shown.map((m) => m.month)).toEqual([10])
    expect(quiet).toBe('Januari – September')
  })

  it('bulan nihil di tengah tahun tetap tampil; satu bulan diringkas tanpa rentang', () => {
    const months = [month(1, 'none'), month(2, 'due', 900000), month(3, 'none'), month(4, 'running', 100)]
    const { shown, quiet } = taxMonthRows(2026, months)
    expect(shown.map((m) => m.month)).toEqual([4, 3, 2])
    expect(quiet).toBe('Januari')
  })

  it('tanpa bulan nihil di awal tidak ada ringkasan', () => {
    const { shown, quiet } = taxMonthRows(2026, [month(1, 'paid', 5000000), month(2, 'running', 10)])
    expect(shown.map((m) => m.month)).toEqual([2, 1])
    expect(quiet).toBeNull()
  })

  it('setahun tanpa penjualan: tak ada baris, semuanya diringkas', () => {
    const { shown, quiet } = taxMonthRows(2025, [1, 2, 3].map((m) => month(m, 'none')))
    expect(shown).toEqual([])
    expect(quiet).toBe('Januari – Maret')
  })
})
