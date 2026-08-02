import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Store, Phone, MapPin, Lock } from 'lucide-react'
import { EditButton, DeleteButton } from '@/components/ui/RowActions'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import EmptyState from '@/components/ui/EmptyState'
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

// Masa gratis 3 bulan boleh punya beberapa outlet (sinkron dengan
// TrialOutletLimit di loka-kasir-service); paket Lite tetap 1 outlet.
const TRIAL_OUTLET_LIMIT = 5

function isOutletQuotaFull(membershipTier: string | undefined, outletCount: number): boolean {
  if (!membershipTier) return false
  if (membershipTier === 'lite') return outletCount >= 1
  if (membershipTier === 'trial') return outletCount >= TRIAL_OUTLET_LIMIT
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
          <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg flex items-center justify-center shrink-0">
            <Store size={14} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="font-medium text-foreground">{row.name}</p>
        </div>
      ),
    },
    {
      key: 'address',
      label: 'Alamat',
      render: (row: Outlet) => (
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          {row.address ? <><MapPin size={12} className="shrink-0" />{row.address}</> : <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      key: 'phone',
      label: 'Telepon',
      render: (row: Outlet) => (
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          {row.phone ? <><Phone size={12} className="shrink-0" />{row.phone}</> : <span className="text-muted-foreground">—</span>}
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
              <span className="text-xs text-muted-foreground">
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
        <div className="flex items-center gap-1" data-tour="row-actions">
          <EditButton onClick={() => { openEdit(row) }} />
          <DeleteButton onClick={() => { handleDelete(row) }} />
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Daftar Outlet" subtitle={`Kelola lokasi dan cabang ${user?.business?.business_name ?? 'bisnis Anda'}`} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">

        <OutletQuotaBanner membershipTier={membershipTier} totalOutlets={totalOutlets} />

        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari Outlet..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {quotaFull ? (
              <button onClick={() => navigate('/membership')} title="Upgrade untuk menambah outlet"
                className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 text-sm font-semibold rounded-xl hover:bg-amber-200 transition shrink-0 border border-amber-200 dark:border-amber-500/20">
                <Lock size={14} /> Tambah Outlet
              </button>
            ) : (
              <button onClick={openCreate} data-tour="outlet-add" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shrink-0">
                <Plus size={14} /> Tambah Outlet
              </button>
            )}
            <p className="text-sm text-muted-foreground shrink-0">Total: <span className="font-semibold text-foreground">{totalOutlets}</span></p>
          </div>
          <DataTable
            columns={columns as never[]}
            data={outlets as never[]}
            loading={isLoading}
            emptySlot={
              <EmptyState
                title="Belum ada outlet"
                description="Outlet adalah lokasi toko fisik Anda. Buat outlet pertama untuk mulai mengatur produk, karyawan, dan terminal kasir."
                action={{ label: 'Buat Outlet', icon: <Plus size={14} />, onClick: openCreate }}
              />
            }
          />
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
