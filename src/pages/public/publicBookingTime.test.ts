import { describe, expect, it } from 'vitest'
import type { PublicBookingInfo } from '@/api/public'
import { dayGrid, freeStarts, slotOptions, wallToIso, zoneOffset } from './publicBookingTime'

const court = {
  id: 'c1', name: 'Lapangan 1', sport: 'PADEL', hourly_rate: 100000,
  open_minute: 8 * 60, close_minute: 12 * 60, slot_minutes: 60,
}

const info = (busy: PublicBookingInfo['busy'] = []): PublicBookingInfo => ({
  store_name: 'Toko', outlet_name: 'Pusat', date: '2030-01-10', timezone: 'Asia/Jakarta',
  courts: [court], busy,
})

describe('PublicBookingPage helpers', () => {
  it('menghitung offset zona toko', () => {
    expect(zoneOffset('Asia/Jakarta')).toBe('+07:00')
    expect(zoneOffset('Asia/Makassar')).toBe('+08:00')
  })

  it('menit jam dinding → RFC3339, 24.00 jadi besoknya', () => {
    expect(wallToIso('2030-01-10', 8 * 60 + 30, '+07:00')).toBe('2030-01-10T08:30:00+07:00')
    expect(wallToIso('2030-01-31', 1440, '+07:00')).toBe('2030-02-01T00:00:00+07:00')
  })

  it('melewatkan jam yang sudah dipesan dan yang sudah lewat', () => {
    const busy = [{ court_id: 'c1', starts_at: '2030-01-10T02:00:00Z', ends_at: '2030-01-10T03:00:00Z' }] // 09.00–10.00 WIB
    expect(freeStarts(info(busy), court, 60, 0)).toEqual([480, 600, 660])
    expect(freeStarts(info(busy), court, 120, 0)).toEqual([600])
    const at0930 = Date.parse('2030-01-10T09:30:00+07:00')
    expect(freeStarts(info(), court, 60, at0930)).toEqual([600, 660])
  })

  it('jam terisi tetap tercantum sebagai penuh, yang lewat ditandai lewat', () => {
    const busy = [{ court_id: 'c1', starts_at: '2030-01-10T02:00:00Z', ends_at: '2030-01-10T03:00:00Z' }] // 09.00–10.00 WIB
    const at0830 = Date.parse('2030-01-10T08:30:00+07:00')
    expect(slotOptions(info(busy), court, 60, at0830)).toEqual([
      { minute: 480, state: 'past' },
      { minute: 540, state: 'taken' },
      { minute: 600, state: 'free' },
      { minute: 660, state: 'free' },
    ])
    // Sewa 2 jam mulai 08.00 menabrak 09.00 → penuh, bukan disembunyikan.
    expect(slotOptions(info(busy), court, 120, 0).map((o) => o.state)).toEqual(['taken', 'taken', 'free'])
  })

  it('jadwal harian: semua lapangan per jam, di luar jam buka = tutup', () => {
    const late = { ...court, id: 'c2', name: 'Lapangan 2', open_minute: 10 * 60, close_minute: 12 * 60 }
    const busy = [{ court_id: 'c1', starts_at: '2030-01-10T02:00:00Z', ends_at: '2030-01-10T03:00:00Z' }]
    const grid = dayGrid({ ...info(busy), courts: [court, late] }, 0)
    expect(grid.step).toBe(60)
    expect(grid.rows).toEqual([480, 540, 600, 660])
    expect(grid.cells.c1).toEqual(['free', 'taken', 'free', 'free'])
    expect(grid.cells.c2).toEqual(['closed', 'closed', 'free', 'free'])
  })
})
