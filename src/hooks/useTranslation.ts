import { useLocaleStore } from '@/store/localeStore'
import { t as translate } from '@/lib/i18n'
import type { MessageKey } from '@/lib/messages'

/**
 * Memberi fungsi `t` yang ikut merender ulang saat bahasa berganti.
 *
 * `t` dari `lib/i18n` membaca state modul, jadi React tidak tahu kapan hasilnya
 * berubah. Hook ini men-subscribe ke `localeStore` supaya komponen yang
 * memakainya ikut dirender ulang — dan `locale` disertakan di dependensi agar
 * identitas fungsinya berubah bersama bahasanya.
 */
export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale)
  return {
    locale,
    t: (key: MessageKey, args?: Record<string, string | number>) => {
      void locale
      return translate(key, args)
    },
  }
}
