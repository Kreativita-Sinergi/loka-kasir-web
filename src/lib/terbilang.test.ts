import { describe, expect, it } from 'vitest'
import { amountInWords, numberInWords } from './terbilang'

describe('numberInWords (id)', () => {
  it.each([
    [0, 'nol'],
    [1, 'satu'],
    [11, 'sebelas'],
    [15, 'lima belas'],
    [20, 'dua puluh'],
    [100, 'seratus'],
    [111, 'seratus sebelas'],
    [1000, 'seribu'],
    [1500, 'seribu lima ratus'],
    [21000, 'dua puluh satu ribu'],
    [100000, 'seratus ribu'],
    [1000000, 'satu juta'],
    [10000000, 'sepuluh juta'],
    [1250750, 'satu juta dua ratus lima puluh ribu tujuh ratus lima puluh'],
    [2000000000, 'dua miliar'],
    [3000000000000, 'tiga triliun'],
  ])('%d → %s', (value, words) => {
    expect(numberInWords(value, 'id')).toBe(words)
  })

  it('spells cents digit by digit and keeps the sign', () => {
    expect(numberInWords(12.5, 'id', 2)).toBe('dua belas koma lima')
    expect(numberInWords(-5000, 'id')).toBe('minus lima ribu')
  })

  it('returns empty text for non-numbers', () => {
    expect(numberInWords(Number.NaN, 'id')).toBe('')
  })
})

describe('numberInWords (en)', () => {
  it.each([
    [0, 'zero'],
    [21, 'twenty-one'],
    [105, 'one hundred five'],
    [1000000, 'one million'],
    [1250750, 'one million two hundred fifty thousand seven hundred fifty'],
  ])('%d → %s', (value, words) => {
    expect(numberInWords(value, 'en')).toBe(words)
  })
})

describe('amountInWords', () => {
  it('capitalises and adds rupiah only for IDR', () => {
    expect(amountInWords(100000, 'id')).toBe('Seratus ribu rupiah')
    expect(amountInWords(250000, 'en')).toBe('Two hundred fifty thousand rupiah')
    expect(amountInWords(25.75, 'en', 'USD', 2)).toBe('Twenty-five point seven five')
  })
})
