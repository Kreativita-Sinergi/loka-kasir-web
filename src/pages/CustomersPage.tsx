import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, UserCircle, Phone, Mail, MapPin, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Modal from '@/components/ui/Modal'
import { getCustomersByBusiness, createCustomer, updateCustomer, deleteCustomer } from '@/api/customers'
import { useAuthStore } from '@/store/authStore'
import type { Customer } from '@/types'
import { formatDateTime, getErrorMessage } from '@/lib/utils'

type FormState = {
  name: string
  phone: string
  email: string
  address: string
  notes: string
}

const emptyForm: FormState = { name: '', phone: '', email: '', address: '', notes: '' }

export default function CustomersPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const businessId = user?.business?.id ?? ''

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', businessId, { page, search }],
    queryFn: () => getCustomersByBusiness(businessId, { page, limit: 20, search: search || undefined }),
    enabled: !!businessId,
  })

  const customers = data?.data?.data ?? []
  const pagination = data?.data?.pagination

  const createMut = useMutation({
    mutationFn: () => createCustomer({
      business_id: businessId,
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      notes: form.notes || null,
    }),
    onSuccess: () => {
      toast.success('Pelanggan Berhasil Ditambahkan')
      qc.invalidateQueries({ queryKey: ['customers', businessId] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateCustomer(editCustomer!.id, {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      notes: form.notes || null,
    }),
    onSuccess: () => {
      toast.success('Data Pelanggan Diperbarui')
      qc.invalidateQueries({ queryKey: ['customers', businessId] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: () => {
      toast.success('Pelanggan Dihapus')
      qc.invalidateQueries({ queryKey: ['customers', businessId] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditCustomer(null); setForm(emptyForm); setShowForm(true) }

  const openEdit = (c: Customer) => {
    setEditCustomer(c)
    setForm({ name: c.name, phone: c.phone ?? '', email: c.email ?? '', address: c.address ?? '', notes: '' })
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setEditCustomer(null); setForm(emptyForm) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Nama Pelanggan Harus Diisi'); return }
    editCustomer ? updateMut.mutate() : createMut.mutate()
  }

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
          <p className="font-medium text-gray-900">{row.name}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Telepon',
      render: (row: Customer) => (
        <span className="text-sm text-gray-500 flex items-center gap-1">
          {row.phone ? <><Phone size={12} className="shrink-0" />{row.phone}</> : <span className="text-gray-300">—</span>}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (row: Customer) => (
        <span className="text-sm text-gray-500 flex items-center gap-1">
          {row.email ? <><Mail size={12} className="shrink-0" />{row.email}</> : <span className="text-gray-300">—</span>}
        </span>
      ),
    },
    {
      key: 'address',
      label: 'Alamat',
      render: (row: Customer) => (
        <span className="text-sm text-gray-500 flex items-center gap-1">
          {row.address ? <><MapPin size={12} className="shrink-0" />{row.address}</> : <span className="text-gray-300">—</span>}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Terdaftar',
      render: (row: Customer) => (
        <span className="text-xs text-gray-400">{formatDateTime(row.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row: Customer) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row) }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(row) }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Pelanggan" subtitle="Database Pelanggan Bisnis Anda" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari Nama, Telepon..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-sm text-gray-500 ml-auto shrink-0">
              Total: <span className="font-semibold text-gray-900">{pagination?.total ?? 0}</span>
            </p>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shrink-0"
            >
              <Plus size={14} />
              Tambah Pelanggan
            </button>
          </div>
          <DataTable
            columns={columns as never[]}
            data={customers as never[]}
            loading={isLoading}
            emptyMessage="Belum Ada Pelanggan"
          />
          <Pagination page={page} total={pagination?.total ?? 0} limit={20} onChange={setPage} />
        </div>
      </div>

      <Modal open={showForm} onClose={closeForm} title={editCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nama <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nama Pelanggan"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Telepon</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="08xxxxxxxxxx"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@contoh.com"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Alamat</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
              placeholder="Alamat Lengkap"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeForm} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
              Batal
            </button>
            <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition">
              {isPending ? 'Menyimpan...' : editCustomer ? 'Simpan' : 'Tambah'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
