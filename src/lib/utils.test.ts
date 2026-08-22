import { describe, expect, it } from 'vitest'
import { localStamp, todayISODate } from './utils'

/**
 * Yang dijaga di sini: tanggal kalender harus mengikuti zona waktu pengguna,
 * bukan UTC. `toISOString().slice(0, 10)` — yang dulu dipakai — mundur sehari
 * untuk seluruh Indonesia antara tengah malam dan pukul 07.00.
 */
describe('todayISODate', () => {
  it('mengikuti tanggal lokal, bukan UTC', () => {
    // 01.00 WIB tanggal 5 = 18.00 UTC tanggal 4.
    const dawnInJakarta = new Date('2026-03-04T18:00:00Z')
    // en-CA memberi "YYYY-MM-DD" dalam zona waktu lokal — implementasi
    // pembanding yang independen dari milik kita.
    const expected = dawnInJakarta.toLocaleDateString('en-CA')

    expect(todayISODate(dawnInJakarta)).toBe(expected)
  })

  it('berbeda dari tanggal UTC ketika zona waktunya memang berbeda hari', () => {
    const d = new Date('2026-03-04T18:00:00Z')
    const utcDate = d.toISOString().slice(0, 10)
    const localDate = d.toLocaleDateString('en-CA')

    if (utcDate === localDate) return // penguji berjalan di zona waktu UTC

    expect(todayISODate(d)).toBe(localDate)
    expect(todayISODate(d)).not.toBe(utcDate)
  })

  it('memberi nol di depan untuk bulan dan tanggal satu digit', () => {
    const d = new Date(2026, 0, 5, 12) // 5 Januari 2026, siang waktu lokal
    expect(todayISODate(d)).toBe('2026-01-05')
  })
})

describe('localStamp', () => {
  it('memakai jam lokal dan selalu 12 digit', () => {
    const d = new Date(2026, 2, 5, 9, 7) // 5 Maret 2026 09:07 waktu lokal
    expect(localStamp(d)).toBe('202603050907')
  })
})
