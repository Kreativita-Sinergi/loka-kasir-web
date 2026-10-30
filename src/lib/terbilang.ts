import type { Locale } from './i18n'

/**
 * Nilai uang dalam kata — "terbilang" di bawah isian nominal, seperti di form
 * akuntansi yang biasa dipakai pelanggan. Gunanya menangkap salah ketik nol:
 * "1.000.000" dan "10.000.000" mudah tertukar, "satu juta" dan "sepuluh juta"
 * tidak.
 *
 * Bagian pecahan (mata uang bersen) dieja per angka setelah "koma"/"point".
 */

const ID_UNITS = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas']
const ID_DIGITS = ['nol', ...ID_UNITS.slice(1, 10)]

function idWords(n: number): string {
  if (n < 12) return ID_UNITS[n]
  if (n < 20) return `${idWords(n - 10)} belas`
  if (n < 100) return `${idWords(Math.floor(n / 10))} puluh ${idWords(n % 10)}`
  if (n < 200) return `seratus ${idWords(n - 100)}`
  if (n < 1000) return `${idWords(Math.floor(n / 100))} ratus ${idWords(n % 100)}`
  if (n < 2000) return `seribu ${idWords(n - 1000)}`
  const scales: [number, string][] = [[1e12, 'triliun'], [1e9, 'miliar'], [1e6, 'juta'], [1e3, 'ribu']]
  for (const [size, name] of scales) {
    if (n >= size) return `${idWords(Math.floor(n / size))} ${name} ${idWords(n % size)}`
  }
  return ''
}

const EN_SMALL = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const EN_DIGITS = ['zero', ...EN_SMALL.slice(1, 10)]

function enWords(n: number): string {
  if (n < 20) return EN_SMALL[n]
  if (n < 100) return EN_TENS[Math.floor(n / 10)] + (n % 10 ? `-${EN_SMALL[n % 10]}` : '')
  if (n < 1000) return `${EN_SMALL[Math.floor(n / 100)]} hundred ${enWords(n % 100)}`
  const scales: [number, string][] = [[1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']]
  for (const [size, name] of scales) {
    if (n >= size) return `${enWords(Math.floor(n / size))} ${name} ${enWords(n % size)}`
  }
  return ''
}

const tidy = (text: string) => text.replace(/\s+/g, ' ').trim()

/** Bilangan dalam kata, tanpa satuan mata uang. Kosong bila bukan angka. */
export function numberInWords(value: number, locale: Locale, decimals = 0): string {
  if (!Number.isFinite(value)) return ''
  const negative = value < 0
  const fixed = Math.abs(value).toFixed(Math.max(0, decimals))
  const [intPart, fracPart = ''] = fixed.split('.')
  const whole = Number(intPart)
  const en = locale === 'en'
  let words = whole === 0 ? (en ? 'zero' : 'nol') : tidy(en ? enWords(whole) : idWords(whole))
  const fraction = fracPart.replace(/0+$/, '')
  if (fraction) {
    const digits = fraction.split('').map(d => (en ? EN_DIGITS : ID_DIGITS)[Number(d)])
    words += ` ${en ? 'point' : 'koma'} ${digits.join(' ')}`
  }
  return negative ? `minus ${words}` : words
}

/**
 * Nominal dalam kata dengan huruf awal kapital. "rupiah" ditambahkan hanya
 * untuk IDR: mata uang lain sudah tampil dengan simbolnya di isian.
 */
export function amountInWords(value: number, locale: Locale, currency = 'IDR', decimals = 0): string {
  const words = numberInWords(value, locale, decimals)
  if (!words) return ''
  const text = currency === 'IDR' ? `${words} rupiah` : words
  return text.charAt(0).toUpperCase() + text.slice(1)
}
