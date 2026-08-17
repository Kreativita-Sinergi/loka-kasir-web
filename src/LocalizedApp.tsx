import { useEffect, useRef } from 'react'
import App from './App'
import { useLocaleStore } from './store/localeStore'
import { useAuthStore } from './store/authStore'
import { updateBusinessLocale } from './api/business'

/**
 * Menggambar ulang seluruh aplikasi saat bahasa berganti.
 *
 * `t()` membaca variabel modul, bukan context React, jadi mengganti bahasa
 * tidak membuat komponen mana pun ikut dirender ulang — sebelum ini hanya
 * pemilih bahasanya sendiri yang berubah, sementara seluruh dasbor tetap
 * berbahasa lama sampai pengguna berpindah halaman. `key` di sini memaksa
 * pohonnya dibangun ulang, yang membuat setiap `t()` dibaca ulang.
 *
 * Alternatifnya — React context untuk terjemahan — berarti mengubah setiap
 * pemanggil `t()` menjadi hook, termasuk yang berada di luar komponen (peta
 * navigasi, pemeta pesan galat). Bahasa berganti paling banyak sekali dalam
 * satu sesi; membangun ulang pohon pada saat itu jauh lebih murah daripada
 * biaya perubahan tersebut.
 */
export default function LocalizedApp() {
  const locale = useLocaleStore((s) => s.locale)
  const user = useAuthStore((s) => s.user)
  const business = user?.business
  const synced = useRef<string | null>(null)

  /**
   * Menyelaraskan bahasa bisnis dengan bahasa dasbor, sekali per sesi.
   *
   * Pemilih bahasa sudah mengirimkannya saat bahasanya DIGANTI, tapi itu tidak
   * menolong pemilik yang memilih bahasanya sebelum penyelarasan ini ada: ia
   * tidak akan menggantinya lagi, sehingga kolom `locale` bisnisnya tetap
   * berisi nilai bawaan negara dan seluruh pemberitahuannya — yang dirakit di
   * server — tetap berbahasa Indonesia selamanya.
   *
   * Hanya dikirim bila benar-benar berbeda, dan hanya oleh Owner (server juga
   * membatasinya). `synced` menahan pengiriman berulang untuk nilai yang sama,
   * karena efek ini ikut berjalan setiap kali profil di store disegarkan.
   */
  useEffect(() => {
    if (user?.role?.code !== 'OWNER') return
    if (!business?.locale || business.locale === locale) return
    if (synced.current === locale) return
    synced.current = locale
    // Kegagalannya dibiarkan senyap: ini penyelarasan latar yang tidak diminta
    // pengguna, dan dasbornya sendiri sudah berbahasa benar.
    updateBusinessLocale(locale).catch(() => {})
  }, [locale, business?.locale, user?.role?.code])

  return <App key={locale} />
}
