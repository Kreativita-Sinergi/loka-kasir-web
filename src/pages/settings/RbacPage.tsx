import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Plus, Pencil, Trash2, Settings2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import {
  getRoles, createRole, updateRole, deleteRole,
  getAllPermissions, getRolePermissions, updateRolePermissions,
} from '@/api/master'
import type { Permission } from '@/api/master'
import { getErrorMessage } from '@/lib/utils'
import type { Role } from '@/types'

const MODULE_LABELS: Record<string, string> = {
  pos: 'POS & Kasir',
  reports: 'Laporan',
  inventory: 'Inventori',
  employee: 'Karyawan',
  settings: 'Pengaturan',
}

// ─── Permission Matrix Modal ───────────────────────────────────────────────────

function PermissionModal({
  role,
  onClose,
}: {
  role: Role
  onClose: () => void
}) {
  const qc = useQueryClient()

  const { data: allPermsData, isLoading: loadingPerms } = useQuery({
    queryKey: ['permissions-all'],
    queryFn: getAllPermissions,
    staleTime: 10 * 60_000,
  })

  const { data: grantedData, isLoading: loadingGranted } = useQuery({
    queryKey: ['role-permissions', role.id],
    queryFn: () => getRolePermissions(role.id),
  })

  const [checked, setChecked] = useState<Set<number>>(() => new Set())
  const [initialized, setInitialized] = useState(false)

  // Sync server data into local state once loaded
  if (!initialized && grantedData?.data?.data) {
    setChecked(new Set(grantedData.data.data))
    setInitialized(true)
  }

  const saveMut = useMutation({
    mutationFn: () => updateRolePermissions(role.id, [...checked]),
    onSuccess: () => {
      toast.success('Hak akses berhasil disimpan')
      qc.invalidateQueries({ queryKey: ['role-permissions', role.id] })
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const allPerms: Permission[] = allPermsData?.data?.data ?? []

  const byModule = allPerms.reduce<Record<string, Permission[]>>((acc, p) => {
    ;(acc[p.module] ??= []).push(p)
    return acc
  }, {})

  const toggle = (id: number) =>
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleModule = (perms: Permission[]) => {
    const allChecked = perms.every((p) => checked.has(p.id))
    setChecked((prev) => {
      const next = new Set(prev)
      perms.forEach((p) => (allChecked ? next.delete(p.id) : next.add(p.id)))
      return next
    })
  }

  const loading = loadingPerms || loadingGranted

  return (
    <Modal open onClose={onClose} title={`Hak Akses — ${role.name}`} size="md">
      {loading ? (
        <div className="py-10 text-center text-sm text-gray-400">Memuat data...</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byModule).map(([mod, perms]) => {
            const allChecked = perms.every((p) => checked.has(p.id))
            const someChecked = perms.some((p) => checked.has(p.id))
            return (
              <div key={mod} className="border border-gray-100 rounded-xl overflow-hidden">
                {/* Module header */}
                <button
                  type="button"
                  onClick={() => toggleModule(perms)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
                >
                  <input
                    type="checkbox"
                    readOnly
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = !allChecked && someChecked }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 pointer-events-none"
                  />
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    {MODULE_LABELS[mod] ?? mod}
                  </span>
                  <span className="ml-auto text-[10px] text-gray-400">
                    {perms.filter((p) => checked.has(p.id)).length}/{perms.length}
                  </span>
                </button>
                {/* Permission rows */}
                <div className="divide-y divide-gray-50">
                  {perms.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-start gap-3 px-4 py-2.5 hover:bg-blue-50/40 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={checked.has(p.id)}
                        onChange={() => toggle(p.id)}
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
              className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {saveMut.isPending ? 'Menyimpan...' : 'Simpan Hak Akses'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RbacPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editRole, setEditRole] = useState<Role | null>(null)
  const [name, setName] = useState('')
  const [permRole, setPermRole] = useState<Role | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  })

  const roles: Role[] = data?.data?.data ?? []

  const createMut = useMutation({
    mutationFn: () => createRole({ name }),
    onSuccess: () => {
      toast.success('Role berhasil dibuat')
      qc.invalidateQueries({ queryKey: ['roles'] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateRole(editRole!.id, { name }),
    onSuccess: () => {
      toast.success('Role diperbarui')
      qc.invalidateQueries({ queryKey: ['roles'] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: () => {
      toast.success('Role dihapus')
      qc.invalidateQueries({ queryKey: ['roles'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditRole(null); setName(''); setShowForm(true) }
  const openEdit = (r: Role) => { setEditRole(r); setName(r.name); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditRole(null); setName('') }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Nama role harus diisi'); return }
    editRole ? updateMut.mutate() : createMut.mutate()
  }

  const handleDelete = (r: Role) => {
    if (!confirm(`Hapus role "${r.name}"? Semua karyawan dengan role ini akan terpengaruh.`)) return
    deleteMut.mutate(r.id)
  }

  const isPending = createMut.isPending || updateMut.isPending

  const columns = [
    {
      key: 'name',
      label: 'Role',
      render: (row: Role) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
            <ShieldCheck size={14} className="text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{row.name}</p>
            {row.code && (
              <code className="text-[10px] text-gray-400 font-mono">{row.code}</code>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row: Role) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); setPermRole(row) }}
            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
            title="Kelola Hak Akses"
          >
            <Settings2 size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row) }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
            title="Edit Nama"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(row) }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Hapus Role"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Hak Akses (RBAC)"
        subtitle="Kelola role dan hak akses karyawan"
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Info Banner */}
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
          <ShieldCheck size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Role-Based Access Control</p>
            <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
              Setiap karyawan memiliki satu role. Klik ikon <strong>Kelola Hak Akses</strong> (⚙️) pada
              baris role untuk mengatur permission yang berlaku di bisnis Anda.
            </p>
          </div>
        </div>

        {/* Role Table */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <ShieldCheck size={16} className="text-blue-500" />
            <span className="text-sm font-semibold text-gray-700">Daftar Role</span>
            <span className="text-xs text-gray-400">{roles.length} role</span>
            <button
              onClick={openCreate}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shrink-0"
            >
              <Plus size={14} />
              Tambah Role
            </button>
          </div>
          <DataTable
            columns={columns as never[]}
            data={roles as never[]}
            loading={isLoading}
            emptyMessage="Belum Ada Role"
          />
        </div>

      </div>

      {/* Create / Edit Role Modal */}
      <Modal
        open={showForm}
        onClose={closeForm}
        title={editRole ? 'Edit Role' : 'Tambah Role'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nama Role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Supervisor, Resepsionis"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
              {isPending ? 'Menyimpan...' : editRole ? 'Simpan' : 'Buat Role'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Permission Matrix Modal */}
      {permRole && (
        <PermissionModal role={permRole} onClose={() => setPermRole(null)} />
      )}
    </div>
  )
}
