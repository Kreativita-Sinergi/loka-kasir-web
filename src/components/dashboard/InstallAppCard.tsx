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

const DISMISS_KEY = 'loka.dashboard.install-app-dismissed'

interface InstallAppCardProps {
  /** Bisnis belum punya transaksi sama sekali — aplikasi kasirnya belum dipakai. */
  show: boolean
}

export default function InstallAppCard({ show }: InstallAppCardProps) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')

  if (!show || dismissed) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="relative bg-card border border-border rounded-2xl p-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('actionHide')}
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
