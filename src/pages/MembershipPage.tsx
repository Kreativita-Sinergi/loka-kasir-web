import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, ArrowUpCircle, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { getActiveMembership, upgradeMembership } from '@/api/membership'
import { formatDate, formatDateTime, getErrorMessage } from '@/lib/utils'

export default function MembershipPage() {
  const qc = useQueryClient()
  const [upgradeModal, setUpgradeModal] = useState(false)
  const [selectedType, setSelectedType] = useState<'monthly' | 'yearly'>('monthly')

  const { data, isLoading } = useQuery({
    queryKey: ['membership'],
    queryFn: () => getActiveMembership(),
  })

  const membership = data?.data?.data

  const upgradeMut = useMutation({
    mutationFn: (type: 'monthly' | 'yearly') => upgradeMembership(type),
    onSuccess: () => {
      toast.success('Membership Berhasil Di-upgrade!')
      qc.invalidateQueries({ queryKey: ['membership'] })
      setUpgradeModal(false)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const isActive = membership ? new Date(membership.end_date) > new Date() : false

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Membership" subtitle="Kelola Status Berlangganan Bisnis" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Current Membership Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Membership Aktif</p>
              {isLoading ? (
                <div className="h-8 w-32 bg-white/20 rounded animate-pulse mt-2" />
              ) : membership ? (
                <>
                  <h2 className="text-3xl font-bold mt-1 capitalize">{membership.type}</h2>
                  <div className="flex items-center gap-2 mt-3">
                    <Calendar size={14} className="text-blue-200" />
                    <span className="text-blue-100 text-sm">
                      {formatDate(membership.start_date)} – {formatDate(membership.end_date)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-xl font-semibold mt-1 text-blue-200">Tidak Ada Membership Aktif</p>
              )}
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <CreditCard size={24} />
            </div>
          </div>

          {membership && (
            <div className="mt-4 flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${isActive ? 'bg-green-400/30 text-green-100' : 'bg-red-400/30 text-red-100'}`}>
                {isActive ? '● Aktif' : '● Expired'}
              </span>
              {isActive && (
                <span className="text-blue-100 text-xs">
                  Berakhir {formatDateTime(membership.end_date)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Upgrade Options */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Upgrade / Perpanjang Membership</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { type: 'monthly' as const, label: 'Bulanan', duration: '30 hari', price: 'Standard' },
              { type: 'yearly' as const, label: 'Tahunan', duration: '365 hari', price: 'Hemat 20%' },
            ].map((plan) => (
              <div
                key={plan.type}
                onClick={() => { setSelectedType(plan.type); setUpgradeModal(true) }}
                className="border-2 border-gray-100 hover:border-blue-500 rounded-2xl p-5 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-gray-900 text-lg capitalize">{plan.label}</span>
                  {plan.type === 'yearly' && (
                    <span className="text-xs font-semibold bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                      Rekomendasi
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{plan.duration}</p>
                <p className="text-xs text-blue-600 font-medium mt-1">{plan.price}</p>
                <button className="mt-4 w-full py-2 bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
                  <ArrowUpCircle size={15} />
                  Pilih {plan.label}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-sm text-amber-700 font-medium">Informasi</p>
          <p className="text-sm text-amber-600 mt-1">
            Upgrade akan memperpanjang dari tanggal berakhir membership saat ini.
            Jika tidak ada membership aktif, akan dimulai dari sekarang.
          </p>
        </div>
      </div>

      {/* Confirm Modal */}
      <Modal open={upgradeModal} onClose={() => setUpgradeModal(false)} title="Konfirmasi Upgrade" size="sm">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Anda akan mengupgrade membership ke paket{' '}
            <span className="font-semibold text-gray-900 capitalize">{selectedType}</span>.
            {membership && isActive && (
              <> Masa aktif akan diperpanjang dari <span className="font-semibold">{formatDate(membership.end_date)}</span>.</>
            )}
          </p>

          <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
            <Badge variant="blue" className="capitalize">{selectedType}</Badge>
            <span className="text-sm text-blue-700">
              +{selectedType === 'monthly' ? '30 hari' : '365 hari'}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setUpgradeModal(false)}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              onClick={() => upgradeMut.mutate(selectedType)}
              disabled={upgradeMut.isPending}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
            >
              {upgradeMut.isPending ? 'Memproses...' : 'Konfirmasi'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
