import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Pencil, Trash2, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import EmployeeFormModal from '@/components/employees/EmployeeFormModal'
import ResetPinModal from '@/components/employees/ResetPinModal'
import { getEmployees, deleteEmployee } from '@/api/employees'
import { getShiftSchedules } from '@/api/shifts'
import { getRoles } from '@/api/master'
import { useAuthStore } from '@/store/authStore'
import type { Employee, Role, ShiftSchedule } from '@/types'
import { formatDate, getErrorMessage } from '@/lib/utils'

export default function EmployeesPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const businessId = user?.business?.id ?? ''

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)
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

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => { toast.success('Karyawan Dihapus'); qc.invalidateQueries({ queryKey: ['employees'] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditEmployee(null); setShowForm(true) }
  const openEdit = (e: Employee) => { setEditEmployee(e); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditEmployee(null) }

  const handleDelete = (e: Employee) => {
    if (!confirm(`Hapus karyawan "${e.name}"?`)) return
    deleteMut.mutate(e.id)
  }

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
        <Badge variant={row.is_active ? 'green' : 'red'}>{row.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
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
          <button onClick={(e) => { e.stopPropagation(); setResetPinEmployee(row) }}
            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Reset PIN">
            <KeyRound size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); openEdit(row) }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(row) }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Hapus">
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
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shrink-0">
              <Plus size={14} /> Tambah Karyawan
            </button>
          </div>
          <DataTable columns={columns as never[]} data={employees as never[]} loading={isLoading} emptyMessage="Belum Ada Karyawan" />
          <Pagination page={page} total={pagination?.total ?? 0} limit={10} onChange={setPage} />
        </div>
      </div>

      <EmployeeFormModal
        employee={editEmployee}
        roles={roles}
        schedules={schedules}
        open={showForm}
        onClose={closeForm}
        onSuccess={closeForm}
      />

      {resetPinEmployee && (
        <ResetPinModal employee={resetPinEmployee} onClose={() => setResetPinEmployee(null)} />
      )}
    </div>
  )
}
