import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Store, MapPin } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { getBusinessById } from '@/api/business'
import { formatDate } from '@/lib/utils'

interface Props {
  businessId: string | null
  onClose: () => void
}

export default function BusinessDetailModal({ businessId, onClose }: Props) {
  const navigate = useNavigate()

  const { data: detail } = useQuery({
    queryKey: ['business', businessId],
    queryFn: () => getBusinessById(businessId!),
    enabled: !!businessId,
  })

  const biz = detail?.data?.data

  return (
    <Modal open={!!businessId} onClose={onClose} title="Detail Bisnis">
      {biz ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
              {biz.image
                ? <img src={biz.image} className="w-full h-full object-cover rounded-2xl" alt="" />
                : <Store size={28} className="text-blue-400" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 capitalize">{biz.business_name}</h3>
              <p className="text-sm text-gray-500">{biz.owner_name}</p>
              <Badge variant={biz.is_active ? 'green' : 'red'} className="mt-1">
                {biz.is_active ? 'Aktif' : 'Nonaktif'}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Tipe Bisnis</p>
              <p className="font-medium">{biz.business_type?.name ?? '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Archetype</p>
              <p className="font-medium">{biz.business_type?.order_archetype ?? '-'}</p>
            </div>
            {biz.email && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Email</p>
                <p className="font-medium">{biz.email}</p>
              </div>
            )}
            {biz.provinsi && (
              <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2">
                <MapPin size={14} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400 mb-1">Lokasi</p>
                  <p className="font-medium">{[biz.kecamatan, biz.kota, biz.provinsi].filter(Boolean).join(', ')}</p>
                </div>
              </div>
            )}
          </div>

          {biz.membership && (
            <div className="border border-gray-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Membership</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Tipe</p>
                  <p className="font-semibold capitalize">{biz.membership.type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Status</p>
                  <Badge variant={new Date(biz.membership.end_date) > new Date() ? 'green' : 'red'}>
                    {new Date(biz.membership.end_date) > new Date() ? 'Aktif' : 'Expired'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Mulai</p>
                  <p className="font-medium">{formatDate(biz.membership.start_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Berakhir</p>
                  <p className="font-medium">{formatDate(biz.membership.end_date)}</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => { onClose(); navigate('/membership') }}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
          >
            Kelola Membership
          </button>
        </div>
      ) : (
        <div className="py-8 text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}
    </Modal>
  )
}
