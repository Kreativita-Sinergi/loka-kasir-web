import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, Plus, Download, Eye } from 'lucide-react'
import { EditButton, DeleteButton } from '@/components/ui/RowActions'
import EmptyState from '@/components/ui/EmptyState'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import ShiftScheduleFormModal from '@/components/shifts/ShiftScheduleFormModal'
import ShiftDetailModal from '@/components/shifts/ShiftDetailModal'
import { getShifts, getShiftSchedules, deleteShiftSchedule } from '@/api/shifts'
import { useAuthStore } from '@/store/authStore'
import type { Shift, ShiftSchedule } from '@/types'
import { formatCurrency, formatDateTime, getErrorMessage } from '@/lib/utils'
import { exportToCSV, csvFilename } from '@/lib/exportUtils'
import { t } from '@/lib/i18n'

function pad(n: number) { return String(n).padStart(2, '0') }
function formatTime(hour: number, minute: number) { return `${pad(hour)}:${pad(minute)}` }

function alertBadge(status: string) {
  const map: Record<string, { label: string; variant: 'green' | 'blue' | 'yellow' | 'red' | 'gray' }> = {
    normal:       { label: t('shiftAlertNormal'),     variant: 'green' },
    '1_hour':     { label: t('shiftAlertOneHour'),    variant: 'blue' },
    '30_minutes': { label: t('shiftAlertThirtyMin'),  variant: 'yellow' },
    '5_minutes':  { label: t('shiftAlertFiveMin'),    variant: 'red' },
    shift_ended:  { label: t('shiftAlertEnded'),      variant: 'gray' },
  }
  const s = map[status] ?? { label: status, variant: 'gray' as const }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

export default function ShiftsPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const businessId = user?.business?.id ?? ''

  const [showForm, setShowForm] = useState(false)
  const [editSchedule, setEditSchedule] = useState<ShiftSchedule | null>(null)
  const [detailShift, setDetailShift] = useState<Shift | null>(null)
  const [shiftsPage, setShiftsPage] = useState(1)
  const shiftsLimit = 10

  const { data: shiftsData, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', { page: shiftsPage, limit: shiftsLimit }],
    queryFn: () => getShifts({ page: shiftsPage, limit: shiftsLimit }),
  })

  const { data: schedulesData, isLoading: schedulesLoading } = useQuery({
    queryKey: ['shift-schedules', businessId],
    queryFn: () => getShiftSchedules({ limit: 50 }),
    enabled: !!businessId,
  })

  const shifts: Shift[] = shiftsData?.data?.data?.results ?? []
  const shiftsPagination = shiftsData?.data?.data
  const schedules: ShiftSchedule[] = schedulesData?.data?.data ?? []

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteShiftSchedule(id),
    onSuccess: () => { toast.success(t('scheduleDeleted')); qc.invalidateQueries({ queryKey: ['shift-schedules'] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditSchedule(null); setShowForm(true) }
  const openEdit = (s: ShiftSchedule) => { setEditSchedule(s); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditSchedule(null) }

  const handleDelete = (s: ShiftSchedule) => {
    if (!confirm(t('confirmDeleteNamed', { name: s.name }))) return
    deleteMut.mutate(s.id)
  }

  const handleExportShifts = () => {
    const rows = shifts.map(s => ({
      [t('labelCashier')]: s.cashier?.business?.owner_name ?? '-',
      'Terminal': s.terminal?.name ?? '-',
      [t('labelOutlet')]: s.outlet?.name ?? '-',
      'Dibuka': formatDateTime(s.opened_at),
      'Ditutup': s.closed_at ? formatDateTime(s.closed_at) : '-',
      [t('shiftTotalSales')]: s.total_sales ?? 0,
      'Status': s.status === 'open' ? t('shiftOpen') : t('shiftClosed'),
    }))
    exportToCSV(rows, csvFilename('riwayat-shift'))
  }

  const shiftColumns = [
    {
      key: 'cashier',
      label: t('labelCashier'),
      render: (row: Shift) => (
        <div>
          <p className="font-medium text-foreground">{row.cashier?.business?.owner_name ?? '-'}</p>
          <p className="text-xs text-muted-foreground">{row.terminal?.name ?? '-'}</p>
        </div>
      ),
    },
    {
      key: 'outlet',
      label: t('labelOutlet'),
      render: (row: Shift) => <span className="text-sm text-muted-foreground">{row.outlet?.name ?? <span className="text-muted-foreground">—</span>}</span>,
    },
    {
      key: 'opened_at',
      label: t('finOpenedAt'),
      render: (row: Shift) => <span className="text-sm text-muted-foreground">{formatDateTime(row.opened_at)}</span>,
    },
    {
      key: 'closed_at',
      label: t('finClosedAt'),
      render: (row: Shift) => <span className="text-sm text-muted-foreground">{row.closed_at ? formatDateTime(row.closed_at) : '-'}</span>,
    },
    {
      key: 'total_sales',
      label: t('shiftTotalSales'),
      render: (row: Shift) => <span className="font-semibold text-foreground">{formatCurrency(row.total_sales ?? 0)}</span>,
    },
    {
      key: 'status',
      label: t('labelStatus'),
      render: (row: Shift) => (
        <Badge variant={row.status === 'open' ? 'green' : 'gray'}>{row.status === 'open' ? t('shiftOpen') : t('shiftClosed')}</Badge>
      ),
    },
    {
      key: 'alert_status',
      label: t('labelAlert'),
      render: (row: Shift) => alertBadge(row.alert_status),
    },
    {
      key: 'actions',
      label: '',
      render: (row: Shift) => (
        <button
          onClick={(e) => { e.stopPropagation(); setDetailShift(row) }}
          className="p-1.5 text-muted-foreground hover:text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-500/10 rounded-lg transition"
          title={t('shiftViewDetail')}
        >
          <Eye size={14} />
        </button>
      ),
    },
  ]

  const scheduleColumns = [
    {
      key: 'name',
      label: t('scheduleName'),
      render: (row: ShiftSchedule) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 dark:bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
            <Clock size={14} className="text-blue-500 dark:text-blue-400" />
          </div>
          <p className="font-medium text-foreground">{row.name}</p>
        </div>
      ),
    },
    {
      key: 'hours',
      label: t('shiftWorkHours'),
      render: (row: ShiftSchedule) => (
        <span className="text-sm text-foreground font-mono">
          {formatTime(row.start_hour, row.start_minute)} → {formatTime(row.end_hour, row.end_minute)}
          {row.is_next_day && <span className="ml-1 text-xs text-amber-500 dark:text-amber-400">{t('shiftNextDay')}</span>}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: t('labelStatus'),
      render: (row: ShiftSchedule) => (
        <Badge variant={row.is_active ? 'green' : 'red'}>{row.is_active ? t('statusActive') : t('statusInactiveShort')}</Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row: ShiftSchedule) => (
        <div className="flex items-center gap-1">
          <EditButton onClick={() => openEdit(row)} />
          <DeleteButton onClick={() => handleDelete(row)} />
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('navShifts')} subtitle={t('shiftPageSubtitle')} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
            <Clock size={16} className="text-blue-500 dark:text-blue-400" />
            <span className="text-sm font-semibold text-foreground">{t('employeeShiftSchedule')}</span>
            <span className="text-xs text-muted-foreground">{t('scheduleCount', { count: schedules.length })}</span>
            <button onClick={openCreate} className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shrink-0">
              <Plus size={14} /> {t('scheduleAddShort')}
            </button>
          </div>
          <DataTable
            columns={scheduleColumns as never[]}
            data={schedules as never[]}
            loading={schedulesLoading}
            emptySlot={
              <EmptyState
                title={t('shiftScheduleEmpty')}
                description={t('shiftScheduleEmptyDesc')}
                action={{ label: t('scheduleCreate'), icon: <Plus size={14} />, onClick: openCreate }}
              />
            }
          />
        </div>

        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
            <Clock size={16} className="text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">{t('shiftSessionHistory')}</span>
            <span className="text-xs text-muted-foreground">{t('sessionCount', { count: shifts.length })}</span>
            <button onClick={handleExportShifts} disabled={!shifts.length}
              className="ml-auto flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted disabled:opacity-40 transition shrink-0">
              <Download size={14} /> {t('exportCsv')}
            </button>
          </div>
          <DataTable
            columns={shiftColumns as never[]}
            data={shifts as never[]}
            loading={shiftsLoading}
            emptySlot={
              <EmptyState
                title={t('shiftDataEmpty')}
                description={t('shiftDataEmptyDesc')}
              />
            }
          />
          {shiftsPagination && (
            <Pagination
              page={shiftsPage}
              total={shiftsPagination.total}
              limit={shiftsLimit}
              onChange={setShiftsPage}
            />
          )}
        </div>

      </div>

      <ShiftScheduleFormModal
        schedule={editSchedule}
        open={showForm}
        onClose={closeForm}
        onSuccess={closeForm}
      />

      {detailShift && (
        <ShiftDetailModal
          shift={detailShift}
          onClose={() => setDetailShift(null)}
        />
      )}
    </div>
  )
}
