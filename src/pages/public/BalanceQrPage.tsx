import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Wallet } from 'lucide-react'
import { checkBalance, getBalanceCheckStore } from '@/api/public'
import { t } from '@/lib/i18n'
import { displayedText as titleCase } from '@/lib/textCase'
import BalanceView from './BalanceView'
import { publicErrorText } from './publicErrors'

/**
 * QR cek saldo toko — satu QR ditempel di kasir untuk semua pelanggan.
 *
 * Pelanggan memasukkan nomor HP dan kode cek saldo 6 angka yang diberikan
 * kasir saat ia didaftarkan. Nomor HP saja tidak cukup: nomor dikenal banyak
 * orang, kodenya yang membuktikan pemiliknya. Server mengunci nomor itu
 * sebentar setelah beberapa kode salah.
 */
export default function BalanceQrPage() {
  const { token = '' } = useParams()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')

  const store = useQuery({
    queryKey: ['balance-check-store', token],
    queryFn: async () => (await getBalanceCheckStore(token)).data.data,
    enabled: !!token,
    retry: false,
  })

  const check = useMutation({
    mutationFn: async () => (await checkBalance(token, { phone: phone.trim(), code: code.trim() })).data.data,
    // Kode tidak disimpan di layar setelah dipakai: HP yang dipinjamkan ke
    // orang lain tidak ikut membawanya.
    onSettled: () => setCode(''),
  })

  if (store.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }
  if (store.isError || !store.data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center mb-4">
          <Wallet size={30} />
        </div>
        <p className="text-sm text-gray-600">{t('bqInvalid')}</p>
      </div>
    )
  }

  if (check.data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 py-6 space-y-4">
          <BalanceView data={check.data} footnote={t('bqFootnote')} />
          <button
            type="button"
            onClick={() => { check.reset(); setPhone('') }}
            className="w-full py-2.5 rounded-xl bg-white ring-1 ring-gray-200 text-sm font-semibold text-gray-700"
          >
            {t('bqAnother')}
          </button>
        </div>
      </div>
    )
  }

  const error = check.isError ? publicErrorText(check.error, 'bqFailed') : null
  const canSubmit = phone.replace(/\D/g, '').length >= 9 && code.replace(/\D/g, '').length === 6 && !check.isPending
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (canSubmit) check.mutate()
  }
  const input = 'w-full px-3 py-2.5 text-sm bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="min-h-screen bg-gray-50">
      <form onSubmit={submit} className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-500">{titleCase(store.data.business_name)}</p>
          <h1 className="text-lg font-semibold text-gray-900">{t('bqTitle')}</h1>
          <p className="text-sm text-gray-600 mt-1">{t('bqIntro')}</p>
        </div>
        <div className="rounded-2xl bg-white border border-gray-200 p-4 space-y-3">
          <div className="space-y-1">
            <label htmlFor="bq-phone" className="block text-xs font-semibold text-gray-500">{t('bqPhone')}</label>
            <input id="bq-phone" value={phone} onChange={(e) => setPhone(e.target.value)}
              inputMode="tel" autoComplete="tel" maxLength={40} placeholder="0812…" className={input} />
          </div>
          <div className="space-y-1">
            <label htmlFor="bq-code" className="block text-xs font-semibold text-gray-500">{t('bqCode')}</label>
            <input id="bq-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••"
              className={`${input} tracking-[0.4em] font-semibold`} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={!canSubmit}
            className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50">
            {check.isPending ? t('bqChecking') : t('bqSubmit')}
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center">{t('bqForgot')}</p>
      </form>
    </div>
  )
}
