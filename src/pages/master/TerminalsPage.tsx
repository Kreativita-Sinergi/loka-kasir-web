import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Monitor, GitBranch } from 'lucide-react'
import { EditButton, DeleteButton } from '@/components/ui/RowActions'
import EmptyState from '@/components/ui/EmptyState'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { getTerminalsByBusiness, createTerminal, updateTerminal, deleteTerminal } from '@/api/terminals'
import { getOutletsByBusiness } from '@/api/outlets'
import { useAuthStore } from '@/store/authStore'
import type { Terminal, Outlet } from '@/types'
import { getErrorMessage } from '@/lib/utils'

type FormState = {
  name: string
  location: string
  outlet_id: string
  is_active: boolean
}

const emptyForm: FormState = { name: '', location: '', outlet_id: '', is_active: true }

export default function TerminalsPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const businessId = user?.business?.id ?? ''

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editTerminal, setEditTerminal] = useState<Terminal | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const { data, isLoading } = useQuery({
    queryKey: ['terminals', businessId, { page, search }],
    queryFn: () => getTerminalsByBusiness(businessId, { page, limit: 20, search: search || undefined }),
    enabled: !!businessId,
  })

  const { data: outletsData } = useQuery({
    queryKey: ['outlets-selector', businessId],
    queryFn: () => getOutletsByBusiness(businessId, { limit: 50, page: 1 }),
    enabled: !!businessId,
    staleTime: 60_000,
  })

  const terminals = data?.data?.data ?? []
  const pagination = data?.data?.pagination
  const outlets: Outlet[] = outletsData?.data?.data ?? []

  const createMut = useMutation({
    mutationFn: () => createTerminal({
      business_id: businessId,
      name: form.name,
      location: form.location || null,
      outlet_id: form.outlet_id || null,
      is_active: form.is_active,
    }),
    onSuccess: () => {
      toast.success('Terminal berhasil dibuat')
      qc.invalidateQueries({ queryKey: ['terminals', businessId] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateTerminal(editTerminal!.id, {
      name: form.name,
      location: form.location || null,
      outlet_id: form.outlet_id || null,
      is_active: form.is_active,
    }),
    onSuccess: () => {
      toast.success('Terminal berhasil diperbarui')
      qc.invalidateQueries({ queryKey: ['terminals', businessId] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTerminal(id),
    onSuccess: () => {
      toast.success('Terminal dihapus')
      qc.invalidateQueries({ queryKey: ['terminals', businessId] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditTerminal(null); setForm(emptyForm); setShowForm(true) }

  const openEdit = (t: Terminal) => {
    setEditTerminal(t)
    setForm({ name: t.name, location: t.location ?? '', outlet_id: t.outlet_id ?? '', is_active: t.is_active })
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setEditTerminal(null); setForm(emptyForm) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Nama terminal harus diisi'); return }
    if (editTerminal) updateMut.mutate(); else createMut.mutate()
  }

  const handleDelete = (t: Terminal) => {
    if (!confirm(`Hapus terminal "${t.name}"?`)) return
    deleteMut.mutate(t.id)
  }

  const columns = [
    {
      key: 'name',
      label: 'Terminal',
      render: (row: Terminal) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
            <Monitor size={14} className="text-violet-600" />
          </div>
          <div>
            <p className="font-medium text-foreground">{row.name}</p>
            {row.location && <p className="text-xs text-muted-foreground">{row.location}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'outlet',
      label: 'Outlet',
      render: (row: Terminal) => (
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          {row.outlet ? <><GitBranch size={12} className="shrink-0" />{row.outlet.name}</> : <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (row: Terminal) => (
        <Badge variant={row.is_active ? 'green' : 'red'}>
          {row.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row: Terminal) => (
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
      <Header title="Terminal" subtitle="Perangkat POS yang digunakan kasir untuk membuka shift" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari terminal..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-sm text-muted-foreground ml-auto shrink-0">
              Total: <span className="font-semibold text-foreground">{pagination?.total ?? 0}</span>
            </p>
            <button
              onClick={openCreate}
              data-tour="terminal-add"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shrink-0"
            >
              <Plus size={14} />
              Tambah Terminal
            </button>
          </div>
          <DataTable
            columns={columns as never[]}
            data={terminals as never[]}
            loading={isLoading}
            emptySlot={
              <EmptyState
                title="Belum ada terminal kasir"
                description="Terminal menghubungkan App Kasir di perangkat ke outlet Anda. Kasir login dengan PIN per terminal."
                action={{ label: 'Tambah Terminal', icon: <Plus size={14} />, onClick: openCreate }}
                hint="Pastikan outlet sudah dibuat sebelum menambahkan terminal."
              />
            }
          />
          <Pagination page={page} total={pagination?.total ?? 0} limit={20} onChange={setPage} />
        </div>
      </div>

      <Modal open={showForm} onClose={closeForm} title={editTerminal ? 'Edit Terminal' : 'Tambah Terminal'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Nama Terminal <span className="text-red-500 dark:text-red-400">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Contoh: Kasir Utama"
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Lokasi</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Contoh: Lantai 1, Pintu Masuk"
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Outlet <span className="text-muted-foreground font-normal">(opsional)</span>
            </label>
            <select
              value={form.outlet_id}
              onChange={(e) => setForm({ ...form, outlet_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tidak terikat outlet</option>
              {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active_terminal"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="is_active_terminal" className="text-sm text-foreground">Terminal aktif</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeForm} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted transition">
              Batal
            </button>
            <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition">
              {isPending ? 'Menyimpan...' : editTerminal ? 'Simpan' : 'Buat Terminal'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
