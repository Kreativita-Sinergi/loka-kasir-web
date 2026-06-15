import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, LayoutGrid, List, GitBranch } from 'lucide-react'
import { EditButton, DeleteButton } from '@/components/ui/RowActions'
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

const TABLE_MAP_STYLE: Record<string, { card: string; border: string; text: string }> = {
  available: {
    card:   'bg-card',
    border: 'border-green-300 dark:border-green-500/20',
    text:   'text-green-700 dark:text-green-400',
  },
  occupied: {
    card:   'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-300 dark:border-red-500/20',
    text:   'text-red-600 dark:text-red-400',
  },
  reserved: {
    card:   'bg-yellow-50 dark:bg-yellow-500/10',
    border: 'border-yellow-300 dark:border-yellow-500/20',
    text:   'text-yellow-700 dark:text-yellow-400',
  },
}

export default function TablesPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { selected: globalOutlet } = useOutletStore()
  const businessId = user?.business?.id ?? ''

  const [selectedOutletId, setSelectedOutletId] = useState<string>(globalOutlet?.id ?? '')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
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
    queryKey: ['tables', selectedOutletId, viewMode === 'map' ? 'map' : { page }],
    queryFn: () => getTablesByOutlet(selectedOutletId, viewMode === 'map' ? { page: 1, limit: 100 } : { page, limit: 30 }),
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
    if (editTable) updateMut.mutate(); else createMut.mutate()
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
          <div className="w-8 h-8 bg-amber-50 dark:bg-amber-500/10 rounded-lg flex items-center justify-center">
            <LayoutGrid size={14} className="text-amber-600 dark:text-amber-400" />
          </div>
          <p className="font-semibold text-foreground">{row.number}</p>
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
        <div className="flex items-center gap-1" data-tour="row-actions">
          <EditButton onClick={() => { openEdit(row) }} />
          <DeleteButton onClick={() => { handleDelete(row) }} />
        </div>
      ),
    },
  ]

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Meja" subtitle="Kelola meja dine-in per outlet" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
            {/* Outlet picker */}
            <div className="flex items-center gap-2">
              <GitBranch size={14} className="text-muted-foreground" />
              <select
                value={selectedOutletId}
                onChange={(e) => { setSelectedOutletId(e.target.value); setPage(1) }}
                className="py-2 px-3 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-muted-foreground"
              >
                <option value="">Pilih outlet</option>
                {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-xl" data-tour="table-viewmode">
              <button
                onClick={() => setViewMode('map')}
                title="Map View"
                className={`p-1.5 rounded-lg transition ${viewMode === 'map' ? 'bg-card text-blue-600 dark:text-blue-400 shadow-sm' : 'text-muted-foreground hover:text-muted-foreground'}`}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="List View"
                className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-card text-blue-600 dark:text-blue-400 shadow-sm' : 'text-muted-foreground hover:text-muted-foreground'}`}
              >
                <List size={15} />
              </button>
            </div>

            <p className="text-sm text-muted-foreground ml-auto shrink-0">
              Total: <span className="font-semibold text-foreground">{pagination?.total ?? 0}</span>
            </p>
            <button
              onClick={openCreate}
              disabled={!selectedOutletId}
              data-tour="table-add"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shrink-0"
            >
              <Plus size={14} />
              Tambah Meja
            </button>
          </div>

          {!selectedOutletId ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Pilih outlet untuk melihat daftar meja
            </div>
          ) : viewMode === 'map' ? (
            /* ── Map View ── */
            <div className="p-5">
              {isLoading ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : tables.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">Belum ada meja</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {(tables as Table[]).map((t) => {
                    const style = TABLE_MAP_STYLE[t.status] ?? { card: 'bg-card', border: 'border-border', text: 'text-muted-foreground' }
                    const cfg = TABLE_STATUS_CONFIG[t.status] ?? { label: t.status, variant: 'gray' as const }
                    return (
                      <button
                        key={t.id}
                        onClick={() => openEdit(t)}
                        className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 ${style.card} ${style.border} hover:opacity-80 transition cursor-pointer h-24`}
                      >
                        <span className="text-2xl">&#x1FA91;</span>
                        <p className="text-sm font-bold text-foreground leading-tight">{t.number}</p>
                        <span className={`text-xs font-medium ${style.text}`}>{cfg.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ── List View ── */
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
            <label className="block text-xs font-medium text-foreground mb-1">Nomor / Label Meja <span className="text-red-500 dark:text-red-400">*</span></label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="Contoh: A1, 12, VIP-1"
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeForm} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted transition">
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
