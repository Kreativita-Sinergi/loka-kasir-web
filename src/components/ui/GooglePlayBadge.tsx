import { APP_DOWNLOAD_URL } from '@/lib/constants'
import { activeLocale, t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

// Lencana resmi "Temukan di Google Play", disajikan Google sendiri untuk
// dipasang di situs. Bahasanya mengikuti bahasa dasbor.
const BADGE_BY_LOCALE: Record<string, string> = {
  id: 'https://play.google.com/intl/en_us/badges/static/images/badges/id_badge_web_generic.png',
  en: 'https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png',
}

/**
 * Tautan ke Play Store berupa lencana resmi, bukan tombol teks — lencana itu
 * yang dikenali orang sebagai "unduh aplikasi". Gambar resminya punya ruang
 * kosong di sekeliling, jadi dipasang sedikit lebih tinggi dari tombol biasa
 * dengan margin negatif agar sejajar dengan elemen di sebelahnya.
 */
export default function GooglePlayBadge({ className }: { className?: string }) {
  const src = BADGE_BY_LOCALE[activeLocale()] ?? BADGE_BY_LOCALE.en
  return (
    <a
      href={APP_DOWNLOAD_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('loginDownloadPlay')}
      title={t('loginDownloadPlay')}
      className={cn('inline-flex shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50', className)}
    >
      <img src={src} alt={t('loginDownloadPlay')} className="-m-1.5 h-14 w-auto" />
    </a>
  )
}
