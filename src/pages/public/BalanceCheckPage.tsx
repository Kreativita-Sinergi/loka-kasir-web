import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Wallet } from 'lucide-react'
import { getPublicBalance } from '@/api/public'
import { t } from '@/lib/i18n'
import BalanceView from './BalanceView'

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
        <BalanceView data={data} footnote={t('balFootnote')} />
      </div>
    </div>
  )
}
