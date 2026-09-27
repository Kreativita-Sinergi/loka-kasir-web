import { Download } from 'lucide-react'
import { APK_DOWNLOAD_URL } from '@/lib/constants'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/// Jalan kedua untuk HP Android tanpa Google Play — terutama Huawei, yang
/// tombol "Android" ke Play Store-nya berujung di halaman yang tidak bisa
/// dibuka. Sengaja kecil di bawah tombol utama: pengguna yang punya Play Store
/// tetap sebaiknya memasang dari sana supaya pembaruannya otomatis.
export default function ApkDownloadLink({ className }: { className?: string }) {
  return (
    <p className={cn('text-xs text-muted-foreground text-center leading-relaxed', className)}>
      {t('apkNoPlayStore')}{' '}
      <a
        href={APK_DOWNLOAD_URL}
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
      >
        <Download size={12} /> {t('apkDownload')}
      </a>
      <span className="block">{t('apkInstallHint')}</span>
    </p>
  )
}
