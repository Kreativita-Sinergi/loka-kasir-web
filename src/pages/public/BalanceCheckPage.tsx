import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownLeft, ArrowUpRight, Star, Wallet } from 'lucide-react'
import { getPublicBalance, type PublicBalanceMovement } from '@/api/public'
import { formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { displayedText as titleCase } from '@/lib/textCase'

/**
 * Jenis baris riwayat. Server menyimpan empat peristiwa dalam dua jenis:
 * "topup" = isi saldo, atau pengembalian dari nota yang batal; "use" =
 * pemakaian belanja, atau penarikan tunai (catatannya diawali "Penarikan").
 */
const labelOf = (m: PublicBalanceMovement) => {
  const notes = m.notes ?? ''
  if (m.type === 'topup') return notes.startsWith('Pengembalian') ? t('balReturn') : t('balTopUp')
  return notes.startsWith('Penarikan') ? t('balWithdraw') : t('balUse')
}

const dateOf = (iso: string) =>
  new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/**
 * Halaman cek saldo yang dibuka pelanggan sendiri dari tautan kiriman kasir.
 *
 * Saldo titipan adalah uang pelanggan yang dipegang toko — ia berhak tahu
 * sisanya tanpa harus bertanya ke kasir. Hanya data pelanggan pemilik tautan
 * yang ditampilkan; tautannya bisa diganti kasir bila terkirim ke orang lain.
 */
export default function BalanceCheckPage() {
  const { token = '' } = useParams()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-balance', token],
    queryFn: async () => (await getPublicBalance(token)).data.data,
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: true,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center mb-4">
          <Wallet size={30} />
        </div>
        <p className="text-sm text-gray-600">{t('balInvalid')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-500">{titleCase(data.business_name)}</p>
          <h1 className="text-lg font-semibold text-gray-900">{titleCase(data.customer_name)}</h1>
        </div>

        <div className="rounded-2xl bg-blue-600 text-white p-5">
          <p className="text-sm text-blue-100">{t('balTitle')}</p>
          <p className="text-3xl font-bold mt-1 tabular-nums">{formatCurrency(data.deposit_balance)}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs">
            <Star size={12} />
            {t('balPoints')}: {data.points_balance.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-200">
          <p className="px-4 pt-4 pb-2 text-sm font-semibold text-gray-900">{t('balHistory')}</p>
          {data.movements.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-gray-500">{t('balEmpty')}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.movements.map((m, i) => {
                const incoming = m.type === 'topup'
                return (
                  <li key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${incoming ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                      {incoming ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{labelOf(m)}</p>
                      <p className="text-xs text-gray-500 truncate">{dateOf(m.created_at)}{m.notes ? ` · ${m.notes}` : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold tabular-nums ${incoming ? 'text-green-600' : 'text-gray-900'}`}>
                        {incoming ? '+' : '−'}{formatCurrency(m.amount)}
                      </p>
                      <p className="text-xs text-gray-500 tabular-nums">{t('balAfter')} {formatCurrency(m.balance_after)}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <p className="text-xs text-gray-500 text-center px-4">{t('balFootnote')}</p>
      </div>
    </div>
  )
}
