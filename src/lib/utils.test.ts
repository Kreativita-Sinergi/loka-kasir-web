import { describe, it, expect } from 'vitest'
import { toTitleCase, formatCurrency, formatDate, formatDateTime, getErrorMessage, generateRandomSKU } from './utils'

describe('toTitleCase', () => {
  it('capitalizes the first letter of each word', () => {
    expect(toTitleCase('kopi susu')).toBe('Kopi Susu')
  })
  it('handles single word', () => {
    expect(toTitleCase('kopi')).toBe('Kopi')
  })
  it('returns empty string for null', () => {
    expect(toTitleCase(null)).toBe('')
  })
  it('returns empty string for undefined', () => {
    expect(toTitleCase(undefined)).toBe('')
  })
  it('returns empty string for empty string', () => {
    expect(toTitleCase('')).toBe('')
  })
  it('handles already capitalized input', () => {
    expect(toTitleCase('KOPI SUSU')).toBe('KOPI SUSU')
  })
})

describe('formatCurrency', () => {
  it('formats positive number as IDR', () => {
    const result = formatCurrency(50000)
    expect(result).toContain('50.000')
    expect(result).toContain('Rp')
  })
  it('formats zero as IDR', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
    expect(result).toContain('Rp')
  })
  it('formats large number correctly', () => {
    const result = formatCurrency(1000000)
    expect(result).toContain('1.000.000')
  })
  it('formats decimal without fraction digits', () => {
    const result = formatCurrency(39000.5)
    // minimumFractionDigits = 0 → rounds
    expect(result).not.toContain(',')
  })
})

describe('formatDate', () => {
  it('formats ISO date string in Indonesian locale', () => {
    const result = formatDate('2026-01-15')
    // dd Mon yyyy
    expect(result).toContain('2026')
    expect(result).toMatch(/\d{1,2}/)
  })
  it('formats Date object', () => {
    const result = formatDate(new Date(2026, 0, 15))
    expect(result).toContain('2026')
  })
})

describe('formatDateTime', () => {
  it('includes both date and time', () => {
    const result = formatDateTime('2026-05-20T10:30:00')
    expect(result).toContain('2026')
    expect(result).toMatch(/\d{2}\.\d{2}/)
  })
})

describe('generateRandomSKU', () => {
  it('starts with SKU-', () => {
    expect(generateRandomSKU()).toMatch(/^SKU-/)
  })
  it('contains date portion in YYYYMMDD format', () => {
    const sku = generateRandomSKU()
    const parts = sku.split('-')
    expect(parts.length).toBe(3)
    expect(parts[1]).toMatch(/^\d{8}$/)
  })
  it('ends with 4 alphanumeric characters', () => {
    const sku = generateRandomSKU()
    const parts = sku.split('-')
    expect(parts[2]).toMatch(/^[A-Z0-9]{4}$/)
  })
  it('generates different SKUs on consecutive calls', () => {
    const skus = new Set(Array.from({ length: 10 }, () => generateRandomSKU()))
    expect(skus.size).toBeGreaterThan(1)
  })
})

describe('getErrorMessage', () => {
  it('returns details from API response error shape', () => {
    const error = {
      response: { data: { error: { details: 'Produk tidak ditemukan' } } },
    }
    expect(getErrorMessage(error)).toBe('Produk tidak ditemukan')
  })
  it('falls back to response.data.message', () => {
    const error = {
      response: { data: { message: 'Server error' } },
    }
    expect(getErrorMessage(error)).toBe('Server error')
  })
  it('returns default message for unknown error shape', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('Terjadi kesalahan')
  })
  it('returns default message for null', () => {
    expect(getErrorMessage(null)).toBe('Terjadi kesalahan')
  })
  it('returns default message for string errors', () => {
    expect(getErrorMessage('some error')).toBe('Terjadi kesalahan')
  })
})
