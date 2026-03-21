import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { getDiscounts, createDiscount, updateDiscount, deleteDiscount } from '@/api/library'
import type { Discount } from '@/types'
import { getErrorMessage, formatCurrency } from '@/lib/utils'

const emptyForm = {
  name: '',
  description: '',
  amount: 0,
  is_percentage: false,
  is_global: false,
  is_multiple: false,
  is_active: true,
  start_at: '',
  end_at: '',
}

type DiscountForm = typeof emptyForm

export default function DiscountsTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Discount | null>(null)
  const [form, setForm] = useState<DiscountForm>(emptyForm)

  const set = (key: keyof DiscountForm, value: unknown) => setForm((f) => ({ ...f, [key]: value }))

  const { data, isLoading } = useQuery({
    queryKey: ['discounts', { page, limit: 10 }],
    queryFn: () => getDiscounts({ page, limit: 10 }),
  })

  const items = data?.data?.data?.data ?? []
  const pagination = data?.data?.data?.pagination

  const toPayload = (f: DiscountForm) => ({
    name: f.name,
    description: f.description || undefined,
    amount: Number(f.amount),
    is_percentage: f.is_percentage,
    is_global: f.is_global,
    is_multiple: f.is_multiple,
    is_active: f.is_active,
    start_at: f.start_at || null,
    end_at: f.end_at || null,
  })

  const createMut = useMutation({
    mutationFn: () => createDiscount(toPayload(form)),
    onSuccess: () => { toast.success('Diskon dibuat'); qc.invalidateQueries({ queryKey: ['discounts'] }); setModal(false) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateDiscount(editing!.id, toPayload(form)),
    onSuccess: () => { toast.success('Diskon diperbarui'); qc.invalidateQueries({ queryKey: ['discounts'] }); setModal(false) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteDiscount(id),
    onSuccess: () => { toast.success('Diskon dihapus'); qc.invalidateQueries({ queryKey: ['discounts'] }); setDeleteId(null) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true) }
  const openEdit = (row: Discount) => {
    setEditing(row)
    setForm({
      name: row.name,
      description: row.description ?? '',
      amount: row.amount,
      is_percentage: row.is_percentage,
      is_global: row.is_global,
      is_multiple: row.is_multiple,
      is_active: row.is_active,
      start_at: row.start_at ? row.start_at.slice(0, 16) : '',
      end_at: row.end_at ? row.end_at.slice(0, 16) : '',
    })
    setModal(true)
  }

  const columns = [
    { key: 'name', label: 'Nama', render: (row: Discount) => <span className="font-medium text-gray-900">{row.name}</span> },
    {
      key: 'amount', label: 'Nilai',
      render: (row: Discount) => (
        <span className="font-semibold text-gray-900">
          {row.is_percentage ? `${row.amount}%` : formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: 'flags', label: 'Flag',
      render: (row: Discount) => (
        <div className="flex gap-1 flex-wrap">
          {row.is_global && <Badge variant="blue">Global</Badge>}
          {row.is_multiple && <Badge variant="blue">Stackable</Badge>}
        </div>
      ),
    },
    {
      key: 'is_active', label: 'Status',
      render: (row: Discount) => row.is_active
        ? <Badge variant="green">Aktif</Badge>
        : <Badge variant="red">Nonaktif</Badge>,
    },
    {
      key: 'actions', label: '',
      render: (row: Discount) => (
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
          <span className="text-sm text-gray-500">{pagination?.total ?? 0} diskon</span>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
            <Plus size={15} /> Tambah
          </button>
        </div>
        <DataTable columns={columns as never[]} data={items as never[]} loading={isLoading} />
        <Pagination page={page} total={pagination?.total ?? 0} limit={10} onChange={setPage} />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Diskon' : 'Tambah Diskon'} size="md">
        <form onSubmit={(e) => { e.preventDefault(); editing ? updateMut.mutate() : createMut.mutate() }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Diskon</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Diskon Hari Raya" required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi <span className="text-gray-400 font-normal">(opsional)</span></label>
            <input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Keterangan singkat..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
              <select value={form.is_percentage ? 'pct' : 'fix'} onChange={(e) => set('is_percentage', e.target.value === 'pct')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="fix">Nominal (Rp)</option>
                <option value="pct">Persentase (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nilai {form.is_percentage ? '(%)' : '(Rp)'}</label>
              <input type="number" min={0} value={form.amount} onChange={(e) => set('amount', e.target.value)} required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mulai <span className="text-gray-400 font-normal">(opsional)</span></label>
              <input type="datetime-local" value={form.start_at} onChange={(e) => set('start_at', e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selesai <span className="text-gray-400 font-normal">(opsional)</span></label>
              <input type="datetime-local" value={form.end_at} onChange={(e) => set('end_at', e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            {([
              { key: 'is_global', label: 'Global (berlaku semua produk)' },
              { key: 'is_multiple', label: 'Stackable (bisa digabung)' },
              { key: 'is_active', label: 'Aktif' },
            ] as const).map((f) => (
              <label key={f.key} className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form[f.key]} onChange={(e) => set(f.key, e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
                <span className="text-sm text-gray-700">{f.label}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
              {createMut.isPending || updateMut.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus Diskon" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Yakin ingin menghapus diskon ini?</p>
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
