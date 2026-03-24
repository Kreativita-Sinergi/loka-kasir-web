import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Modal from '@/components/ui/Modal'
import { getBrands, createBrand, updateBrand, deleteBrand } from '@/api/library'
import type { Brand } from '@/types'
import { getErrorMessage } from '@/lib/utils'

export default function BrandsTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Brand | null>(null)
  const [name, setName] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['brands', { page, limit: 10 }],
    queryFn: () => getBrands({ page, limit: 10 }),
  })

  const items = data?.data?.data ?? []
  const pagination = data?.data?.pagination

  const createMut = useMutation({
    mutationFn: () => createBrand({ name }),
    onSuccess: () => { toast.success('Brand Dibuat'); qc.invalidateQueries({ queryKey: ['brands'] }); setModal(false) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateBrand(editing!.id, { name }),
    onSuccess: () => { toast.success('Brand Diperbarui'); qc.invalidateQueries({ queryKey: ['brands'] }); setModal(false) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteBrand(id),
    onSuccess: () => { toast.success('Brand Dihapus'); qc.invalidateQueries({ queryKey: ['brands'] }); setDeleteId(null) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditing(null); setName(''); setModal(true) }
  const openEdit = (row: Brand) => { setEditing(row); setName(row.name); setModal(true) }

  const columns = [
    { key: 'name', label: 'Nama Brand', render: (row: Brand) => <span className="font-semibold text-gray-900">{row.name}</span> },
    {
      key: 'actions', label: '',
      render: (row: Brand) => (
        <div className="flex gap-1 justify-end">
          <button onClick={(e) => { e.stopPropagation(); openEdit(row) }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit2 size={13} /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(row.id) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={13} /></button>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">{pagination?.total ?? 0} Brand</span>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
            <Plus size={15} /> Tambah
          </button>
        </div>
        <DataTable columns={columns as never[]} data={items as never[]} loading={isLoading} />
        <Pagination page={page} total={pagination?.total ?? 0} limit={10} onChange={setPage} />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Brand' : 'Tambah Brand'} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); editing ? updateMut.mutate() : createMut.mutate() }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Brand</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nike, Unilever, dll..." required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
              {createMut.isPending || updateMut.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus Brand" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Yakin Ingin Menghapus Brand Ini?</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">Batal</button>
            <button onClick={() => deleteMut.mutate(deleteId!)} disabled={deleteMut.isPending} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
              {deleteMut.isPending ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
