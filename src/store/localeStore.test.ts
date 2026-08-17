import { describe, it, expect, afterEach, vi } from 'vitest'
import { initialLocale } from './localeStore'

/**
 * Menyetel bahasa peramban dan zona waktu perangkat untuk satu pemeriksaan.
 *
 * `navigator.languages` hanya bisa dibaca, jadi diganti lewat defineProperty;
 * zona waktunya disuntik dengan menambal `Intl.DateTimeFormat`.
 */
function pretendDevice(languages: string[], timeZone: string) {
  Object.defineProperty(navigator, 'languages', { value: languages, configurable: true })
  Object.defineProperty(navigator, 'language', { value: languages[0] ?? '', configurable: true })
  vi.spyOn(Intl, 'DateTimeFormat').mockReturnValue({
    resolvedOptions: () => ({ timeZone }),
  } as unknown as Intl.DateTimeFormat)
}

afterEach(() => vi.restoreAllMocks())

describe('initialLocale', () => {
  it('mengikuti bahasa peramban bila kami punya terjemahannya', () => {
    pretendDevice(['ja-JP'], 'Asia/Tokyo')
    expect(initialLocale()).toBe('ja')

    pretendDevice(['ms-MY'], 'Asia/Kuala_Lumpur')
    expect(initialLocale()).toBe('ms')

    pretendDevice(['id-ID'], 'Asia/Jakarta')
    expect(initialLocale()).toBe('id')
  })

  it('menghormati urutan pilihan bahasa, bukan hanya yang teratas', () => {
    // Peramban berbahasa Prancis yang menaruh Jepang sebagai pilihan kedua.
    pretendDevice(['fr-FR', 'ja-JP'], 'Europe/Paris')
    expect(initialLocale()).toBe('ja')
  })

  it('jatuh ke zona waktu ketika bahasa perambannya tidak kami punya', () => {
    // Pemilik warung di Jakarta dengan perangkat berbahasa Prancis: lokasinya
    // adalah petunjuk terbaik yang tersisa, dan jawabannya bahasa Indonesia.
    pretendDevice(['fr-FR'], 'Asia/Jakarta')
    expect(initialLocale()).toBe('id')

    pretendDevice(['de-DE'], 'Asia/Kuching')
    expect(initialLocale()).toBe('ms')
  })

  it('memakai bahasa Inggris bila kedua petunjuknya tidak menolong', () => {
    pretendDevice(['de-DE'], 'Europe/Berlin')
    expect(initialLocale()).toBe('en')
  })

  it('TIDAK lagi memilih bahasa Indonesia untuk pengunjung yang tak dikenal', () => {
    // Inilah perilaku lamanya, dan justru itu yang membuat layar masuk terasa
    // salah alamat bagi pengunjung dari Jepang dan Malaysia.
    pretendDevice([], 'Europe/Berlin')
    expect(initialLocale()).not.toBe('id')
  })

  it('tidak gagal di peramban tanpa data zona waktu', () => {
    Object.defineProperty(navigator, 'languages', { value: ['de-DE'], configurable: true })
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('resolvedOptions tidak tersedia')
    })
    expect(initialLocale()).toBe('en')
  })
})
