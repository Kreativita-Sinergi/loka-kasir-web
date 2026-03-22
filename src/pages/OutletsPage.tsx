import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Store, Phone, MapPin, Pencil, Trash2, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { getBusinesses } from '@/api/business'
import {
  getOutletsByBusiness,
  createOutlet,
  updateOutlet,
  deleteOutlet,
} from '@/api/outlets'
import type { Business, Outlet } from '@/types'
import { getErrorMessage } from '@/lib/utils'

type FormState = {
  name: string
  address: string
  phone: string
  is_active: boolean
}

const emptyForm: FormState = { name: '', address: '', phone: '', is_active: true }

export default function OutletsPage() {
  const qc = useQueryClient()

  // Business list state
  const [bizPage, setBizPage] = useState(1)
  const [bizSearch, setBizSearch] = useState('')
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null)

  // Outlet list state
  const [outletPage, setOutletPage] = useState(1)
  const [outletSearch, setOutletSearch] = useState('')

  // Modal state
  const [showForm, setShowForm] = useState(false)
  const [editOutlet, setEditOutlet] = useState<Outlet | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  // ─── Business list ────────────────────────────────────────────────────────
  const { data: bizData, isLoading: bizLoading } = useQuery({
    queryKey: ['businesses', { page: bizPage, limit: 10, search: bizSearch }],
    queryFn: () => getBusinesses({ page: bizPage, limit: 10, search: bizSearch || undefined }),
    enabled: !selectedBiz,
  })
  const businesses = bizData?.data?.data ?? []
  const bizPagination = bizData?.data?.pagination

  // ─── Outlet list ─────────────────────────────────────────────────────────
  const { data: outletData, isLoading: outletLoading } = useQuery({
    queryKey: ['outlets', selectedBiz?.id, { page: outletPage, limit: 10, search: outletSearch }],
    queryFn: () => getOutletsByBusiness(selectedBiz!.id, { page: outletPage, limit: 10, search: outletSearch || undefined }),
    enabled: !!selectedBiz,
  })
  const outlets = outletData?.data?.data ?? []
  const outletPagination = outletData?.data?.pagination

  // ─── Mutations ────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: () => createOutlet({
      business_id: selectedBiz!.id,
      name: form.name,
      address: form.address || null,
      phone: form.phone || null,
      is_active: form.is_active,
    }),
    onSuccess: () => {
      toast.success('Outlet berhasil dibuat')
      qc.invalidateQueries({ queryKey: ['outlets', selectedBiz?.id] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateOutlet(editOutlet!.id, {
      name: form.name,
      address: form.address || null,
      phone: form.phone || null,
      is_active: form.is_active,
    }),
    onSuccess: () => {
      toast.success('Outlet berhasil diperbarui')
      qc.invalidateQueries({ queryKey: ['outlets', selectedBiz?.id] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteOutlet(id),
    onSuccess: () => {
      toast.success('Outlet dihapus')
      qc.invalidateQueries({ queryKey: ['outlets', selectedBiz?.id] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditOutlet(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (outlet: Outlet) => {
    setEditOutlet(outlet)
    setForm({
      name: outlet.name,
      address: outlet.address ?? '',
      phone: outlet.phone ?? '',
      is_active: outlet.is_active,
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditOutlet(null)
    setForm(emptyForm)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Nama outlet harus diisi'); return }
    editOutlet ? updateMut.mutate() : createMut.mutate()
  }

  const handleDelete = (outlet: Outlet) => {
    if (!confirm(`Hapus outlet "${outlet.name}"?`)) return
    deleteMut.mutate(outlet.id)
  }

  // ─── Outlet columns ───────────────────────────────────────────────────────
  const outletColumns = [
    {
      key: 'name',
      label: 'Outlet',
      render: (row: Outlet) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
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
        <Badge variant={row.is_active ? 'green' : 'red'}>
          {row.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row: Outlet) => (
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

  // ─── Business columns ──────────────────────────────────────────────────────
  const bizColumns = [
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
      render: (row: Business) => <span className="text-sm text-gray-500">{row.business_type?.name ?? '-'}</span>,
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
  ]

  const isPending = createMut.isPending || updateMut.isPending

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!selectedBiz) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="Outlet" subtitle="Pilih bisnis untuk mengelola cabang" />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
              <div className="relative flex-1 max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari bisnis..."
                  value={bizSearch}
                  onChange={(e) => { setBizSearch(e.target.value); setBizPage(1) }}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <DataTable
              columns={bizColumns as never[]}
              data={businesses as never[]}
              loading={bizLoading}
              emptyMessage="Belum ada bisnis"
              onRowClick={(row) => setSelectedBiz(row as Business)}
            />
            <Pagination page={bizPage} total={bizPagination?.total ?? 0} limit={10} onChange={setBizPage} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={`Outlet – ${selectedBiz.business_name}`} subtitle="Kelola cabang bisnis ini" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari outlet..."
                value={outletSearch}
                onChange={(e) => { setOutletSearch(e.target.value); setOutletPage(1) }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setSelectedBiz(null)}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition shrink-0"
            >
              <ChevronLeft size={14} />
              Bisnis
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shrink-0"
            >
              <Plus size={14} />
              Tambah Outlet
            </button>
            <p className="text-sm text-gray-500 shrink-0">
              Total: <span className="font-semibold text-gray-900">{outletPagination?.total ?? 0}</span>
            </p>
          </div>
          <DataTable
            columns={outletColumns as never[]}
            data={outlets as never[]}
            loading={outletLoading}
            emptyMessage="Belum ada outlet"
          />
          <Pagination page={outletPage} total={outletPagination?.total ?? 0} limit={10} onChange={setOutletPage} />
        </div>
      </div>

      {/* Form Modal */}
      <Modal
        open={showForm}
        onClose={closeForm}
        title={editOutlet ? 'Edit Outlet' : 'Tambah Outlet'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nama Outlet <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Contoh: Cabang Utama"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Alamat</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Alamat lengkap outlet"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
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
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">Outlet aktif</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeForm}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {isPending ? 'Menyimpan...' : editOutlet ? 'Simpan' : 'Buat Outlet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
