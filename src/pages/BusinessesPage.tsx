import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, Store, MapPin, Eye } from 'lucide-react'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { getBusinesses, getBusinessById } from '@/api/business'
import type { Business } from '@/types'
import { formatDate } from '@/lib/utils'

export default function BusinessesPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['businesses', { page, limit: 10, search }],
    queryFn: () => getBusinesses({ page, limit: 10, search: search || undefined }),
  })

  const { data: detail } = useQuery({
    queryKey: ['business', selectedId],
    queryFn: () => getBusinessById(selectedId!),
    enabled: !!selectedId,
  })

  const businesses = data?.data?.data?.data ?? []
  const pagination = data?.data?.data?.pagination
  const biz = detail?.data?.data

  const columns = [
    {
      key: 'business_name',
      label: 'Bisnis',
      render: (row: Business) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <Store size={14} className="text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 capitalize">{row.business_name}</p>
            <p className="text-xs text-gray-400">{row.owner_name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'business_type',
      label: 'Tipe',
      render: (row: Business) => (
        <span className="text-sm text-gray-600">{row.business_type?.name ?? '-'}</span>
      ),
    },
    {
      key: 'membership',
      label: 'Membership',
      render: (row: Business) => {
        const m = row.membership
        if (!m) return <Badge variant="gray">Tidak ada</Badge>
        const expired = new Date(m.end_date) < new Date()
        return (
          <div>
            <Badge variant={expired ? 'red' : 'green'}>
              {expired ? 'Expired' : 'Aktif'} – {m.type}
            </Badge>
            <p className="text-xs text-gray-400 mt-0.5">s/d {formatDate(m.end_date)}</p>
          </div>
        )
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (row: Business) => (
        <Badge variant={row.is_active ? 'green' : 'red'}>
          {row.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row: Business) => (
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedId(row.id) }}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
        >
          <Eye size={15} />
        </button>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Bisnis" subtitle="Kelola semua bisnis terdaftar" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100">
          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari bisnis..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-sm text-gray-500 shrink-0">
              Total: <span className="font-semibold text-gray-900">{pagination?.total ?? 0}</span>
            </p>
          </div>

          <DataTable
            columns={columns as never[]}
            data={businesses as never[]}
            loading={isLoading}
            onRowClick={(row) => setSelectedId((row as Business).id)}
          />
          <Pagination
            page={page}
            total={pagination?.total ?? 0}
            limit={10}
            onChange={setPage}
          />
        </div>
      </div>

      {/* Detail Modal */}
      <Modal open={!!selectedId} onClose={() => setSelectedId(null)} title="Detail Bisnis">
        {biz ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
                {biz.image ? (
                  <img src={biz.image} className="w-full h-full object-cover rounded-2xl" alt="" />
                ) : (
                  <Store size={28} className="text-blue-400" />
                )}
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
              onClick={() => { setSelectedId(null); navigate('/membership') }}
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
    </div>
  )
}
