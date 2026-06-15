import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { EditButton, DeleteButton } from '@/components/ui/RowActions'
import toast from 'react-hot-toast'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Modal from '@/components/ui/Modal'
import { getUnits, createUnit, updateUnit, deleteUnit } from '@/api/library'
import type { Unit } from '@/types'
import { getErrorMessage } from '@/lib/utils'

const emptyForm = { name: '', alias: '' }

export default function UnitsTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Unit | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data, isLoading } = useQuery({
    queryKey: ['units', { page, limit: 10 }],
    queryFn: () => getUnits({ page, limit: 10 }),
  })

  const items = data?.data?.data ?? []
  const pagination = data?.data?.pagination

  const createMut = useMutation({
    mutationFn: () => createUnit(form),
    onSuccess: () => { toast.success('Satuan Dibuat'); qc.invalidateQueries({ queryKey: ['units'] }); setModal(false) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateUnit(editing!.id, form),
    onSuccess: () => { toast.success('Satuan Diperbarui'); qc.invalidateQueries({ queryKey: ['units'] }); setModal(false) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteUnit(id),
    onSuccess: () => { toast.success('Satuan Dihapus'); qc.invalidateQueries({ queryKey: ['units'] }); setDeleteId(null) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true) }
  const openEdit = (row: Unit) => { setEditing(row); setForm({ name: row.name, alias: row.alias }); setModal(true) }

  const columns = [
    { key: 'name', label: 'Nama', render: (row: Unit) => <span className="font-medium text-foreground">{row.name}</span> },
    { key: 'alias', label: 'Alias', render: (row: Unit) => <span className="font-mono text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded">{row.alias}</span> },
    {
      key: 'actions', label: '',
      render: (row: Unit) => (
        <div className="flex gap-1 justify-end">
          <EditButton onClick={() => openEdit(row)} />
          <DeleteButton onClick={() => setDeleteId(row.id)} />
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="bg-card rounded-2xl border border-border">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{pagination?.total ?? 0} Satuan</span>
          <button onClick={openCreate} data-tour="library-add" className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
            <Plus size={15} /> Tambah
          </button>
        </div>
        <DataTable columns={columns as never[]} data={items as never[]} loading={isLoading} />
        <Pagination page={page} total={pagination?.total ?? 0} limit={10} onChange={setPage} />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Satuan' : 'Tambah Satuan'} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); if (editing) updateMut.mutate(); else createMut.mutate() }} className="space-y-4">
          {[
            { key: 'name', label: 'Nama', placeholder: 'Kilogram' },
            { key: 'alias', label: 'Alias', placeholder: 'kg' },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-foreground mb-1">{f.label}</label>
              <input value={form[f.key as keyof typeof form]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} required className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModal(false)} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted">Batal</button>
            <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
              {createMut.isPending || updateMut.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus Satuan" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Yakin Ingin Menghapus Satuan Ini? Produk yang Menggunakan Satuan Ini Mungkin Terpengaruh.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted">Batal</button>
            <button onClick={() => deleteMut.mutate(deleteId!)} disabled={deleteMut.isPending} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
              {deleteMut.isPending ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
