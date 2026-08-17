import { useEffect, useRef, useState } from 'react'
import { Check, Coins } from 'lucide-react'
import toast from 'react-hot-toast'
import { updateBusinessCurrency } from '@/api/business'
import { useTranslation } from '@/hooks/useTranslation'
import { activeMoney, applyBusinessMoney, decimalsFor, formatMoney, SUPPORTED_CURRENCIES, symbolFor } from '@/lib/money'
import { getErrorMessage } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import Modal from '@/components/ui/Modal'

/**
 * Pemilih mata uang bisnis — akses cepat dari header.
 *
 * Sengaja TIDAK dibuat seperti pemilih bahasa, meski keduanya duduk
 * berdampingan. Bahasa hanya mengubah cara teks dibaca dan bisa dibalik tanpa
 * akibat; mata uang mengubah arti setiap angka yang sudah tersimpan.
 *
 * Server hanya menukar kodenya (lihat `updateBusinessCurrency`) — nominalnya
 * tidak dikonversi. Produk seharga 15000 tetap 15000: sebelumnya dibaca
 * Rp15.000, sesudahnya ¥15,000. Karena itu pemilihannya melewati satu langkah
 * konfirmasi yang menunjukkan angka contoh sebelum dan sesudah, bukan berubah
 * begitu ditekan.
 *
 * Hanya Owner yang melihatnya, mengikuti `AuthorizeOwner` di server. Peran lain
 * tidak diberi tombol yang pasti ditolak.
 */
export default function CurrencyMenu({ className }: { className?: string }) {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)
  const token = useAuthStore((s) => s.token)

  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = activeMoney().currency

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Peran selain Owner tidak akan diizinkan server, jadi tombolnya tidak dibuat.
  if (user?.role?.code !== 'OWNER') return null

  const confirm = async () => {
    if (!pending || !user || !token) return
    setSaving(true)
    try {
      const res = await updateBusinessCurrency(pending)
      const business = res.data.data
      // Diterapkan langsung supaya angka di layar ikut berubah tanpa memuat
      // ulang; nilai dari server diutamakan agar tetap sejalan dengan database.
      applyBusinessMoney({
        currencyCode: business?.currency_code ?? pending,
        decimalDigits: business?.decimal_digits ?? decimalsFor(pending),
      })
      // HANYA dua kolom yang endpoint ini benar-benar ubah yang disalin.
      //
      // Awalnya ini penambal: repositori tidak memuat relasi membership di jalur
      // ini, sementara DTO-nya menulis `membership` tanpa omitempty, jadi
      // responsnya selalu membawa `membership: null` — dan menimpakan itu
      // melempar pemilik yang masih dalam masa percobaan ke halaman Langganan
      // tepat setelah ia mengganti mata uang. Backend sudah diperbaiki.
      //
      // Penyalinan terbatasnya tetap dipertahankan, kini atas alasan yang lebih
      // baik: mengganti mata uang bukan alasan untuk menyegarkan seluruh profil
      // bisnis di store. Yang berubah dua kolom, jadi dua kolom itu saja yang
      // ditulis.
      setAuth(
        {
          ...user,
          business: {
            ...user.business,
            currency_code: business?.currency_code ?? pending,
            decimal_digits: business?.decimal_digits ?? decimalsFor(pending),
          },
        },
        token,
      )
      toast.success(t('currencyUpdated'))
      setPending(null)
      setOpen(false)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div ref={ref} className={cn('relative', className)}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          title={t('currencyBusiness')}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
        >
          <Coins size={18} />
          <span className="text-sm font-medium">{current}</span>
        </button>

        {open && (
          <div
            role="listbox"
            className="absolute right-0 top-full mt-1 min-w-52 max-h-80 overflow-y-auto bg-card border border-border rounded-xl shadow-lg z-50"
          >
            <p className="px-3 pt-3 pb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              {t('currencyBusiness')}
            </p>
            {SUPPORTED_CURRENCIES.map((code) => (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={code === current}
                onClick={() => (code === current ? setOpen(false) : setPending(code))}
                className={cn(
                  'w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm text-left transition',
                  code === current
                    ? 'text-primary font-semibold bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                <span>
                  {code} <span className="text-muted-foreground">({symbolFor(code)})</span>
                </span>
                {code === current && <Check size={14} className="shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {pending && (
        <Modal open onClose={() => setPending(null)} title={t('currencyChangeTitle')} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('currencyChangeWarning')}
            </p>

            {/* Contoh konkret mengalahkan penjelasan: pemilik melihat angka yang
                sama dibaca dua cara, dan langsung paham bahwa yang berubah
                hanyalah pembacaannya. */}
            <div className="rounded-xl border border-border bg-muted px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('currencyBefore')}</span>
                <span className="font-semibold text-foreground">{formatMoney(15000)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('currencyAfter')}</span>
                <span className="font-semibold text-foreground">
                  {new Intl.NumberFormat(activeMoney().intlLocale, {
                    style: 'currency',
                    currency: pending,
                    minimumFractionDigits: decimalsFor(pending),
                    maximumFractionDigits: decimalsFor(pending),
                  }).format(15000)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPending(null)}
                disabled={saving}
                className="flex-1 py-2.5 border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted transition disabled:opacity-60"
              >
                {t('actionCancel')}
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={saving}
                className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-60"
              >
                {saving ? t('saving') : t('currencyChangeConfirm', { code: pending })}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
