import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, LayoutGrid, Pencil, Trash2, GitBranch } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { getTablesByOutlet, createTable, updateTable, deleteTable } from '@/api/tables'
import { getOutletsByBusiness } from '@/api/outlets'
import { useAuthStore } from '@/store/authStore'
import { useOutletStore } from '@/store/outletStore'
import type { Table, Outlet } from '@/types'
import { getErrorMessage } from '@/lib/utils'

const TABLE_STATUS_CONFIG: Record<string, { label: string; variant: 'green' | 'red' | 'yellow' | 'gray' }> = {
  available: { label: 'Tersedia',   variant: 'green' },
  occupied:  { label: 'Terisi',     variant: 'red' },
  reserved:  { label: 'Dipesan',    variant: 'yellow' },
}

export default function TablesPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { selected: globalOutlet } = useOutletStore()
  const businessId = user?.business?.id ?? ''

  const [selectedOutletId, setSelectedOutletId] = useState<string>(globalOutlet?.id ?? '')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editTable, setEditTable] = useState<Table | null>(null)
  const [tableNumber, setTableNumber] = useState('')

  const { data: outletsData } = useQuery({
    queryKey: ['outlets-selector', businessId],
    queryFn: () => getOutletsByBusiness(businessId, { limit: 50, page: 1 }),
    enabled: !!businessId,
    staleTime: 60_000,
  })
  const outlets: Outlet[] = outletsData?.data?.data ?? []

  const { data, isLoading } = useQuery({
    queryKey: ['tables', selectedOutletId, { page }],
    queryFn: () => getTablesByOutlet(selectedOutletId, { page, limit: 30 }),
    enabled: !!selectedOutletId,
  })

  const tables = data?.data?.data ?? []
  const pagination = data?.data?.pagination

  const createMut = useMutation({
    mutationFn: () => createTable({ outlet_id: selectedOutletId, number: tableNumber }),
    onSuccess: () => {
      toast.success('Meja berhasil dibuat')
      qc.invalidateQueries({ queryKey: ['tables', selectedOutletId] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateTable(editTable!.id, { number: tableNumber }),
    onSuccess: () => {
      toast.success('Meja berhasil diperbarui')
      qc.invalidateQueries({ queryKey: ['tables', selectedOutletId] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTable(id),
    onSuccess: () => {
      toast.success('Meja dihapus')
      qc.invalidateQueries({ queryKey: ['tables', selectedOutletId] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditTable(null); setTableNumber(''); setShowForm(true) }
  const openEdit = (t: Table) => { setEditTable(t); setTableNumber(t.number); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditTable(null); setTableNumber('') }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tableNumber.trim()) { toast.error('Nomor meja harus diisi'); return }
    editTable ? updateMut.mutate() : createMut.mutate()
  }

  const handleDelete = (t: Table) => {
    if (!confirm(`Hapus meja "${t.number}"?`)) return
    deleteMut.mutate(t.id)
  }

  const columns = [
    {
      key: 'number',
      label: 'No. Meja',
      render: (row: Table) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
            <LayoutGrid size={14} className="text-amber-600" />
          </div>
          <p className="font-semibold text-gray-900">{row.number}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Table) => {
        const cfg = TABLE_STATUS_CONFIG[row.status] ?? { label: row.status, variant: 'gray' as const }
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>
      },
    },
    {
      key: 'actions',
      label: '',
      render: (row: Table) => (
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
      <Header title="Meja" subtitle="Kelola meja dine-in per outlet" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
            {/* Outlet picker */}
            <div className="flex items-center gap-2">
              <GitBranch size={14} className="text-gray-400" />
              <select
                value={selectedOutletId}
                onChange={(e) => { setSelectedOutletId(e.target.value); setPage(1) }}
                className="py-2 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
              >
                <option value="">Pilih outlet</option>
                {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <p className="text-sm text-gray-500 ml-auto shrink-0">
              Total: <span className="font-semibold text-gray-900">{pagination?.total ?? 0}</span>
            </p>
            <button
              onClick={openCreate}
              disabled={!selectedOutletId}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shrink-0"
            >
              <Plus size={14} />
              Tambah Meja
            </button>
          </div>

          {!selectedOutletId ? (
            <div className="py-16 text-center text-sm text-gray-400">
              Pilih outlet untuk melihat daftar meja
            </div>
          ) : (
            <>
              <DataTable
                columns={columns as never[]}
                data={tables as never[]}
                loading={isLoading}
                emptyMessage="Belum ada meja"
              />
              <Pagination page={page} total={pagination?.total ?? 0} limit={30} onChange={setPage} />
            </>
          )}
        </div>
      </div>

      <Modal open={showForm} onClose={closeForm} title={editTable ? 'Edit Meja' : 'Tambah Meja'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nomor / Label Meja <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="Contoh: A1, 12, VIP-1"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeForm} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
              Batal
            </button>
            <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition">
              {isPending ? 'Menyimpan...' : editTable ? 'Simpan' : 'Tambah'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
