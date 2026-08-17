import { useEffect, useRef, useState } from 'react'
import { Check, Globe } from 'lucide-react'
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@/lib/i18n'
import { useLocaleStore } from '@/store/localeStore'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import { updateBusinessLocale } from '@/api/business'
import { useAuthStore } from '@/store/authStore'

/**
 * Pemilih bahasa ringkas, untuk layar SEBELUM masuk.
 *
 * Kenapa perlu ada di sini, bukan cukup di Pengaturan: Pengaturan berada di
 * balik layar masuk. Pengunjung yang mendapat dasbor dalam bahasa yang tidak ia
 * mengerti — karena tebakan dari peramban atau zona waktu meleset — tidak punya
 * jalan untuk memperbaikinya sebelum ia berhasil masuk. Ia harus bisa membaca
 * instruksinya justru pada saat ia belum bisa mencapai Pengaturan.
 *
 * Nama bahasa ditulis DALAM bahasa itu sendiri ("日本語", bukan "Jepang"): itu
 * satu-satunya label yang tetap terbaca dari bahasa mana pun. Bentuk panjangnya
 * ada di [LanguageSwitcher], dipakai di halaman Pengaturan.
 */
export default function LanguageMenu({ className }: { className?: string }) {
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  /**
   * Menerapkan bahasa layar, lalu — khusus Owner — ikut menyimpannya sebagai
   * bahasa bisnis.
   *
   * Dua hal berbeda yang disetel bersamaan karena satu penekanan tombol:
   * bahasa layar tinggal di peramban ini, bahasa bisnis tinggal di server dan
   * menentukan bahasa pemberitahuan serta email yang diterima SEMUA orang di
   * bisnis itu. Tanpa langkah kedua, pemilik yang memindahkan dasbornya ke
   * bahasa Jepang tetap menerima pemberitahuan berbahasa Indonesia.
   *
   * Hanya Owner, mengikuti pembatasan server: kasir yang lebih nyaman membaca
   * bahasa Melayu tidak boleh mengubah bahasa pemberitahuan orang lain.
   *
   * Kegagalannya sengaja dibiarkan senyap. Bahasa layarnya sudah berpindah dan
   * itu yang diminta pengguna; memunculkan pesan galat untuk penyimpanan
   * sampingan yang tidak ia sadari hanya membuat tindakan yang berhasil terasa
   * gagal.
   */
  const apply = (code: Locale) => {
    setLocale(code)
    setOpen(false)
    if (user?.role?.code === 'OWNER') {
      updateBusinessLocale(code).catch(() => {})
    }
  }

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t('language')}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
      >
        <Globe size={18} />
        {/* Label memakai bahasa yang SEDANG aktif — pengguna melihat ke bahasa
            mana ia sedang berada, bukan sekadar bahwa tombolnya bisa ditekan. */}
        <span className="text-sm font-medium">{LOCALE_LABELS[locale]}</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1 min-w-44 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
        >
          {SUPPORTED_LOCALES.map((code: Locale) => (
            <button
              key={code}
              type="button"
              role="option"
              aria-selected={locale === code}
              onClick={() => apply(code)}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm text-left transition',
                locale === code
                  ? 'text-primary font-semibold bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <span>{LOCALE_LABELS[code]}</span>
              {locale === code && <Check size={14} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
