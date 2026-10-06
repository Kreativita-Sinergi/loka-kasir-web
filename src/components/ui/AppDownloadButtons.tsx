import { Download, Monitor } from 'lucide-react'
import GooglePlayBadge from './GooglePlayBadge'
import { APK_DOWNLOAD_URL, WINDOWS_DOWNLOAD_URL } from '@/lib/constants'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface AppDownloadButtonsProps {
  /** Ikut menawarkan aplikasi Windows (halaman Mulai dan kartu pasang aplikasi). */
  windows?: boolean
  align?: 'start' | 'center'
  className?: string
}

/**
 * Satu baris cara memasang aplikasi: lencana Google Play, tombol Unduh APK,
 * dan (opsional) Windows — semuanya setinggi 44px supaya sejajar. Petunjuk
 * untuk HP tanpa Play Store ditulis sekali di bawah baris, bukan menempel
 * di tiap tombol.
 */
export default function AppDownloadButtons({ windows = false, align = 'start', className }: AppDownloadButtonsProps) {
  const button = 'inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted'
  return (
    <div className={cn(align === 'center' && 'text-center', className)}>
      <div className={cn('flex flex-wrap items-center gap-2.5', align === 'center' && 'justify-center')}>
        <GooglePlayBadge />
        <a href={APK_DOWNLOAD_URL} rel="noopener noreferrer" className={button}>
          <Download size={15} /> {t('apkDownload')}
        </a>
        {windows && (
          <a href={WINDOWS_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className={button}>
            <Monitor size={15} /> Windows
          </a>
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {t('apkNoPlayStore')} {t('apkUseButton')} {t('apkInstallHint')}
      </p>
    </div>
  )
}
