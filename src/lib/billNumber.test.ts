import { describe, expect, it } from 'vitest'
import { billNumberExample } from './billNumber'

describe('billNumberExample', () => {
  const day = new Date(2026, 9, 31, 14, 50)
  it('meletakkan awalan di depan tanggal', () => {
    expect(billNumberExample('ALS', day)).toBe('ALS-261031-0001')
  })
  it('tanpa awalan = nomor bawaan', () => {
    expect(billNumberExample('', day)).toBe('261031-0001')
  })
})
