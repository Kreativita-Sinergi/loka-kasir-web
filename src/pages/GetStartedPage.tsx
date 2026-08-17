import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { Smartphone, Monitor, CheckCircle2, ArrowRight } from 'lucide-react'
import LanguageMenu from '@/components/ui/LanguageMenu'
import { APP_DOWNLOAD_URL, WINDOWS_DOWNLOAD_URL } from '@/lib/constants'
import { t } from '@/lib/i18n'

/**
 * Langkah kedua pendaftaran: memasang aplikasi kasirnya.
 *
 * Dasbor ini tidak bisa melayani pembeli — POS sudah sepenuhnya pindah ke
 * aplikasi (lihat `PosRemovedRedirect` di `App.tsx`). Artinya pemilik yang baru
 * mendaftar lewat browser punya akun yang lengkap tetapi belum bisa berjualan,
 * dan sebelum halaman ini ada ia mendarat langsung di beranda — satu layar
 * penuh menu, tanpa satu pun kalimat yang memberitahunya apa langkah
 * berikutnya. `InstallAppCard` di beranda memang menutupi sebagian, tetapi ia
 * satu kartu di antara banyak hal lain; detik paling tinggi niat pemilik adalah
 * tepat setelah ia menekan "Daftar", bukan nanti.
 *
 * Karena itu halaman ini berdiri sendiri tanpa `MainLayout`: tidak ada sidebar
 * yang menawarkan dua puluh tujuan lain.
 *
 * QR-nya bukan hiasan. Mayoritas pendaftar web datang dari laptop, sementara
 * aplikasinya dipasang di HP — tanpa QR, pemilik harus mengetik ulang alamatnya
 * di perangkat lain, dan di situlah ia berhenti.
 */
export default function GetStartedPage() {
  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => {
    let active = true
    QRCode.toDataURL(APP_DOWNLOAD_URL, { width: 512, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => { if (active) setQrDataUrl(url) })
      // QR gagal dibuat bukan alasan menahan halaman ini: tombol unduh di
      // bawahnya tetap berfungsi, jadi blok QR-nya cukup menghilang.
      .catch(() => { if (active) setQrDataUrl('') })
    return () => { active = false }
  }, [])

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-5 sm:p-8 relative">
      <LanguageMenu className="absolute top-4 right-4" />

      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <img src="/logo.svg" alt="Loka Kasir" className="h-9 w-auto mx-auto mb-5" />

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={13} /> {t('onboardAccountReady')}
          </span>

          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-foreground leading-tight">
            {t('onboardTitle')}
          </h1>
          <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
            {t('onboardSubtitle')}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          {/* QR hanya masuk akal bila dilihat dari perangkat LAIN — di layar HP
              yang sedang dipegang, ia justru membingungkan. */}
          {qrDataUrl && (
            <div className="hidden sm:block text-center pb-6 mb-6 border-b border-border">
              <img
                src={qrDataUrl}
                alt={t('onboardScanTitle')}
                className="h-44 w-44 mx-auto rounded-xl border border-border bg-white p-2"
              />
              <p className="mt-4 text-sm font-bold text-foreground">{t('onboardScanTitle')}</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {t('onboardScanBody')}
              </p>
            </div>
          )}

          <p className="text-xs font-semibold text-muted-foreground text-center mb-3">
            {t('onboardDownloadDirect')}
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <a
              href={APP_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition text-sm"
            >
              <Smartphone size={16} /> Android
            </a>
            <a
              href={WINDOWS_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 border border-border hover:bg-muted text-foreground font-semibold py-3 rounded-xl transition text-sm"
            >
              <Monitor size={16} /> Windows
            </a>
          </div>

          <p className="mt-4 text-xs text-muted-foreground text-center leading-relaxed">
            {t('onboardSameAccount')}
          </p>
        </div>

        <div className="text-center mt-5">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition"
          >
            {t('onboardSkip')} <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}
