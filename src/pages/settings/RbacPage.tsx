import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShieldCheck, Plus, Pencil, Trash2, Settings2, Lock,
  Users, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import {
  getRoles, createRole, updateRole, deleteRole,
  getAllPermissions, getRolePermissions, updateRolePermissions,
} from '@/api/master'
import type { Permission } from '@/api/master'
import { getErrorMessage } from '@/lib/utils'
import type { Role } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  pos: 'POS & Kasir',
  reports: 'Laporan',
  inventory: 'Inventori',
  employee: 'Karyawan',
  settings: 'Pengaturan',
}

/**
 * System roles that cannot be deleted — mirrors entity/role.go in the backend.
 * Order: OWNER, ADMIN, MANAGER, SUPERVISOR, KASIR, PELAYAN, KOKI, BARISTA, GUDANG, KURIR
 */
const SYSTEM_ROLE_CODES = [
  'OWNER', 'ADMIN', 'MANAGER', 'SUPERVISOR',
  'KASIR', 'PELAYAN', 'KOKI', 'BARISTA', 'GUDANG', 'KURIR',
]

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  OWNER:      { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
  ADMIN:      { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200'   },
  MANAGER:    { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
  SUPERVISOR: { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200'   },
  KASIR:      { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200'  },
  PELAYAN:    { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200' },
  KOKI:       { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200'    },
  BARISTA:    { bg: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-200'   },
  GUDANG:     { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200'  },
  KURIR:      { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200'   },
}

function roleColor(code?: string) {
  return ROLE_COLORS[code ?? ''] ?? { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' }
}

// ─── Permission Matrix Modal ───────────────────────────────────────────────────

function PermissionModal({ role, onClose }: { role: Role; onClose: () => void }) {
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
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
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
  const colors = roleColor(role.code)

  return (
    <Modal open onClose={onClose} title={`Izin Akses — ${role.name}`} size="md">
      {loading ? (
        <div className="py-10 text-center text-sm text-gray-400">Memuat data...</div>
      ) : (
        <div className="space-y-3">
          {/* Role badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${colors.bg} ${colors.text} border ${colors.border}`}>
            <ShieldCheck size={12} />
            {role.code ?? role.name}
          </div>

          <p className="text-xs text-gray-500 pb-1">
            Centang modul atau izin individual yang dapat diakses oleh role ini.
          </p>

          {/* Module groups */}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {Object.entries(byModule).map(([mod, perms]) => {
              const allChecked = perms.every((p) => checked.has(p.id))
              const someChecked = perms.some((p) => checked.has(p.id))
              return (
                <div key={mod} className="border border-gray-100 rounded-xl overflow-hidden">
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
                          {p.description && (
                            <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

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
              {saveMut.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Role Card ─────────────────────────────────────────────────────────────────

function RoleCard({
  role,
  onEdit,
  onDelete,
  onManage,
}: {
  role: Role
  onEdit: (r: Role) => void
  onDelete: (r: Role) => void
  onManage: (r: Role) => void
}) {
  const isSystem = SYSTEM_ROLE_CODES.includes(role.code ?? '')
  const colors = roleColor(role.code)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-shadow flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors.bg} border ${colors.border}`}>
            <ShieldCheck size={18} className={colors.text} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{role.name}</p>
            {role.code && (
              <code className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                {role.code}
              </code>
            )}
          </div>
        </div>

        {isSystem && (
          <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg shrink-0">
            <Lock size={9} />
            Sistem
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
        <button
          onClick={() => onManage(role)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
        >
          <Settings2 size={12} />
          Kelola Izin
          <ChevronRight size={11} className="ml-auto" />
        </button>

        {!isSystem && (
          <>
            <button
              onClick={() => onEdit(role)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
              title="Ubah Nama"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => onDelete(role)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
              title="Hapus Role"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
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
    queryFn: getRoles,
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
    if (editRole) { updateMut.mutate() } else { createMut.mutate() }
  }

  const handleDelete = (r: Role) => {
    if (!confirm(`Hapus role "${r.name}"? Semua karyawan dengan role ini akan terpengaruh.`)) return
    deleteMut.mutate(r.id)
  }

  const isPending = createMut.isPending || updateMut.isPending

  // Split: system roles first, custom roles after
  const systemRoles = roles.filter((r) => SYSTEM_ROLE_CODES.includes(r.code ?? ''))
  const customRoles = roles.filter((r) => !SYSTEM_ROLE_CODES.includes(r.code ?? ''))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Pengaturan Hak Akses"
        subtitle="Konfigurasi izin akses untuk setiap role karyawan"
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* System Roles */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Role Sistem</p>
              <p className="text-xs text-gray-400 mt-0.5">Role bawaan yang tidak dapat dihapus</p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {systemRoles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onManage={(r) => setPermRole(r)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Custom Roles */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Role Kustom</p>
              <p className="text-xs text-gray-400 mt-0.5">Role tambahan yang Anda buat sendiri</p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shrink-0"
            >
              <Plus size={14} />
              Tambah Role
            </button>
          </div>

          {!isLoading && customRoles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-2xl text-center">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                <Users size={18} className="text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-500">Belum ada role kustom</p>
              <p className="text-xs text-gray-400 mt-1">Tambah role baru untuk kebutuhan bisnis spesifik</p>
              <button
                onClick={openCreate}
                className="mt-4 flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition"
              >
                <Plus size={13} />
                Tambah Role
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {customRoles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onManage={(r) => setPermRole(r)}
                />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Create / Edit Role Modal */}
      <Modal
        open={showForm}
        onClose={closeForm}
        title={editRole ? 'Ubah Nama Role' : 'Tambah Role Kustom'}
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
              autoFocus
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
