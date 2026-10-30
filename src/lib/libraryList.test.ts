import { describe, it, expect, beforeEach } from 'vitest'
import { setActiveLocale } from './i18n'
import { productUsageLabel, showLibrarySearch, LIBRARY_SEARCH_MIN_TOTAL } from './libraryList'

describe('showLibrarySearch', () => {
  it('hanya untuk daftar yang lebih panjang dari ambang', () => {
    expect(showLibrarySearch(LIBRARY_SEARCH_MIN_TOTAL, '')).toBe(false)
    expect(showLibrarySearch(LIBRARY_SEARCH_MIN_TOTAL + 1, '')).toBe(true)
  })

  it('tetap tampil selama ada kata yang dicari, walau hasilnya sedikit', () => {
    expect(showLibrarySearch(0, 'kopi')).toBe(true)
  })
})

describe('productUsageLabel', () => {
  beforeEach(() => setActiveLocale('id'))

  it('menyebut jumlah produk pemakai', () => {
    expect(productUsageLabel(12)).toBe('Dipakai 12 produk')
    expect(productUsageLabel(0)).toBe('Belum dipakai produk')
  })

  it('diam bila server tidak mengirim angkanya', () => {
    expect(productUsageLabel(undefined)).toBeNull()
    expect(productUsageLabel(null)).toBeNull()
  })
})
