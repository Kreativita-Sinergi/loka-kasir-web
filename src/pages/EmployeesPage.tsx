import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, KeyRound } from 'lucide-react'
import { EditButton, DeleteButton } from '@/components/ui/RowActions'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import EmptyState from '@/components/ui/EmptyState'
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
import { t } from '@/lib/i18n'
import { roleLabel } from '@/lib/roles'

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
    onSuccess: () => { toast.success(t('employeeDeleted')); qc.invalidateQueries({ queryKey: ['employees'] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditEmployee(null); setShowForm(true) }
  const openEdit = (e: Employee) => { setEditEmployee(e); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditEmployee(null) }

  const handleDelete = (e: Employee) => {
    if (!confirm(t('confirmDeleteNamed', { name: e.name }))) return
    deleteMut.mutate(e.id)
  }

  const columns = [
    {
      key: 'name',
      label: t('navEmployees'),
      render: (row: Employee) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm shrink-0">
            {row.name?.[0]?.toUpperCase() ?? 'K'}
          </div>
          <div>
            <p className="font-medium text-foreground">{row.name}</p>
            {/* Nama masuk berdiri di barisnya sendiri, bukan menggantikan
                nomor telepon: pemilik yang membuka daftar ini biasanya sedang
                ditanya kasirnya "saya masuk pakai apa?", dan itulah satu-satunya
                jawaban yang tidak bisa ia karang sendiri — server yang
                membuatnya. */}
            {row.username && (
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{row.username}</p>
            )}
            <p className="text-xs text-muted-foreground">{row.phone_number || row.email || '-'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: t('employeeRole'),
      render: (row: Employee) => <Badge variant="purple">{roleLabel(row.role) || '-'}</Badge>,
    },
    {
      key: 'shift_schedule',
      label: t('employeeShiftSchedule'),
      render: (row: Employee) => (
        <span className="text-sm text-muted-foreground">{row.shift_schedule?.name ?? <span className="text-muted-foreground">—</span>}</span>
      ),
    },
    {
      key: 'is_active',
      label: t('labelStatus'),
      render: (row: Employee) => (
        <Badge variant={row.is_active ? 'green' : 'red'}>{row.is_active ? t('statusActive') : t('statusInactiveShort')}</Badge>
      ),
    },
    {
      key: 'created_at',
      label: t('labelAddedOn'),
      render: (row: Employee) => <span className="text-xs text-muted-foreground">{formatDate(row.created_at)}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (row: Employee) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); setResetPinEmployee(row) }}
            className="p-1.5 text-muted-foreground hover:text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:bg-amber-500/10 rounded-lg transition" title={t('employeeNewPin')}>
            <KeyRound size={14} />
          </button>
          <EditButton onClick={() => openEdit(row)} />
          <DeleteButton onClick={() => handleDelete(row)} />
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('navEmployees')} subtitle={t('employeePageSubtitle')} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('employeeSearch')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-sm text-muted-foreground ml-auto shrink-0">
              {t('totalColon')} <span className="font-semibold text-foreground">{pagination?.total ?? 0}</span>
            </p>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shrink-0">
              <Plus size={14} /> {t('employeeAdd')}
            </button>
          </div>
          <DataTable
            columns={columns as never[]}
            data={employees as never[]}
            loading={isLoading}
            emptySlot={
              <EmptyState
                title={t('employeeEmpty')}
                description={t('employeeEmptyDesc')}
                action={{ label: t('employeeAdd'), icon: <Plus size={14} />, onClick: openCreate }}
              />
            }
          />
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
