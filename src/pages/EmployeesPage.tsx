import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Pencil, Trash2, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '@/api/employees'
import type { CreateEmployeePayload, UpdateEmployeePayload } from '@/api/employees'
import { getShiftSchedules } from '@/api/shifts'
import { getRoles } from '@/api/master'
import { useAuthStore } from '@/store/authStore'
import type { Employee, Role, ShiftSchedule } from '@/types'
import { formatDate, getErrorMessage } from '@/lib/utils'

interface FormState {
  name: string
  identifier: string
  phone_number: string
  pin: string
  password: string
  role_id: string
  shift_schedule_id: string
  is_active: boolean
}

const EMPTY_FORM: FormState = {
  name: '', identifier: '', phone_number: '', pin: '', password: '',
  role_id: '', shift_schedule_id: '',
  is_active: true,
}

function employeeToForm(e: Employee): FormState {
  return {
    name: e.name,
    identifier: e.email || e.phone_number || '',
    phone_number: '',
    pin: '',
    password: '',
    role_id: String(e.role?.id ?? ''),
    shift_schedule_id: e.shift_schedule?.id ?? '',
    is_active: e.is_active,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
//
// Field requirements per role (from Daftar Hak Akses):
//
//  Role       | Password | PIN
//  -----------|----------|-----
//  OWNER      |    ✓     |  ✓   (CMS + App + Login Kasir PIN)
//  ADMIN      |    ✓     |  ✓
//  MANAGER    |    ✓     |  ✓
//  WAREHOUSE  |    ✓     |  ✓
//  KASIR      |    ✓     |  ✓   (App login + Login Kasir PIN)
//  WAITERS    |    ✓     |  -   (App login only, no shift PIN)
//  STAFF      |    -     |  -   (attendance via other staff's device)

// Codes that require a PIN (all roles that have "Login Kasir (PIN)" in mobile access)
const PIN_ROLES = new Set(['OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'KASIR'])
// Codes that require a password (all roles that can log in to CMS or mobile app)
const PASSWORD_ROLES = new Set(['OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'KASIR', 'WAITERS'])

const getRoleCode = (roleId: string, roles: Role[]) =>
  roles.find(r => String(r.id) === roleId)?.code?.toUpperCase() ?? ''

const needsPIN = (roleId: string, roles: Role[]) => PIN_ROLES.has(getRoleCode(roleId, roles))
const needsPassword = (roleId: string, roles: Role[]) => PASSWORD_ROLES.has(getRoleCode(roleId, roles))

const isEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)

// ─── Reset PIN Modal ──────────────────────────────────────────────────────────

function ResetPinModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const qc = useQueryClient()
  const [pin, setPin] = useState('')

  const mut = useMutation({
    mutationFn: () => updateEmployee(employee.id, { pin }),
    onSuccess: () => {
      toast.success(`PIN ${employee.name} berhasil direset`)
      qc.invalidateQueries({ queryKey: ['employees'] })
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length !== 4) { toast.error('PIN harus 4 digit'); return }
    mut.mutate()
  }

  return (
    <Modal open onClose={onClose} title="Reset PIN Karyawan" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <KeyRound size={16} className="text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">
            Reset PIN untuk <span className="font-semibold">{employee.name}</span>.
            Informasikan PIN baru ke karyawan setelah disimpan.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            PIN Baru <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="4 digit PIN"
            autoFocus
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest"
          />
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
            type="submit"
            disabled={mut.isPending}
            className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {mut.isPending ? 'Menyimpan...' : 'Simpan PIN'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const businessId = user?.business?.id ?? ''

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [resetPinEmployee, setResetPinEmployee] = useState<Employee | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['employees', { page, limit: 10, search }],
    queryFn: () => getEmployees({ page, limit: 10, search: search || undefined }),
  })

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
    staleTime: 5 * 60_000,
  })

  const { data: schedulesData } = useQuery({
    queryKey: ['shift-schedules', businessId],
    queryFn: () => getShiftSchedules({ limit: 50 }),
    enabled: !!businessId,
    staleTime: 60_000,
  })

  const employees = data?.data?.data ?? []
  const pagination = data?.data?.pagination
  const roles: Role[] = rolesData?.data?.data ?? []
  const schedules: ShiftSchedule[] = schedulesData?.data?.data ?? []

  const createMut = useMutation({
    mutationFn: () => {
      const payload: CreateEmployeePayload = {
        name: form.name,
        role_id: Number(form.role_id),
        shift_schedule_id: form.shift_schedule_id || null,
      }

      if (isEmail(form.identifier)) {
        payload.email = form.identifier
        payload.phone_number = form.phone_number || null
      } else {
        payload.email = null
        payload.phone_number = form.identifier || form.phone_number || null
      }

      if (needsPIN(form.role_id, roles)) payload.pin = form.pin
      if (needsPassword(form.role_id, roles)) payload.password = form.password
      return createEmployee(payload)
    },
    onSuccess: () => {
      toast.success('Karyawan Berhasil Ditambahkan')
      qc.invalidateQueries({ queryKey: ['employees'] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => {
      const payload: UpdateEmployeePayload = {
        name: form.name,
        role_id: Number(form.role_id),
        shift_schedule_id: form.shift_schedule_id || null,
        is_active: form.is_active,
      }

      if (isEmail(form.identifier)) {
        payload.email = form.identifier
        payload.phone_number = form.phone_number || null
      } else {
        payload.email = null
        payload.phone_number = form.identifier || form.phone_number || null
      }

      if (needsPIN(form.role_id, roles) && form.pin) payload.pin = form.pin
      if (needsPassword(form.role_id, roles) && form.password) payload.password = form.password
      return updateEmployee(editEmployee!.id, payload)
    },
    onSuccess: () => {
      toast.success('Karyawan Berhasil Diperbarui')
      qc.invalidateQueries({ queryKey: ['employees'] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => {
      toast.success('Karyawan Dihapus')
      qc.invalidateQueries({ queryKey: ['employees'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditEmployee(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit = (e: Employee) => { setEditEmployee(e); setForm(employeeToForm(e)); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditEmployee(null); setForm(EMPTY_FORM) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Nama Harus Diisi'); return }
    if (!form.role_id) { toast.error('Role Harus Dipilih'); return }

    // Validation based on role
    if (needsPIN(form.role_id, roles) && !editEmployee && form.pin.length !== 4) {
      toast.error('PIN Harus 4 Digit')
      return
    }
    if (needsPassword(form.role_id, roles) && !editEmployee && !form.password) {
      toast.error('Password Harus Diisi')
      return
    }

    if (editEmployee) updateMut.mutate()
    else createMut.mutate()
  }

  const handleDelete = (e: Employee) => {
    if (!confirm(`Hapus karyawan "${e.name}"?`)) return
    deleteMut.mutate(e.id)
  }

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const isPending = createMut.isPending || updateMut.isPending

  const columns = [
    {
      key: 'name',
      label: 'Karyawan',
      render: (row: Employee) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm shrink-0">
            {row.name?.[0]?.toUpperCase() ?? 'K'}
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.name}</p>
            <p className="text-xs text-gray-400">{row.phone_number || '-'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (row: Employee) => <Badge variant="purple">{row.role?.name ?? '-'}</Badge>,
    },
    {
      key: 'shift_schedule',
      label: 'Jadwal Shift',
      render: (row: Employee) => (
        <span className="text-sm text-gray-500">{row.shift_schedule?.name ?? <span className="text-gray-300">—</span>}</span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (row: Employee) => (
        <Badge variant={row.is_active ? 'green' : 'red'}>
          {row.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Ditambahkan',
      render: (row: Employee) => <span className="text-xs text-gray-400">{formatDate(row.created_at)}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (row: Employee) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setResetPinEmployee(row) }}
            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
            title="Reset PIN"
          >
            <KeyRound size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row) }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(row) }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Hapus"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Karyawan" subtitle="Data Semua Karyawan Bisnis" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari Karyawan..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-sm text-gray-500 ml-auto shrink-0">
              Total: <span className="font-semibold text-gray-900">{pagination?.total ?? 0}</span>
            </p>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shrink-0"
            >
              <Plus size={14} />
              Tambah Karyawan
            </button>
          </div>
          <DataTable
            columns={columns as never[]}
            data={employees as never[]}
            loading={isLoading}
            emptyMessage="Belum Ada Karyawan"
          />
          <Pagination page={page} total={pagination?.total ?? 0} limit={10} onChange={setPage} />
        </div>
      </div>

      <Modal open={showForm} onClose={closeForm} title={editEmployee ? 'Edit Karyawan' : 'Tambah Karyawan'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nama <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Nama Lengkap Karyawan"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email / No. HP {needsPassword(form.role_id, roles) && <span className="text-red-500">*</span>}</label>
            <input
              type="text"
              value={form.identifier}
              onChange={(e) => set('identifier', e.target.value)}
              placeholder="email@bisnis.com atau 08xxxxxxxxxx"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Kontak Alternatif (Opsional)</label>
            <input
              type="tel"
              value={form.phone_number}
              onChange={(e) => set('phone_number', e.target.value)}
              placeholder="Misal: Nomor HP lain"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role <span className="text-red-500">*</span></label>
            <select
              value={form.role_id}
              onChange={(e) => set('role_id', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
            >
              <option value="">— Pilih Role —</option>
              {roles.map(r => <option key={r.id} value={String(r.id)}>{r.name}</option>)}
            </select>
          </div>

          {needsPassword(form.role_id, roles) && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Password {!editEmployee && <span className="text-red-500">*</span>}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder={editEmployee ? 'Kosongkan jika tidak ganti' : 'Password login Web'}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {needsPIN(form.role_id, roles) && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                PIN (4 digit) {!editEmployee && <span className="text-red-500">*</span>}
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={form.pin}
                onChange={(e) => set('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder={editEmployee ? 'Kosongkan jika tidak ganti' : '4 digit angka'}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Jadwal Shift <span className="text-gray-400 font-normal">(Opsional)</span>
            </label>
            <select
              value={form.shift_schedule_id}
              onChange={(e) => set('shift_schedule_id', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
            >
              <option value="">— Tidak Ada Jadwal —</option>
              {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {editEmployee && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set('is_active', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Karyawan Aktif</span>
            </label>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeForm} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
              Batal
            </button>
            <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition">
              {isPending ? 'Menyimpan...' : editEmployee ? 'Simpan' : 'Tambah Karyawan'}
            </button>
          </div>
        </form>
      </Modal>

      {resetPinEmployee && (
        <ResetPinModal
          employee={resetPinEmployee}
          onClose={() => setResetPinEmployee(null)}
        />
      )}
    </div>
  )
}
