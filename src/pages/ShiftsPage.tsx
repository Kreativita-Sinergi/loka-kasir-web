import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, Plus, Pencil, Trash2, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { getShifts, getShiftSchedules, createShiftSchedule, updateShiftSchedule, deleteShiftSchedule } from '@/api/shifts'
import { useAuthStore } from '@/store/authStore'
import type { Shift, ShiftSchedule } from '@/types'
import { formatCurrency, formatDateTime, getErrorMessage } from '@/lib/utils'
import { exportToCSV, csvFilename } from '@/lib/exportUtils'

// ─── helpers ─────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0') }
function formatTime(hour: number, minute: number) { return `${pad(hour)}:${pad(minute)}` }

function alertBadge(status: string) {
  const map: Record<string, { label: string; variant: 'green' | 'blue' | 'yellow' | 'red' | 'gray' }> = {
    normal:       { label: 'Normal',    variant: 'green' },
    '1_hour':     { label: '< 1 jam',   variant: 'blue' },
    '30_minutes': { label: '< 30 mnt',  variant: 'yellow' },
    '5_minutes':  { label: '< 5 mnt',   variant: 'red' },
    shift_ended:  { label: 'Selesai',   variant: 'gray' },
  }
  const s = map[status] ?? { label: status, variant: 'gray' as const }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

// ─── Schedule form state ──────────────────────────────────────────────────────

interface ScheduleForm {
  name: string
  start_hour: string
  start_minute: string
  end_hour: string
  end_minute: string
  is_next_day: boolean
  is_active: boolean
}

const EMPTY_SCHEDULE: ScheduleForm = {
  name: '', start_hour: '8', start_minute: '0',
  end_hour: '17', end_minute: '0',
  is_next_day: false, is_active: true,
}

function scheduleToForm(s: ShiftSchedule): ScheduleForm {
  return {
    name: s.name,
    start_hour: String(s.start_hour),
    start_minute: String(s.start_minute),
    end_hour: String(s.end_hour),
    end_minute: String(s.end_minute),
    is_next_day: s.is_next_day,
    is_active: s.is_active,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShiftsPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const businessId = user?.business?.id ?? ''

  const [showForm, setShowForm] = useState(false)
  const [editSchedule, setEditSchedule] = useState<ShiftSchedule | null>(null)
  const [form, setForm] = useState<ScheduleForm>(EMPTY_SCHEDULE)

  // Shift sessions (read-only monitor)
  const { data: shiftsData, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => getShifts({ limit: 20 }),
  })

  // Shift schedules (CRUD)
  const { data: schedulesData, isLoading: schedulesLoading } = useQuery({
    queryKey: ['shift-schedules', businessId],
    queryFn: () => getShiftSchedules({ limit: 50 }),
    enabled: !!businessId,
  })

  const shifts = shiftsData?.data?.data ?? []
  const schedules: ShiftSchedule[] = schedulesData?.data?.data ?? []

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

  const createMut = useMutation({
    mutationFn: () => createShiftSchedule({
      name: form.name,
      start_hour: Number(form.start_hour),
      start_minute: Number(form.start_minute),
      end_hour: Number(form.end_hour),
      end_minute: Number(form.end_minute),
      is_next_day: form.is_next_day,
    }),
    onSuccess: () => {
      toast.success('Jadwal shift berhasil dibuat')
      qc.invalidateQueries({ queryKey: ['shift-schedules'] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateShiftSchedule(editSchedule!.id, {
      name: form.name,
      start_hour: Number(form.start_hour),
      start_minute: Number(form.start_minute),
      end_hour: Number(form.end_hour),
      end_minute: Number(form.end_minute),
      is_next_day: form.is_next_day,
      is_active: form.is_active,
    }),
    onSuccess: () => {
      toast.success('Jadwal shift diperbarui')
      qc.invalidateQueries({ queryKey: ['shift-schedules'] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteShiftSchedule(id),
    onSuccess: () => {
      toast.success('Jadwal shift dihapus')
      qc.invalidateQueries({ queryKey: ['shift-schedules'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditSchedule(null); setForm(EMPTY_SCHEDULE); setShowForm(true) }
  const openEdit = (s: ShiftSchedule) => { setEditSchedule(s); setForm(scheduleToForm(s)); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditSchedule(null); setForm(EMPTY_SCHEDULE) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Nama jadwal harus diisi'); return }
    editSchedule ? updateMut.mutate() : createMut.mutate()
  }

  const handleDelete = (s: ShiftSchedule) => {
    if (!confirm(`Hapus jadwal "${s.name}"?`)) return
    deleteMut.mutate(s.id)
  }

  const set = (field: keyof ScheduleForm, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const isPending = createMut.isPending || updateMut.isPending

  // ── Shift session columns ──
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
      render: (row: Shift) => (
        <span className="text-sm text-gray-500">{row.outlet?.name ?? <span className="text-gray-300">—</span>}</span>
      ),
    },
    {
      key: 'opened_at',
      label: 'Dibuka',
      render: (row: Shift) => <span className="text-sm text-gray-600">{formatDateTime(row.opened_at)}</span>,
    },
    {
      key: 'closed_at',
      label: 'Ditutup',
      render: (row: Shift) => (
        <span className="text-sm text-gray-500">{row.closed_at ? formatDateTime(row.closed_at) : '-'}</span>
      ),
    },
    {
      key: 'total_sales',
      label: 'Total Penjualan',
      render: (row: Shift) => (
        <span className="font-semibold text-gray-900">{formatCurrency(row.total_sales ?? 0)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Shift) => (
        <Badge variant={row.status === 'open' ? 'green' : 'gray'}>
          {row.status === 'open' ? 'Buka' : 'Tutup'}
        </Badge>
      ),
    },
    {
      key: 'alert_status',
      label: 'Alert',
      render: (row: Shift) => alertBadge(row.alert_status),
    },
  ]

  // ── Shift schedule columns ──
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
        <Badge variant={row.is_active ? 'green' : 'red'}>
          {row.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row: ShiftSchedule) => (
        <div className="flex items-center gap-1">
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
      <Header title="Shift" subtitle="Monitor sesi shift kasir dan kelola jadwal shift" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── Jadwal Shift ── */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <Clock size={16} className="text-blue-500" />
            <span className="text-sm font-semibold text-gray-700">Jadwal Shift</span>
            <span className="text-xs text-gray-400">{schedules.length} jadwal</span>
            <button
              onClick={openCreate}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shrink-0"
            >
              <Plus size={14} />
              Tambah Jadwal
            </button>
          </div>
          <DataTable
            columns={scheduleColumns as never[]}
            data={schedules as never[]}
            loading={schedulesLoading}
            emptyMessage="Belum ada jadwal shift"
          />
        </div>

        {/* ── Riwayat Sesi Shift ── */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <Clock size={16} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-600">Riwayat Sesi Shift</span>
            <span className="text-xs text-gray-400">{shifts.length} sesi</span>
            <button
              onClick={handleExportShifts}
              disabled={!shifts.length}
              className="ml-auto flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition shrink-0"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
          <DataTable
            columns={shiftColumns as never[]}
            data={shifts as never[]}
            loading={shiftsLoading}
            emptyMessage="Belum ada data shift"
          />
        </div>

      </div>

      {/* ── Form Modal ── */}
      <Modal open={showForm} onClose={closeForm} title={editSchedule ? 'Edit Jadwal Shift' : 'Tambah Jadwal Shift'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nama Jadwal <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Contoh: Shift Pagi, Shift Malam"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Jam Mulai</label>
              <div className="flex gap-1.5 items-center">
                <input
                  type="number" min={0} max={23}
                  value={form.start_hour}
                  onChange={(e) => set('start_hour', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono"
                  placeholder="HH"
                />
                <span className="text-gray-400 font-bold">:</span>
                <input
                  type="number" min={0} max={59}
                  value={form.start_minute}
                  onChange={(e) => set('start_minute', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono"
                  placeholder="MM"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Jam Selesai</label>
              <div className="flex gap-1.5 items-center">
                <input
                  type="number" min={0} max={23}
                  value={form.end_hour}
                  onChange={(e) => set('end_hour', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono"
                  placeholder="HH"
                />
                <span className="text-gray-400 font-bold">:</span>
                <input
                  type="number" min={0} max={59}
                  value={form.end_minute}
                  onChange={(e) => set('end_minute', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono"
                  placeholder="MM"
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.is_next_day}
              onChange={(e) => set('is_next_day', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm text-gray-700">Melewati tengah malam</span>
              <p className="text-xs text-gray-400">Centang untuk shift yang selesainya hari berikutnya (misal: 22:00 → 06:00)</p>
            </div>
          </label>

          {editSchedule && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set('is_active', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Jadwal aktif</span>
            </label>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeForm} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
              Batal
            </button>
            <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition">
              {isPending ? 'Menyimpan...' : editSchedule ? 'Simpan' : 'Buat Jadwal'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
