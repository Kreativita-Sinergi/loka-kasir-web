import { describe, expect, it } from 'vitest'
import type { PublicBookingInfo } from '@/api/public'
import { freeStarts, wallToIso, zoneOffset } from './publicBookingTime'

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
})
