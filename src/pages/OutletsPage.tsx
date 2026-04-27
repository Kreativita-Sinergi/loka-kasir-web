import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Store, Phone, MapPin, Pencil, Trash2, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import OutletFormModal from '@/components/outlets/OutletFormModal'
import OutletQuotaBanner from '@/components/outlets/OutletQuotaBanner'
import { getOutletsByBusiness, deleteOutlet } from '@/api/outlets'
import { useAuthStore } from '@/store/authStore'
import type { Outlet, OutletSubscriptionStatus } from '@/types'
import { getErrorMessage } from '@/lib/utils'

const subscriptionStatusLabel: Record<OutletSubscriptionStatus, string> = {
  active: 'Aktif', trial: 'Aktif', expired: 'Kadaluarsa', inactive: 'Nonaktif',
}
const subscriptionStatusVariant: Record<OutletSubscriptionStatus, 'green' | 'yellow' | 'red' | 'gray'> = {
  active: 'green', trial: 'green', expired: 'red', inactive: 'gray',
}

function isOutletQuotaFull(membershipTier: string | undefined, outletCount: number): boolean {
  if (!membershipTier) return false
  if (membershipTier === 'lite' || membershipTier === 'trial') return outletCount >= 1
  return false
}

export default function OutletsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const businessId = user?.business?.id ?? ''
  const membershipTier = user?.business?.membership?.tier

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editOutlet, setEditOutlet] = useState<Outlet | null>(null)

  const { data: outletData, isLoading } = useQuery({
    queryKey: ['outlets', businessId, { page, limit: 10, search }],
    queryFn: () => getOutletsByBusiness(businessId, { page, limit: 10, search: search || undefined }),
    enabled: !!businessId,
  })
  const outlets = outletData?.data?.data ?? []
  const pagination = outletData?.data?.pagination
  const totalOutlets = pagination?.total ?? 0
  const quotaFull = isOutletQuotaFull(membershipTier, totalOutlets)

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteOutlet(id),
    onSuccess: () => { toast.success('Outlet Dihapus'); qc.invalidateQueries({ queryKey: ['outlets', businessId] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditOutlet(null); setShowForm(true) }
  const openEdit = (outlet: Outlet) => { setEditOutlet(outlet); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditOutlet(null) }

  const handleDelete = (outlet: Outlet) => {
    if (!confirm(`Hapus outlet "${outlet.name}"?`)) return
    deleteMut.mutate(outlet.id)
  }

  const columns = [
    {
      key: 'name',
      label: 'Outlet',
      render: (row: Outlet) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
            <Store size={14} className="text-indigo-600" />
          </div>
          <p className="font-medium text-gray-900">{row.name}</p>
        </div>
      ),
    },
    {
      key: 'address',
      label: 'Alamat',
      render: (row: Outlet) => (
        <span className="text-sm text-gray-500 flex items-center gap-1">
          {row.address ? <><MapPin size={12} className="shrink-0" />{row.address}</> : <span className="text-gray-300">—</span>}
        </span>
      ),
    },
    {
      key: 'phone',
      label: 'Telepon',
      render: (row: Outlet) => (
        <span className="text-sm text-gray-500 flex items-center gap-1">
          {row.phone ? <><Phone size={12} className="shrink-0" />{row.phone}</> : <span className="text-gray-300">—</span>}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (row: Outlet) => (
        <Badge variant={row.is_active ? 'green' : 'red'}>{row.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
      ),
    },
    {
      key: 'subscription_status',
      label: 'Langganan',
      render: (row: Outlet) => {
        const status = (row.subscription_status ?? 'inactive') as OutletSubscriptionStatus
        return (
          <div className="flex flex-col gap-0.5">
            <Badge variant={subscriptionStatusVariant[status]}>{subscriptionStatusLabel[status]}</Badge>
            {row.subscription_end_date && (
              <span className="text-xs text-gray-400">
                s/d {new Date(row.subscription_end_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'actions',
      label: '',
      render: (row: Outlet) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(row) }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
            <Pencil size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(row) }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Outlet" subtitle={user?.business?.business_name ?? 'Bisnis Anda'} />
      <div className="flex-1 overflow-y-auto p-6">

        <OutletQuotaBanner membershipTier={membershipTier} totalOutlets={totalOutlets} />

        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari Outlet..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {quotaFull ? (
              <button onClick={() => navigate('/membership')} title="Upgrade untuk menambah outlet"
                className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 text-sm font-semibold rounded-xl hover:bg-amber-200 transition shrink-0 border border-amber-200">
                <Lock size={14} /> Tambah Outlet
              </button>
            ) : (
              <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shrink-0">
                <Plus size={14} /> Tambah Outlet
              </button>
            )}
            <p className="text-sm text-gray-500 shrink-0">Total: <span className="font-semibold text-gray-900">{totalOutlets}</span></p>
          </div>
          <DataTable columns={columns as never[]} data={outlets as never[]} loading={isLoading} emptyMessage="Belum Ada Outlet" />
          <Pagination page={page} total={totalOutlets} limit={10} onChange={setPage} />
        </div>
      </div>

      <OutletFormModal
        outlet={editOutlet}
        businessId={businessId}
        open={showForm}
        onClose={closeForm}
        onSuccess={closeForm}
      />
    </div>
  )
}
