import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, Plus, Pencil, Trash2, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import ShiftScheduleFormModal from '@/components/shifts/ShiftScheduleFormModal'
import { getShifts, getShiftSchedules, deleteShiftSchedule } from '@/api/shifts'
import { useAuthStore } from '@/store/authStore'
import type { Shift, ShiftSchedule } from '@/types'
import { formatCurrency, formatDateTime, getErrorMessage } from '@/lib/utils'
import { exportToCSV, csvFilename } from '@/lib/exportUtils'

function pad(n: number) { return String(n).padStart(2, '0') }
function formatTime(hour: number, minute: number) { return `${pad(hour)}:${pad(minute)}` }

function alertBadge(status: string) {
  const map: Record<string, { label: string; variant: 'green' | 'blue' | 'yellow' | 'red' | 'gray' }> = {
    normal:       { label: 'Normal',   variant: 'green' },
    '1_hour':     { label: '< 1 jam',  variant: 'blue' },
    '30_minutes': { label: '< 30 mnt', variant: 'yellow' },
    '5_minutes':  { label: '< 5 mnt',  variant: 'red' },
    shift_ended:  { label: 'Selesai',  variant: 'gray' },
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
    onSuccess: () => { toast.success('Jadwal Shift Dihapus'); qc.invalidateQueries({ queryKey: ['shift-schedules'] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditSchedule(null); setShowForm(true) }
  const openEdit = (s: ShiftSchedule) => { setEditSchedule(s); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditSchedule(null) }

  const handleDelete = (s: ShiftSchedule) => {
    if (!confirm(`Hapus jadwal "${s.name}"?`)) return
    deleteMut.mutate(s.id)
  }

  const handleExportShifts = () => {
    const rows = shifts.map(s => ({
      'Kasir': s.cashier?.business?.owner_name ?? '-',
      'Terminal': s.terminal?.name ?? '-',
      'Outlet': s.outlet?.name ?? '-',
      'Dibuka': formatDateTime(s.opened_at),
      'Ditutup': s.closed_at ? formatDateTime(s.closed_at) : '-',
      'Total Penjualan (Rp)': s.total_sales ?? 0,
      'Status': s.status === 'open' ? 'Buka' : 'Tutup',
    }))
    exportToCSV(rows, csvFilename('riwayat-shift'))
  }

  const shiftColumns = [
    {
      key: 'cashier',
      label: 'Kasir',
      render: (row: Shift) => (
        <div>
          <p className="font-medium text-gray-900">{row.cashier?.business?.owner_name ?? '-'}</p>
          <p className="text-xs text-gray-400">{row.terminal?.name ?? '-'}</p>
        </div>
      ),
    },
    {
      key: 'outlet',
      label: 'Outlet',
      render: (row: Shift) => <span className="text-sm text-gray-500">{row.outlet?.name ?? <span className="text-gray-300">—</span>}</span>,
    },
    {
      key: 'opened_at',
      label: 'Dibuka',
      render: (row: Shift) => <span className="text-sm text-gray-600">{formatDateTime(row.opened_at)}</span>,
    },
    {
      key: 'closed_at',
      label: 'Ditutup',
      render: (row: Shift) => <span className="text-sm text-gray-500">{row.closed_at ? formatDateTime(row.closed_at) : '-'}</span>,
    },
    {
      key: 'total_sales',
      label: 'Total Penjualan',
      render: (row: Shift) => <span className="font-semibold text-gray-900">{formatCurrency(row.total_sales ?? 0)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Shift) => (
        <Badge variant={row.status === 'open' ? 'green' : 'gray'}>{row.status === 'open' ? 'Buka' : 'Tutup'}</Badge>
      ),
    },
    {
      key: 'alert_status',
      label: 'Alert',
      render: (row: Shift) => alertBadge(row.alert_status),
    },
  ]

  const scheduleColumns = [
    {
      key: 'name',
      label: 'Nama Jadwal',
      render: (row: ShiftSchedule) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
            <Clock size={14} className="text-blue-500" />
          </div>
          <p className="font-medium text-gray-900">{row.name}</p>
        </div>
      ),
    },
    {
      key: 'hours',
      label: 'Jam Kerja',
      render: (row: ShiftSchedule) => (
        <span className="text-sm text-gray-700 font-mono">
          {formatTime(row.start_hour, row.start_minute)} → {formatTime(row.end_hour, row.end_minute)}
          {row.is_next_day && <span className="ml-1 text-xs text-amber-500">(+1 hari)</span>}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (row: ShiftSchedule) => (
        <Badge variant={row.is_active ? 'green' : 'red'}>{row.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row: ShiftSchedule) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(row) }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
            <Pencil size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(row) }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Shift" subtitle="Monitor Sesi Shift Kasir dan Kelola Jadwal Shift" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <Clock size={16} className="text-blue-500" />
            <span className="text-sm font-semibold text-gray-700">Jadwal Shift</span>
            <span className="text-xs text-gray-400">{schedules.length} jadwal</span>
            <button onClick={openCreate} className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shrink-0">
              <Plus size={14} /> Tambah Jadwal
            </button>
          </div>
          <DataTable columns={scheduleColumns as never[]} data={schedules as never[]} loading={schedulesLoading} emptyMessage="Belum Ada Jadwal Shift" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <Clock size={16} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-600">Riwayat Sesi Shift</span>
            <span className="text-xs text-gray-400">{shifts.length} sesi</span>
            <button onClick={handleExportShifts} disabled={!shifts.length}
              className="ml-auto flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition shrink-0">
              <Download size={14} /> Export CSV
            </button>
          </div>
          <DataTable columns={shiftColumns as never[]} data={shifts as never[]} loading={shiftsLoading} emptyMessage="Belum Ada Data Shift" />
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
    </div>
  )
}
