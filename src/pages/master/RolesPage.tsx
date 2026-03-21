import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import { getRoles, createRole, updateRole, deleteRole } from '@/api/master'
import type { Role } from '@/types'
import { getErrorMessage } from '@/lib/utils'

export default function RolesPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Role | null>(null)
  const [name, setName] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['roles'], queryFn: () => getRoles() })
  const roles = data?.data?.data?.data ?? []

  const createMut = useMutation({
    mutationFn: () => createRole({ name }),
    onSuccess: () => { toast.success('Role dibuat'); qc.invalidateQueries({ queryKey: ['roles'] }); setModal(false) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateRole(editing!.id, { name }),
    onSuccess: () => { toast.success('Role diperbarui'); qc.invalidateQueries({ queryKey: ['roles'] }); setModal(false) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: () => { toast.success('Role dihapus'); qc.invalidateQueries({ queryKey: ['roles'] }); setDeleteId(null) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const columns = [
    { key: 'id', label: 'ID', render: (row: Role) => <span className="text-xs text-gray-400">#{row.id}</span> },
    { key: 'name', label: 'Nama Role', render: (row: Role) => <span className="font-semibold text-gray-900">{row.name}</span> },
    {
      key: 'actions', label: '',
      render: (row: Role) => (
        <div className="flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); setEditing(row); setName(row.name); setModal(true) }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit2 size={13} /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(row.id) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={13} /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Role" subtitle="Kelola role pengguna pada platform" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">{roles.length} role</span>
            <button onClick={() => { setEditing(null); setName(''); setModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
              <Plus size={15} /> Tambah
            </button>
          </div>
          <DataTable columns={columns as never[]} data={roles as never[]} loading={isLoading} />
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Role' : 'Tambah Role'} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); editing ? updateMut.mutate() : createMut.mutate() }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Role</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Owner, Kasir, dll..." required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
              {createMut.isPending || updateMut.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus Role" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Yakin ingin menghapus role ini? Karyawan dengan role ini mungkin terpengaruh.</p>
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
