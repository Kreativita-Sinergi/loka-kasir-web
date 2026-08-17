import { messages, type MessageKey } from './messages'
import { applyMoneyLocale } from './money'

/**
 * Lokalisasi dasbor, tanpa pustaka pihak ketiga.
 *
 * Yang dibutuhkan hanya tiga hal: pencarian kunci dengan cadangan, penyisipan
 * argumen, dan pemberitahuan saat bahasa berganti. Pustaka i18n memberi jauh
 * lebih banyak — pemuatan berkas terpisah, plugin pendeteksi bahasa, format
 * pesan ICU — dengan biaya satu dependensi lagi dan satu format pesan lagi yang
 * harus dipelajari. Isinya muat di satu berkas, jadi ditulis sendiri.
 *
 * Kuncinya bertipe [MessageKey], diturunkan dari katalog bahasa Indonesia. Salah
 * ketik nama kunci gagal saat `tsc`, bukan muncul sebagai teks aneh di layar.
 */

export const SUPPORTED_LOCALES = ['id', 'en', 'ms', 'ja'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

/**
 * Katalog sumber — BUKAN bahasa yang dilihat pengunjung baru.
 *
 * Dipakai `t()` sebagai cadangan untuk kunci yang belum diterjemahkan, karena
 * katalog Indonesia adalah satu-satunya yang dijamin lengkap (lihat
 * `messages.ts`). Bahasa yang ditampilkan pertama kali diputuskan terpisah oleh
 * `initialLocale()` di `store/localeStore.ts`.
 */
export const DEFAULT_LOCALE: Locale = 'id'

/** Nama bahasa ditulis DALAM bahasa itu sendiri. */
export const LOCALE_LABELS: Record<Locale, string> = {
  id: 'Bahasa Indonesia',
  en: 'English',
  ms: 'Bahasa Melayu',
  ja: '日本語',
}

/**
 * Menyaring tag bahasa apa pun menjadi salah satu yang punya terjemahan.
 *
 * `'ja-JP'`, `'ja_JP'`, dan `'JA'` sama-sama menjadi `'ja'`; yang tidak dikenal
 * jatuh ke bahasa bawaan, bukan menghasilkan dasbor setengah kosong.
 */
export function resolveLocale(candidate: string | null | undefined): Locale {
  return matchLocale(candidate) ?? DEFAULT_LOCALE
}

/**
 * Sama seperti [resolveLocale], tetapi menjawab `null` bila tag bahasanya tidak
 * punya terjemahan — bukan diam-diam memilihkan satu.
 *
 * Perbedaannya penting saat menebak bahasa pengunjung yang baru pertama datang:
 * di sana "tidak tahu" harus bisa dibedakan dari "tahu, dan jawabannya bahasa
 * Indonesia", supaya penebaknya bisa mencoba petunjuk berikutnya.
 */
export function matchLocale(candidate: string | null | undefined): Locale | null {
  if (!candidate) return null
  const language = candidate.replace('_', '-').split('-')[0].toLowerCase()
  return (SUPPORTED_LOCALES as readonly string[]).includes(language)
    ? (language as Locale)
    : null
}

let current: Locale = DEFAULT_LOCALE

export function activeLocale(): Locale {
  return current
}

/**
 * Menetapkan bahasa aktif dan menyelaraskan pemformatan angka.
 *
 * Keduanya disetel bersama supaya tidak pernah ada keadaan di mana teksnya sudah
 * bahasa Inggris tetapi angkanya masih memakai pemisah ribuan Indonesia — "12.000"
 * yang terbaca sebagai dua belas.
 */
export function setActiveLocale(locale: Locale) {
  current = locale
  applyMoneyLocale(locale)
  document.documentElement.lang = locale
}

/**
 * Mencari sebuah pesan dan mengisi argumennya.
 *
 * Argumen ditulis sebagai `{nama}` di dalam template. Penanda bernama, bukan
 * posisi, karena urutan kata berbeda antar bahasa: kalimat Jepang sering menaruh
 * angka di tempat yang berbeda dari kalimat Inggris.
 *
 * Kunci yang belum diterjemahkan jatuh ke bahasa Indonesia, bukan kosong.
 */
export function t(key: MessageKey, args?: Record<string, string | number>): string {
  const template = messages[current]?.[key] ?? messages[DEFAULT_LOCALE][key]
  if (!template) return `[${key}]`
  if (!args) return template
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in args ? String(args[name]) : whole,
  )
}
