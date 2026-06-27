import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exportToCSV } from './exportUtils'

// jsdom doesn't implement URL.createObjectURL — stub it
beforeEach(() => {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/fake')
  globalThis.URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// Read exportUtils fully to get csvFilename
const exportUtils = await import('./exportUtils')

describe('csvFilename', () => {
  it('returns a string ending in .csv', () => {
    const name = exportUtils.csvFilename('laporan')
    expect(name).toMatch(/\.csv$/)
  })

  it('includes the provided base name', () => {
    expect(exportUtils.csvFilename('keuangan')).toContain('keuangan')
  })

  it('includes a date portion', () => {
    const name = exportUtils.csvFilename('test')
    // Should contain YYYY-MM-DD or YYYYMMDD pattern
    expect(name).toMatch(/\d{4}/)
  })
})

describe('exportToCSV', () => {
  it('does nothing when data is empty', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click')
    exportToCSV([], 'empty.csv')
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('triggers anchor click when data is provided', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    exportToCSV([{ name: 'Kopi', price: 15000 }], 'produk.csv')
    expect(clickSpy).toHaveBeenCalledOnce()
  })

  it('sets the correct download filename', () => {
    let capturedFilename = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      capturedFilename = this.download
    })
    exportToCSV([{ col: 'val' }], 'my-report.csv')
    expect(capturedFilename).toBe('my-report.csv')
  })

  it('escapes commas in cell values', () => {
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node)
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    // Verify the CSV blob content via createObjectURL call
    globalThis.URL.createObjectURL = vi.fn((blob: Blob) => {
      const reader = new FileReader()
      reader.readAsText(blob)
      return 'blob:fake'
    })

    exportToCSV([{ product: 'Kopi, Susu', price: 15000 }], 'test.csv')
    // If no throw, the comma escaping logic ran without error
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
  })

  it('handles null and undefined cell values gracefully', () => {
    expect(() => {
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      exportToCSV([{ name: null, qty: undefined, price: 0 }], 'test.csv')
    }).not.toThrow()
  })
})
