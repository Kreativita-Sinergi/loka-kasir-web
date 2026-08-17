import { describe, it, expect, beforeEach } from 'vitest'
import { resolveLocale, setActiveLocale, t, DEFAULT_LOCALE, SUPPORTED_LOCALES } from './i18n'
import { messages } from './messages'
import {
  applyBusinessMoney,
  applyMoneyLocale,
  decimalsFor,
  formatMoney,
  formatMoneyIn,
  minorToMajor,
} from './money'

describe('resolveLocale', () => {
  it('menyaring tag dengan wilayah ke bagian bahasanya', () => {
    expect(resolveLocale('ja-JP')).toBe('ja')
    expect(resolveLocale('ja_JP')).toBe('ja')
    expect(resolveLocale('JA')).toBe('ja')
    expect(resolveLocale('en-GB')).toBe('en')
  })

  it('menjatuhkan bahasa tanpa terjemahan ke bawaan', () => {
    // Peramban berbahasa Prancis tidak boleh menghasilkan dasbor setengah kosong.
    expect(resolveLocale('fr')).toBe(DEFAULT_LOCALE)
    expect(resolveLocale('de-DE')).toBe(DEFAULT_LOCALE)
    expect(resolveLocale(null)).toBe(DEFAULT_LOCALE)
    expect(resolveLocale('')).toBe(DEFAULT_LOCALE)
  })
})

describe('katalog pesan', () => {
  it('setiap bahasa punya setiap kunci', () => {
    // Kunci yang terlewat akan diam-diam menampilkan bahasa Indonesia di tengah
    // teks berbahasa lain — cacat yang tidak menghasilkan galat apa pun dan
    // hanya terlihat oleh yang membaca bahasanya.
    const keys = Object.keys(messages.id)
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === DEFAULT_LOCALE) continue
      const catalog = messages[locale] as Record<string, string | undefined>
      const missing = keys.filter((key) => !catalog[key])
      expect(missing, `bahasa ${locale} kehilangan kunci`).toEqual([])
    }
  })

  it('tidak ada kunci yang hanya ada di satu bahasa', () => {
    const keys = new Set(Object.keys(messages.id))
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === DEFAULT_LOCALE) continue
      for (const key of Object.keys(messages[locale])) {
        expect(keys.has(key), `${locale}.${key} tidak ada di katalog Indonesia`).toBe(true)
      }
    }
  })
})

describe('t', () => {
  beforeEach(() => setActiveLocale(DEFAULT_LOCALE))

  it('menerjemahkan sesuai bahasa aktif', () => {
    setActiveLocale('ja')
    expect(t('actionSave')).toBe('保存')
    setActiveLocale('en')
    expect(t('actionSave')).toBe('Save')
  })

  it('mengisi argumen bernama', () => {
    setActiveLocale('en')
    expect(t('planBilledInIdr', { amount: 'IDR 160,000' })).toBe(
      'Billed as IDR 160,000. Your bank handles the conversion.',
    )
  })

  it('membiarkan penanda yang argumennya tidak diberikan', () => {
    // Lebih baik "{amount}" terlihat di layar daripada kalimat yang kehilangan
    // angkanya tanpa jejak.
    setActiveLocale('en')
    expect(t('planBilledInIdr')).toContain('{amount}')
  })
})

describe('money', () => {
  beforeEach(() => {
    applyMoneyLocale('id')
    applyBusinessMoney({ currencyCode: 'IDR', decimalDigits: 0 })
  })

  it('rupiah tetap tanpa desimal', () => {
    // Intl menyisipkan spasi tak-putus (U+00A0) di sebagian locale; yang
    // diuji adalah angkanya, bukan jenis spasinya.
    expect(formatMoney(89000)).toContain('89.000')
  })

  it('mengikuti mata uang bisnis', () => {
    applyBusinessMoney({ currencyCode: 'JPY', decimalDigits: 0 })
    applyMoneyLocale('ja')
    expect(formatMoney(1480)).toContain('1,480')
  })

  it('mata uang kosong tidak menimpa yang sudah berlaku', () => {
    // Server versi lama tidak mengirim currency_code; nilai luring terakhir yang
    // benar harus bertahan, bukan dipaksa kembali ke rupiah.
    applyBusinessMoney({ currencyCode: 'MYR', decimalDigits: 2 })
    applyBusinessMoney({ currencyCode: null, decimalDigits: null })
    // Pemisah desimalnya koma karena bahasa aktif masih Indonesia — mata uang
    // dan bahasa memang dua setelan terpisah, dan itu perilaku yang dituju.
    expect(formatMoney(25)).toContain('MYR')
    expect(formatMoney(25)).toContain('25,00')
  })

  it('pemisah desimal mengikuti bahasa, bukan mata uang', () => {
    applyBusinessMoney({ currencyCode: 'MYR', decimalDigits: 2 })
    applyMoneyLocale('en')
    expect(formatMoney(25)).toContain('25.00')
  })

  it('desimal mengikuti mata uang', () => {
    expect(decimalsFor('IDR')).toBe(0)
    expect(decimalsFor('JPY')).toBe(0)
    expect(decimalsFor('MYR')).toBe(2)
    // Tak dikenal dianggap 2: "10.00" untuk yang bulat jauh lebih ringan
    // akibatnya daripada 1000 sen tampil sebagai 10.
    expect(decimalsFor('XYZ')).toBe(2)
  })

  it('minorToMajor membagi sesuai desimal mata uangnya', () => {
    // Backend mengirim satuan terkecil: 1480 = ¥1.480, tetapi 2500 = RM25,00.
    expect(minorToMajor(1480, 'JPY')).toBe(1480)
    expect(minorToMajor(2500, 'MYR')).toBe(25)
    expect(minorToMajor(89000, 'IDR')).toBe(89000)
  })

  it('formatMoneyIn tidak terpengaruh mata uang bisnis', () => {
    // Halaman langganan menampilkan harga lokal DAN nominal tagih rupiah di layar
    // yang sama.
    applyBusinessMoney({ currencyCode: 'JPY', decimalDigits: 0 })
    expect(formatMoneyIn(160000, 'IDR')).toContain('160')
  })
})
