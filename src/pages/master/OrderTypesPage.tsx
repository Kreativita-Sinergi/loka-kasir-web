import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Modal from '@/components/ui/Modal'
import { getOrderTypes, createOrderType, updateOrderType, deleteOrderType } from '@/api/master'
import type { OrderType } from '@/types'
import { getErrorMessage } from '@/lib/utils'

const emptyForm = { code: '', name: '' }

export default function OrderTypesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editing, setEditing] = useState<OrderType | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data, isLoading } = useQuery({
    queryKey: ['order-types', { page, limit: 10 }],
    queryFn: () => getOrderTypes({ page, limit: 10 }),
  })

  const types = data?.data?.data?.data ?? []
  const pagination = data?.data?.data?.pagination

  const createMut = useMutation({
    mutationFn: () => createOrderType(form),
    onSuccess: () => { toast.success('Tipe order dibuat'); qc.invalidateQueries({ queryKey: ['order-types'] }); setModal(false) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateOrderType(editing!.id, form),
    onSuccess: () => { toast.success('Tipe order diperbarui'); qc.invalidateQueries({ queryKey: ['order-types'] }); setModal(false) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteOrderType(id),
    onSuccess: () => { toast.success('Tipe order dihapus'); qc.invalidateQueries({ queryKey: ['order-types'] }); setDeleteId(null) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true) }
  const openEdit = (t: OrderType) => { setEditing(t); setForm({ code: t.code, name: t.name }); setModal(true) }

  const columns = [
    { key: 'id', label: 'ID', render: (row: OrderType) => <span className="text-xs text-gray-400">#{row.id}</span> },
    { key: 'code', label: 'Kode', render: (row: OrderType) => <span className="font-mono text-xs font-semibold text-blue-600">{row.code}</span> },
    { key: 'name', label: 'Nama', render: (row: OrderType) => <span className="font-medium text-gray-900">{row.name}</span> },
    {
      key: 'actions', label: '',
      render: (row: OrderType) => (
        <div className="flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(row) }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit2 size={13} /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(row.id) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={13} /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Tipe Order" subtitle="Kelola jenis order pada platform" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">{pagination?.total ?? 0} tipe order</span>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
              <Plus size={15} /> Tambah
            </button>
          </div>
          <DataTable columns={columns as never[]} data={types as never[]} loading={isLoading} />
          <Pagination page={page} total={pagination?.total ?? 0} limit={10} onChange={setPage} />
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Tipe Order' : 'Tambah Tipe Order'} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); editing ? updateMut.mutate() : createMut.mutate() }} className="space-y-4">
          {[{ key: 'code', label: 'Kode', placeholder: 'DINE_IN' }, { key: 'name', label: 'Nama', placeholder: 'Makan di Tempat' }].map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input value={form[f.key as keyof typeof form]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
          <div className="flex gap-3">
            <button type="button" onClick={() => setModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
              {createMut.isPending || updateMut.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus Tipe Order" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Yakin ingin menghapus tipe order ini?</p>
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
