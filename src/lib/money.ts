/**
 * Pemformatan uang & tanggal yang mengikuti mata uang bisnis dan bahasa aktif.
 *
 * Sebelum ini `formatCurrency` mengunci `'id-ID'` + `'IDR'`, dan tiga komponen
 * lain menyalin `Intl.NumberFormat('id-ID', …)` sendiri sementara delapan belas
 * tempat memanggil `toLocaleString('id-ID')` langsung di call-site. Berkas ini
 * menjadi satu-satunya tempat yang memutuskan bagaimana angka ditulis.
 *
 * State-nya global dan bisa berubah, seperti `AppFormat` di aplikasi Flutter,
 * dengan alasan yang sama: nilainya berubah dua kali seumur sesi — saat profil
 * bisnis termuat, dan saat pengguna mengganti bahasa — sementara pembacanya
 * ratusan, banyak di antaranya fungsi murni tanpa akses ke store.
 */

/** Locale BCP 47 yang dipakai Intl. Diturunkan dari bahasa + negara bisnis. */
let intlLocale = 'id-ID'
/** Kode ISO 4217 mata uang yang dibukukan bisnis ini. */
let currency = 'IDR'
/** Jumlah angka di belakang koma untuk `currency`. */
let decimals = 0

/**
 * Desimal per mata uang. Cerminan `helper.CurrencyDecimalDigits` di backend dan
 * `AppFormat._decimals` di aplikasi Flutter — ketiganya harus disetel bersamaan
 * bila ada mata uang baru.
 */
const CURRENCY_DECIMALS: Record<string, number> = {
  IDR: 0, JPY: 0, KRW: 0, VND: 0,
  MYR: 2, SGD: 2, THB: 2, CNY: 2, USD: 2, AUD: 2, PHP: 2,
}

/**
 * Locale Intl per bahasa yang kita dukung.
 *
 * Dipakai wilayahnya secara eksplisit ('ms-MY', bukan 'ms') karena Intl memakai
 * wilayah untuk memutuskan pemisah ribuan dan urutan tanggal, dan bahasa tanpa
 * wilayah bisa memberi hasil berbeda antar peramban.
 */
const INTL_LOCALES: Record<string, string> = {
  id: 'id-ID',
  en: 'en-US',
  ms: 'ms-MY',
  ja: 'ja-JP',
}

export function decimalsFor(currencyCode: string): number {
  // Tak dikenal dianggap 2: menampilkan "10.00" untuk yang sebenarnya bulat jauh
  // lebih ringan akibatnya daripada menampilkan 1000 sen sebagai 10.
  return CURRENCY_DECIMALS[currencyCode.toUpperCase()] ?? 2
}

export function intlLocaleFor(language: string): string {
  return INTL_LOCALES[language] ?? INTL_LOCALES.id
}

/** Menerapkan mata uang bisnis. Nilai kosong dibiarkan seperti sebelumnya. */
export function applyBusinessMoney(opts: {
  currencyCode?: string | null
  decimalDigits?: number | null
}) {
  if (!opts.currencyCode) return
  currency = opts.currencyCode.toUpperCase()
  decimals = opts.decimalDigits ?? decimalsFor(currency)
}

/** Mengganti bahasa saja; mata uang tidak disentuh. */
export function applyMoneyLocale(language: string) {
  intlLocale = intlLocaleFor(language)
}

/** Mata uang & locale yang sedang berlaku — untuk komponen yang perlu tahu. */
export function activeMoney() {
  return { intlLocale, currency, decimals }
}

/**
 * Nominal uang lengkap dengan lambang mata uangnya.
 *
 * `Rp89.000` · `¥1,480` · `RM25.00` — pemisah ribuan dan posisi lambangnya
 * ditentukan Intl sesuai locale, bukan ditulis tangan.
 */
export function formatMoney(value: number): string {
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Nominal dalam mata uang tertentu, terlepas dari mata uang bisnis.
 *
 * Dipakai halaman langganan: harga ditampilkan dalam mata uang negara pemilik
 * (`display_currency` dari `/subscription-prices`) sementara tagihannya tetap
 * IDR, dan keduanya harus bisa muncul di layar yang sama.
 */
export function formatMoneyIn(value: number, currencyCode: string): string {
  const d = decimalsFor(currencyCode)
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: currencyCode.toUpperCase(),
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(value)
}

/**
 * Mengubah nominal satuan-terkecil dari API menjadi nilai tampil.
 *
 * Backend mengirim `display_amount` dalam satuan terkecil mata uangnya — 1480
 * untuk ¥1.480, tetapi 2500 untuk RM25,00. Tanpa pembagian ini, harga ringgit
 * akan tampil seratus kali lipat.
 */
export function minorToMajor(amount: number, currencyCode: string): number {
  return amount / 10 ** decimalsFor(currencyCode)
}

/**
 * Kuantitas dan stok — sampai tiga desimal, tanpa nol di belakang.
 *
 * Dipisahkan dari [formatNumber] karena stok bahan baku memang berpecahan
 * (0,25 kg) sementara hitungan transaksi tidak pernah begitu. Pemisah ribuannya
 * tetap mengikuti bahasa: "1.250" dibaca seribu dua ratus lima puluh dalam
 * bahasa Indonesia dan satu koma dua lima dalam bahasa Inggris.
 */
export function formatQuantity(value: number): string {
  return new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 3 }).format(value)
}

/** Angka tanpa lambang mata uang — untuk kuantitas, stok, dan hitungan. */
export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

/** Tanggal singkat, mis. `14 Apr 2025`. */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat(intlLocale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

/** Tanggal beserta jam. */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat(intlLocale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

/**
 * Mata uang yang boleh dipilih pemilik, sejalan dengan `helper.currencyDecimals`
 * di backend dan `AppFormat.supportedCurrencyCodes` di aplikasi kasir.
 *
 * Backend menolak kode di luar daftar ini (`IsSupportedCurrency`), jadi ketiganya
 * harus disetel bersamaan bila ada mata uang baru.
 */
export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_DECIMALS)

/**
 * Lambang mata uang untuk sebuah kode, apa pun bahasa yang sedang aktif.
 *
 * Dipakai pemilih mata uang supaya pemilik melihat lambang yang akan benar-benar
 * muncul di struk — bukan kode ISO yang tidak berarti apa-apa baginya. Intl
 * dipakai alih-alih tabel tulis tangan agar lambangnya konsisten dengan yang
 * dipakai `formatMoney`.
 */
export function symbolFor(currencyCode: string): string {
  try {
    const parts = new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).formatToParts(0)
    return parts.find((p) => p.type === 'currency')?.value ?? currencyCode
  } catch {
    return currencyCode
  }
}
