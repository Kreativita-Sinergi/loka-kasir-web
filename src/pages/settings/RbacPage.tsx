import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { getRoles, createRole, updateRole, deleteRole } from '@/api/master'
import { getErrorMessage } from '@/lib/utils'
import type { Role } from '@/types'

// ─── Permission matrix (display only — assigned server-side per role code) ────

const ROLE_PERMISSIONS: Record<string, { label: string; codes: string[] }> = {
  OWNER: {
    label: 'Owner',
    codes: [
      'Semua fitur', 'Laporan keuangan', 'Manajemen karyawan',
      'RBAC & roles', 'Pengaturan bisnis', 'Membership',
    ],
  },
  MANAGER: {
    label: 'Manager',
    codes: [
      'Semua fitur', 'Laporan keuangan', 'Manajemen karyawan',
      'Pengaturan bisnis',
    ],
  },
  ADMIN: {
    label: 'Admin',
    codes: [
      'Dashboard', 'Transaksi', 'Produk', 'Inventori',
      'Laporan umum', 'Manajemen karyawan',
    ],
  },
  KASIR: {
    label: 'Kasir',
    codes: ['Buka/tutup shift', 'Buat order', 'Proses pembayaran'],
  },
  PELAYAN: {
    label: 'Pelayan',
    codes: ['Buat order (tanpa pembayaran)'],
  },
  KOKI: {
    label: 'Koki / KDS',
    codes: ['Lihat & update status KDS', 'View dapur'],
  },
  GUDANG: {
    label: 'Gudang',
    codes: ['Inventori', 'Transfer stok', 'Riwayat stok'],
  },
  KURIR: {
    label: 'Kurir',
    codes: ['Lihat transaksi (read-only)'],
  },
}

function PermissionPills({ code }: { code?: string }) {
  const mapped = code ? ROLE_PERMISSIONS[code.toUpperCase()] : null
  if (!mapped) return <span className="text-xs text-gray-400">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {mapped.codes.map((c) => (
        <span key={c} className="text-[10px] font-medium px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
          {c}
        </span>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RbacPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editRole, setEditRole] = useState<Role | null>(null)
  const [name, setName] = useState('')

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
      key: 'permissions',
      label: 'Hak Akses',
      render: (row: Role) => <PermissionPills code={row.code} />,
    },
    {
      key: 'actions',
      label: '',
      render: (row: Role) => (
        <div className="flex items-center gap-1 justify-end">
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
              Setiap karyawan memiliki satu role. Role menentukan fitur apa saja yang bisa diakses
              di App Kasir maupun Web Admin. Hak akses detail dikonfigurasi di level server
              berdasarkan kode role (KASIR, OWNER, dll).
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

        {/* Permission Matrix Reference */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Matriks Hak Akses</p>
            <p className="text-xs text-gray-400 mt-0.5">Ringkasan akses per role bawaan sistem</p>
          </div>
          <div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
            {Object.values(ROLE_PERMISSIONS).map((r) => (
              <div key={r.label} className="flex gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <ShieldCheck size={14} className="text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-700 mb-1.5">{r.label}</p>
                  <div className="flex flex-wrap gap-1">
                    {r.codes.map((c) => (
                      <span
                        key={c}
                        className="text-[10px] font-medium px-2 py-0.5 bg-white border border-gray-200 text-gray-600 rounded-full"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Form Modal */}
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
    </div>
  )
}
