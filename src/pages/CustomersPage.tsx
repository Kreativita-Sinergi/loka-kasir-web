import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Phone, Mail, MapPin, StickyNote, Gift } from 'lucide-react'
import { EditButton, DeleteButton } from '@/components/ui/RowActions'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import CustomerFormModal from '@/components/customers/CustomerFormModal'
import CustomerLoyaltyModal from '@/components/customers/CustomerLoyaltyModal'
import { getCustomersByBusiness, deleteCustomer } from '@/api/customers'
import { useAuthStore } from '@/store/authStore'
import { usePermissions } from '@/hooks/usePermissions'
import { PERMS } from '@/hooks/usePermissions'
import type { Customer } from '@/types'
import { formatDateTime, getErrorMessage } from '@/lib/utils'

export default function CustomersPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const businessId = user?.business?.id ?? ''

  const { can } = usePermissions()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<Customer | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', businessId, { page, search }],
    queryFn: () => getCustomersByBusiness(businessId, { page, limit: 20, search: search || undefined }),
    enabled: !!businessId,
  })

  const customers = data?.data?.data ?? []
  const pagination = data?.data?.pagination

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: () => { toast.success('Pelanggan Dihapus'); qc.invalidateQueries({ queryKey: ['customers', businessId] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditCustomer(null); setShowForm(true) }
  const openEdit = (c: Customer) => { setEditCustomer(c); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditCustomer(null) }

  const handleDelete = (c: Customer) => {
    if (!confirm(`Hapus pelanggan "${c.name}"?`)) return
    deleteMut.mutate(c.id)
  }

  const columns = [
    {
      key: 'name',
      label: 'Pelanggan',
      render: (row: Customer) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 font-bold text-sm">
            {row.name[0]?.toUpperCase()}
          </div>
          <p className="font-medium text-foreground">{row.name}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Telepon',
      render: (row: Customer) => (
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          {row.phone ? <><Phone size={12} className="shrink-0" />{row.phone}</> : <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (row: Customer) => (
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          {row.email ? <><Mail size={12} className="shrink-0" />{row.email}</> : <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      key: 'address',
      label: 'Alamat',
      render: (row: Customer) => (
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          {row.address ? <><MapPin size={12} className="shrink-0" />{row.address}</> : <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      key: 'notes',
      label: 'Catatan',
      render: (row: Customer) => (
        <span className="text-sm text-muted-foreground flex items-center gap-1 max-w-[160px]">
          {row.notes
            ? <><StickyNote size={12} className="shrink-0 text-amber-400" /><span className="truncate">{row.notes}</span></>
            : <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Terdaftar',
      render: (row: Customer) => <span className="text-xs text-muted-foreground">{formatDateTime(row.created_at)}</span>,
    },
    {
      key: 'points_balance',
      label: 'Poin',
      render: (row: Customer) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
          <Gift size={10} />
          {(row.points_balance ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row: Customer) => (
        <div className="flex items-center gap-1">
          {can(PERMS.CUSTOMER_LOYALTY) && (
            <button onClick={(e) => { e.stopPropagation(); setLoyaltyCustomer(row) }}
              title="Kelola Poin"
              className="p-1.5 text-muted-foreground hover:text-teal-600 hover:bg-teal-50 rounded-lg transition">
              <Gift size={14} />
            </button>
          )}
          <EditButton onClick={() => openEdit(row)} />
          <DeleteButton onClick={() => handleDelete(row)} />
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Pelanggan" subtitle="Database Pelanggan Bisnis Anda" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari Nama, Telepon..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-sm text-muted-foreground ml-auto shrink-0">
              Total: <span className="font-semibold text-foreground">{pagination?.total ?? 0}</span>
            </p>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shrink-0">
              <Plus size={14} /> Tambah Pelanggan
            </button>
          </div>
          <DataTable columns={columns as never[]} data={customers as never[]} loading={isLoading} emptyMessage="Belum Ada Pelanggan" />
          <Pagination page={page} total={pagination?.total ?? 0} limit={20} onChange={setPage} />
        </div>
      </div>

      <CustomerFormModal
        customer={editCustomer}
        businessId={businessId}
        open={showForm}
        onClose={closeForm}
        onSuccess={closeForm}
      />

      {loyaltyCustomer && (
        <CustomerLoyaltyModal
          customerId={loyaltyCustomer.id}
          customerName={loyaltyCustomer.name}
          onClose={() => setLoyaltyCustomer(null)}
        />
      )}
    </div>
  )
}
