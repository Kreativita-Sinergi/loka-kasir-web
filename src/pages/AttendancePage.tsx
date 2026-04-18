import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Smartphone } from 'lucide-react'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import { getAttendances } from '@/api/attendance'
import { getEmployees } from '@/api/employees'
import { getMyOutlets } from '@/api/outlets'
import type { Attendance, AttendanceFilterParams, AttendanceStatus } from '@/types'
import { formatDateTime } from '@/lib/utils'
import { csvFilename, exportToCSV } from '@/lib/exportUtils'

// ─── helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: AttendanceStatus) {
  return status === 'ONTIME'
    ? <Badge variant="green">Tepat Waktu</Badge>
    : <Badge variant="yellow">Terlambat</Badge>
}

function actionBadge(clockOut: string | null) {
  return clockOut
    ? <Badge variant="gray">Pulang</Badge>
    : <Badge variant="blue">Masuk</Badge>
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Omit<AttendanceFilterParams, 'page' | 'limit'>>({
    start_date: '',
    end_date: '',
    outlet_id: '',
    employee_id: '',
    status: '',
  })

  const params: AttendanceFilterParams = {
    ...filters,
    page,
    limit: 20,
  }

  const { data: res, isLoading } = useQuery({
    queryKey: ['attendances', params],
    queryFn: () => getAttendances(params).then((r) => r.data),
  })

  const { data: employeesRes } = useQuery({
    queryKey: ['employees-picker'],
    queryFn: () => getEmployees({ limit: 200 }).then((r) => r.data),
  })

  const { data: outletsRes } = useQuery({
    queryKey: ['outlets-picker'],
    queryFn: () => getMyOutlets().then((r) => r.data),
  })

  const rows = res?.data ?? []
  const pagination = res?.pagination

  function handleFilterChange(key: keyof typeof filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }

  function handleExport() {
    if (!rows.length) return
    const csvRows = rows.map((a) => ({
      'Karyawan':    a.employee?.name ?? a.employee_id,
      'Jabatan':     a.employee?.role ?? '',
      'Outlet':      a.outlet?.name ?? '',
      'Aksi':        a.clock_out ? 'Pulang' : 'Masuk',
      'Jam Masuk':   formatDateTime(a.clock_in),
      'Jam Pulang':  a.clock_out ? formatDateTime(a.clock_out) : '',
      'Durasi':      a.duration,
      'Status':      a.status,
      'Foto':        a.local_image_path ? 'Ada (di device kasir)' : '-',
      'Catatan':     a.notes ?? '',
    }))
    exportToCSV(csvRows, csvFilename('absensi'))
  }

  const columns = [
    {
      key: 'employee',
      label: 'Karyawan',
      render: (row: Attendance) => (
        <div>
          <div className="font-medium text-gray-900">{row.employee?.name ?? row.employee_id}</div>
          <div className="text-xs text-gray-400">{row.employee?.role ?? ''}</div>
        </div>
      ),
    },
    {
      key: 'outlet',
      label: 'Outlet',
      render: (row: Attendance) => (
        <span className="text-gray-600">{row.outlet?.name ?? '-'}</span>
      ),
    },
    {
      key: 'action',
      label: 'Aksi',
      render: (row: Attendance) => actionBadge(row.clock_out),
    },
    {
      key: 'clock_in',
      label: 'Masuk',
      render: (row: Attendance) => (
        <span className="text-gray-700 text-xs whitespace-nowrap">{formatDateTime(row.clock_in)}</span>
      ),
    },
    {
      key: 'clock_out',
      label: 'Pulang',
      render: (row: Attendance) =>
        row.clock_out
          ? <span className="text-gray-700 text-xs whitespace-nowrap">{formatDateTime(row.clock_out)}</span>
          : <span className="text-gray-400 text-xs">-</span>,
    },
    {
      key: 'duration',
      label: 'Durasi',
      render: (row: Attendance) => (
        <span className="text-gray-600 text-xs">{row.duration || '-'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Attendance) => statusBadge(row.status),
    },
    {
      key: 'photo',
      label: 'Foto',
      render: (row: Attendance) =>
        row.local_image_path ? (
          <span
            className="inline-flex items-center gap-1 text-xs text-blue-600"
            title="Foto tersimpan di device kasir"
          >
            <Smartphone size={12} />
            Di device
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        ),
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <Header title="Absensi" />

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Start date */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Dari Tanggal</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* End date */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sampai Tanggal</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Outlet */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Outlet</label>
              <select
                value={filters.outlet_id}
                onChange={(e) => handleFilterChange('outlet_id', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Outlet</option>
                {outletsRes?.data && Array.isArray(outletsRes.data) && outletsRes.data.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>

            {/* Employee */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Karyawan</label>
              <select
                value={filters.employee_id}
                onChange={(e) => handleFilterChange('employee_id', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Karyawan</option>
                {employeesRes?.data?.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value as AttendanceStatus | '')}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Status</option>
                <option value="ONTIME">Tepat Waktu</option>
                <option value="LATE">Terlambat</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="text-sm text-gray-500">
              {pagination ? `${pagination.total} data` : ''}
            </div>
            <button
              onClick={handleExport}
              disabled={!rows.length}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition"
            >
              <Download size={13} />
              Ekspor CSV
            </button>
          </div>

          <DataTable<Attendance>
            columns={columns}
            data={rows}
            loading={isLoading}
            emptyMessage="Belum ada data absensi"
          />

          {pagination && (
            <Pagination
              page={page}
              total={pagination.total}
              limit={20}
              onChange={setPage}
            />
          )}
        </div>

        {/* ── Info note ────────────────────────────────────────────────────── */}
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <Smartphone size={12} />
          Foto absensi tersimpan langsung di device kasir, tidak diunggah ke server.
        </p>
      </div>
    </div>
  )
}
