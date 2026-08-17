import { Languages } from 'lucide-react'
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@/lib/i18n'
import { useLocaleStore } from '@/store/localeStore'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

/**
 * Pemilih bahasa dasbor.
 *
 * Nama tiap bahasa ditulis DALAM bahasa itu sendiri ("日本語", bukan "Jepang").
 * Pengguna yang dasbornya tanpa sengaja berbahasa Jepang tidak bisa membaca
 * daftar berbahasa Indonesia untuk keluar dari keadaan itu — nama asli adalah
 * satu-satunya label yang tetap terbaca dari bahasa mana pun.
 */
export default function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)
  const { t } = useTranslation()

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2">
        <Languages size={15} className="text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">{t('language')}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {SUPPORTED_LOCALES.map((code: Locale) => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={locale === code}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg border transition',
              locale === code
                ? 'border-primary bg-primary/10 text-primary font-semibold'
                : 'border-border bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {LOCALE_LABELS[code]}
          </button>
        ))}
      </div>
    </div>
  )
}
