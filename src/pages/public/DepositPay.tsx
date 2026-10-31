import { useState, type FormEvent } from 'react'
import { Wallet } from 'lucide-react'
import type { PublicDepositPay } from '@/api/public'
import { formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'

/**
 * Bayar pakai saldo pelanggan dari HP pembeli — dipakai kartu meja rental dan
 * layar pesanan QR.
 *
 * Bukti pemilik saldonya sama dengan QR cek saldo: nomor HP + kode 6 angka
 * dari kasir. Nomor HP saja tidak pernah cukup — nomor dikenal banyak orang,
 * saldo adalah uang. Kodenya tidak disimpan setelah dipakai.
 */
export default function DepositPayForm({ info, amount, phone, onPhoneChange, pending, error, onSubmit, onCancel }: {
  info: PublicDepositPay
  /** Perkiraan tagihan; kosong bila belum diketahui. */
  amount?: number | null
  phone: string
  onPhoneChange: (value: string) => void
  pending: boolean
  error?: string | null
  onSubmit: (code: string) => void
  onCancel?: () => void
}) {
  const [code, setCode] = useState('')
  const overLimit = !!amount && info.max_per_tx > 0 && amount > info.max_per_tx
  const canSubmit = !pending && !overLimit && phone.replace(/\D/g, '').length >= 9 && code.length === 6
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit(code)
    setCode('')
  }
  const input = 'w-full px-3 py-2.5 text-sm bg-gray-50 rounded-xl ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white'

  return (
    <form onSubmit={submit} className="rounded-2xl ring-1 ring-emerald-200 bg-emerald-50/40 p-3 space-y-2.5 text-left">
      <div className="flex items-start gap-2">
        <Wallet size={18} className="shrink-0 mt-0.5 text-emerald-700" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-800">{t('depositPayButton')}</p>
          <p className="text-xs text-emerald-700/90">{t('depositPayIntro')}</p>
        </div>
      </div>
      {!!amount && <p className="text-sm font-semibold text-gray-900">{t('depositPayAmount', { amount: formatCurrency(amount) })}</p>}
      <input value={phone} onChange={(e) => onPhoneChange(e.target.value)} aria-label={t('bqPhone')}
        placeholder={t('bqPhone')} inputMode="tel" autoComplete="tel" maxLength={20} className={input} />
      <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} aria-label={t('bqCode')}
        placeholder={t('bqCode')} inputMode="numeric" autoComplete="one-time-code" maxLength={6}
        className={`${input} tracking-[0.3em] font-semibold placeholder:tracking-normal placeholder:font-normal`} />
      {overLimit ? (
        <p role="alert" className="text-xs font-medium text-amber-700">{t('depositPayOverLimit', { max: formatCurrency(info.max_per_tx) })}</p>
      ) : (
        <>
          {info.max_per_tx > 0 && <p className="text-[11px] text-gray-500">{t('depositPayMaxHint', { max: formatCurrency(info.max_per_tx) })}</p>}
          {info.min_remaining > 0 && <p className="text-[11px] text-gray-500">{t('depositPayMinHint', { min: formatCurrency(info.min_remaining) })}</p>}
        </>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={pending}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-white text-gray-600 ring-1 ring-gray-200 disabled:opacity-60">
            {t('actionCancel')}
          </button>
        )}
        <button type="submit" disabled={!canSubmit}
          className="flex-[2] rounded-xl py-2.5 text-sm font-semibold bg-emerald-600 text-white active:bg-emerald-700 disabled:opacity-50">
          {pending ? t('depositPayPaying') : t('depositPaySubmit')}
        </button>
      </div>
      <p className="text-[11px] text-gray-500 text-center">{t('bqForgot')}</p>
    </form>
  )
}
