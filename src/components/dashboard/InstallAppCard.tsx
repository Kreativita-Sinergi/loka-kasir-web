import { useState } from 'react'
import { Smartphone, Monitor, X } from 'lucide-react'
import { APP_DOWNLOAD_URL, WINDOWS_DOWNLOAD_URL } from '@/lib/constants'
import { t } from '@/lib/i18n'

/// Ajakan memasang aplikasi kasir.
///
/// Dulu blok ini menempel di layar OTP halaman pendaftaran — tempat yang salah
/// dua kali: ia hanya terlihat bila verifikasi gagal, dan verifikasinya sendiri
/// sudah tidak ada lagi. Beranda adalah tempat yang benar: pemilik baru saja
/// masuk, belum melayani satu pembeli pun, dan di sinilah ia mencari langkah
/// berikutnya.

/// Sejak dismiss-nya berbatas waktu, yang disimpan adalah KAPAN — bukan lagi
/// penanda '1'. Kunci lamanya sengaja ditinggalkan: nilai '1' tidak akan pernah
/// lolos `Number.parseInt` menjadi waktu yang masuk akal, jadi pemilik yang dulu
/// menutup kartunya akan melihatnya lagi sekali — dan itu memang yang kita mau.
const SNOOZE_KEY = 'loka.dashboard.install-app-snoozed-until'

/// Ditutup berarti "jangan sekarang", bukan "jangan pernah".
///
/// Sebelumnya kartu ini hilang selamanya begitu di-X, padahal ia satu-satunya
/// petunjuk di dasbor bahwa berjualan butuh aplikasi terpisah. Pemilik yang
/// menutupnya karena sedang buru-buru kehilangan petunjuk itu untuk seterusnya
/// — justru pemilik yang paling butuh diingatkan, karena transaksinya masih nol.
const SNOOZE_DAYS = 7

interface InstallAppCardProps {
  /** Bisnis belum punya transaksi sama sekali — aplikasi kasirnya belum dipakai. */
  show: boolean
}

export default function InstallAppCard({ show }: InstallAppCardProps) {
  // Masa tunggunya dibaca sekali saat kartu dipasang, bukan di setiap render:
  // 7 hari tidak akan habis di tengah satu kunjungan dasbor, dan membaca jam
  // saat render membuat hasilnya bergantung pada kapan React kebetulan
  // menggambar ulang.
  const [hidden, setHidden] = useState(() => {
    // NaN (belum pernah ditutup, atau penanda lama '1') ikut tersaring di sini:
    // perbandingan apa pun dengan NaN bernilai false, jadi kartunya tampil.
    const until = Number.parseInt(localStorage.getItem(SNOOZE_KEY) ?? '', 10)
    return until > Date.now()
  })

  if (!show || hidden) return null

  const dismiss = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000))
    setHidden(true)
  }

  return (
    <div className="relative bg-card border border-border rounded-2xl p-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('laterMaybe')}
        className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground transition"
      >
        <X size={15} />
      </button>

      <p className="text-sm font-bold text-foreground pr-7">
        {t('installAppTitle')}
      </p>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
        {t('installAppBody')}
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mt-3">
        <a
          href={APP_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 border border-border hover:bg-muted text-foreground font-semibold py-2.5 rounded-xl transition text-sm"
        >
          <Smartphone size={16} /> Android
        </a>
        <a
          href={WINDOWS_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 border border-border hover:bg-muted text-foreground font-semibold py-2.5 rounded-xl transition text-sm"
        >
          <Monitor size={16} /> Windows
        </a>
      </div>
    </div>
  )
}
