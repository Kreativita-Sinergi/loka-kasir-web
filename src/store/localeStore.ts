import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { matchLocale, setActiveLocale, type Locale } from '@/lib/i18n'

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

/**
 * Bahasa dasbor.
 *
 * Disimpan terpisah dari `authStore` dan sengaja TIDAK dibersihkan saat logout:
 * layar login juga perlu bahasa yang benar, dan itulah layar tempat pengguna
 * paling butuh membaca instruksinya. Pola persist-nya sama seperti `themeStore`.
 *
 * Bawaannya ditebak dari peramban dan lokasi — pengguna berbahasa Jepang tidak
 * perlu menemukan menu Pengaturan lebih dulu untuk bisa membaca dasbornya.
 */
export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: initialLocale(),
      setLocale: (locale) => {
        setActiveLocale(locale)
        set({ locale })
      },
    }),
    {
      name: 'loka-locale',
      onRehydrateStorage: () => (state) => {
        // Nilai tersimpan diterapkan ke lapisan i18n saat rehidrasi. Tanpa ini,
        // store-nya ingat pilihan pengguna tetapi `t()` tetap memakai bawaan —
        // teks dan angka jadi berbeda bahasa sampai pengguna menggantinya lagi.
        setActiveLocale(state?.locale ?? initialLocale())
      },
    },
  ),
)

/**
 * Zona waktu yang hanya ada di satu negara, dipetakan ke bahasanya.
 *
 * Dipakai sebagai petunjuk LOKASI, bukan preferensi: pemilik warung di Jakarta
 * yang memasang Windows berbahasa Prancis tetap lebih terbantu oleh dasbor
 * berbahasa Indonesia daripada berbahasa Inggris.
 *
 * Sengaja hanya zona yang tidak ambigu. `Asia/Kuala_Lumpur` menunjuk Malaysia
 * dan tidak ke tempat lain; sesuatu seperti `Asia/Bangkok` — yang juga dipakai
 * sebagian Vietnam dan Kamboja — tidak akan menolong dan tidak dimasukkan.
 */
const TIMEZONE_LOCALE: Record<string, Locale> = {
  'Asia/Jakarta': 'id',
  'Asia/Pontianak': 'id',
  'Asia/Makassar': 'id',
  'Asia/Jayapura': 'id',
  'Asia/Kuala_Lumpur': 'ms',
  'Asia/Kuching': 'ms',
  'Asia/Tokyo': 'ja',
}

/**
 * Bahasa untuk pengunjung yang belum pernah memilih apa pun.
 *
 * Urutannya: bahasa peramban → negara dari zona waktu → bahasa Inggris.
 *
 * Bahasa peramban didahulukan karena ia satu-satunya petunjuk yang benar-benar
 * DIPILIH pengguna. Zona waktu baru dilihat ketika bahasa perambannya tidak
 * kami punya terjemahannya — di sanalah lokasi menjadi tebakan terbaik yang
 * tersisa.
 *
 * Cadangan terakhirnya bahasa Inggris, bukan Indonesia. Dasbor ini kini dibuka
 * dari Jepang dan Malaysia juga, dan menyambut mereka dengan bahasa yang tidak
 * mereka mengerti membuat layar masuk terasa seperti salah alamat — sementara
 * pengguna Indonesia hampir selalu sudah tertangkap oleh salah satu dari dua
 * petunjuk di atas.
 */
export function initialLocale(): Locale {
  if (typeof navigator !== 'undefined') {
    // `languages` menghormati urutan pilihan pengguna; `language` hanya yang teratas.
    for (const tag of navigator.languages ?? [navigator.language]) {
      const matched = matchLocale(tag)
      if (matched) return matched
    }
  }
  return countryLocale() ?? 'en'
}

/** Bahasa yang disiratkan zona waktu perangkat, bila zonanya tidak ambigu. */
function countryLocale(): Locale | null {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return TIMEZONE_LOCALE[zone] ?? null
  } catch {
    // Peramban lama tanpa `resolvedOptions().timeZone`. Bukan alasan untuk gagal.
    return null
  }
}
