import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import { getBusinessTypes, createBusinessType, updateBusinessType, deleteBusinessType } from '@/api/master'
import type { BusinessType } from '@/types'
import { getErrorMessage } from '@/lib/utils'

const archetypes = ['PREPARED_ORDER', 'INSTANT_SALE', 'DELIVERY_ORDER', 'DELAYED_SERVICE', 'BOOKING', 'CUSTOM_PROJECT']

const emptyForm = { code: '', name: '', description: '', order_archetype: 'INSTANT_SALE' }

export default function BusinessTypesPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editing, setEditing] = useState<BusinessType | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data, isLoading } = useQuery({
    queryKey: ['business-types'],
    queryFn: () => getBusinessTypes(),
  })

  const types = data?.data?.data ?? []

  const createMut = useMutation({
    mutationFn: () => createBusinessType(form),
    onSuccess: () => { toast.success('Tipe Bisnis Dibuat'); qc.invalidateQueries({ queryKey: ['business-types'] }); setModal(false) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateBusinessType(editing!.id, form),
    onSuccess: () => { toast.success('Tipe Bisnis Diperbarui'); qc.invalidateQueries({ queryKey: ['business-types'] }); setModal(false) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteBusinessType(id),
    onSuccess: () => { toast.success('Tipe Bisnis Dihapus'); qc.invalidateQueries({ queryKey: ['business-types'] }); setDeleteId(null) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true) }
  const openEdit = (t: BusinessType) => { setEditing(t); setForm({ code: t.code, name: t.name, description: t.description, order_archetype: t.order_archetype }); setModal(true) }

  const columns = [
    { key: 'code', label: 'Kode', render: (row: BusinessType) => <span className="font-mono text-xs font-semibold text-blue-600">{row.code}</span> },
    { key: 'name', label: 'Nama', render: (row: BusinessType) => <span className="font-medium text-gray-900">{row.name}</span> },
    { key: 'description', label: 'Deskripsi', render: (row: BusinessType) => <span className="text-sm text-gray-500 max-w-xs block truncate">{row.description}</span> },
    { key: 'order_archetype', label: 'Archetype', render: (row: BusinessType) => <span className="font-mono text-xs text-purple-600">{row.order_archetype}</span> },
    {
      key: 'actions', label: '',
      render: (row: BusinessType) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(row) }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit2 size={13} /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(row.id) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={13} /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Tipe Bisnis" subtitle="Kelola Jenis-Jenis Bisnis pada Platform" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">{types.length} Tipe Bisnis</span>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
              <Plus size={15} /> Tambah
            </button>
          </div>
          <DataTable columns={columns as never[]} data={types as never[]} loading={isLoading} />
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Tipe Bisnis' : 'Tambah Tipe Bisnis'} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); editing ? updateMut.mutate() : createMut.mutate() }} className="space-y-4">
          {[
            { key: 'code', label: 'Kode', placeholder: 'FOOD_BEVERAGE' },
            { key: 'name', label: 'Nama', placeholder: 'Makanan dan Minuman' },
            { key: 'description', label: 'Deskripsi', placeholder: 'Deskripsi tipe bisnis...' },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input
                value={form[f.key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order Archetype</label>
            <select
              value={form.order_archetype}
              onChange={(e) => setForm({ ...form, order_archetype: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {archetypes.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
              {createMut.isPending || updateMut.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus Tipe Bisnis" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Yakin Ingin Menghapus Tipe Bisnis Ini? Tindakan Tidak Bisa Dibatalkan.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">Batal</button>
            <button onClick={() => deleteMut.mutate(deleteId!)} disabled={deleteMut.isPending} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
              {deleteMut.isPending ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
