import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Search, Smartphone } from 'lucide-react'
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
import { t } from '@/lib/i18n'

// ─── helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: AttendanceStatus) {
  return status === 'ONTIME'
    ? <Badge variant="green">{t('attOnTime')}</Badge>
    : <Badge variant="yellow">{t('attLate')}</Badge>
}

function actionBadge(clockOut: string | null) {
  return clockOut
    ? <Badge variant="gray">{t('attClockOut')}</Badge>
    : <Badge variant="blue">{t('attClockIn')}</Badge>
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Omit<AttendanceFilterParams, 'page' | 'limit'>>({
    start_date: '',
    end_date: '',
    outlet_id: '',
    employee_id: '',
    employee_name: '',
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
      // Judul kolom berkas ekspor ikut bahasa dasbor — kunci terhitung.
      [t('navEmployees')]: a.employee?.name ?? a.employee_id,
      [t('labelRole')]: a.employee?.role ?? '',
      [t('labelOutlet')]: a.outlet?.name ?? '',
      [t('labelActions')]: a.clock_out ? t('attClockOut') : t('attClockIn'),
      [t('attClockInTime')]: formatDateTime(a.clock_in),
      [t('attClockOutTime')]: a.clock_out ? formatDateTime(a.clock_out) : '',
      [t('labelDuration')]: a.duration,
      [t('labelStatus')]: a.status,
      [t('labelPhoto')]: a.local_image_path ? t('attPhotoOnDevice') : '-',
      [t('labelNote')]: a.notes ?? '',
    }))
    exportToCSV(csvRows, csvFilename('absensi'))
  }

  const columns = [
    {
      key: 'employee',
      label: t('navEmployees'),
      render: (row: Attendance) => (
        <div>
          <div className="font-medium text-foreground">{row.employee?.name ?? row.employee_id}</div>
          <div className="text-xs text-muted-foreground">{row.employee?.role ?? ''}</div>
        </div>
      ),
    },
    {
      key: 'outlet',
      label: t('labelOutlet'),
      render: (row: Attendance) => (
        <span className="text-muted-foreground">{row.outlet?.name ?? '-'}</span>
      ),
    },
    {
      key: 'action',
      label: t('labelActions'),
      render: (row: Attendance) => actionBadge(row.clock_out),
    },
    {
      key: 'clock_in',
      label: t('attClockIn'),
      render: (row: Attendance) => (
        <span className="text-foreground text-xs whitespace-nowrap">{formatDateTime(row.clock_in)}</span>
      ),
    },
    {
      key: 'clock_out',
      label: t('attClockOut'),
      render: (row: Attendance) =>
        row.clock_out
          ? <span className="text-foreground text-xs whitespace-nowrap">{formatDateTime(row.clock_out)}</span>
          : <span className="text-muted-foreground text-xs">-</span>,
    },
    {
      key: 'duration',
      label: t('labelDuration'),
      render: (row: Attendance) => (
        <span className="text-muted-foreground text-xs">{row.duration || '-'}</span>
      ),
    },
    {
      key: 'status',
      label: t('labelStatus'),
      render: (row: Attendance) => statusBadge(row.status),
    },
    {
      key: 'photo',
      label: t('labelPhoto'),
      render: (row: Attendance) =>
        row.local_image_path ? (
          <span
            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400"
            title={t('attPhotoStoredOnDevice')}
          >
            <Smartphone size={12} />
            {t('attOnDevice')}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        ),
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <Header title={t('navAttendance')} subtitle={t('attPageSubtitle')} />

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Start date */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{t('labelFromDateShort')}</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* End date */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{t('labelToDateShort')}</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Outlet */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{t('labelOutlet')}</label>
              <select
                value={filters.outlet_id}
                onChange={(e) => handleFilterChange('outlet_id', e.target.value)}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('labelAllOutlets')}</option>
                {outletsRes?.data && Array.isArray(outletsRes.data) && outletsRes.data.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>

            {/* Search nama karyawan */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{t('attSearchName')}</label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={filters.employee_name}
                  onChange={(e) => handleFilterChange('employee_name', e.target.value)}
                  placeholder={t('attNamePlaceholder')}
                  className="w-full rounded-xl border border-border pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Employee dropdown */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{t('navEmployees')}</label>
              <select
                value={filters.employee_id}
                onChange={(e) => handleFilterChange('employee_id', e.target.value)}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('attAllStaff')}</option>
                {employeesRes?.data?.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{t('labelStatus')}</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value as AttendanceStatus | '')}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('labelAllStatus')}</option>
                <option value="ONTIME">{t('attOnTime')}</option>
                <option value="LATE">{t('attLate')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────────────────────── */}
        <div className="bg-card rounded-2xl border border-border">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="text-sm text-muted-foreground">
              {pagination ? t('rowCountData', { count: pagination.total }) : ''}
            </div>
            <button
              onClick={handleExport}
              disabled={!rows.length}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground bg-muted hover:bg-muted disabled:opacity-40 transition"
            >
              <Download size={13} />
              {t('exportCsv')}
            </button>
          </div>

          <DataTable<Attendance>
            columns={columns}
            data={rows}
            loading={isLoading}
            emptyMessage={t('attEmpty')}
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
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Smartphone size={12} />
          {t('attPhotoOnDeviceNote')}
        </p>
      </div>
    </div>
  )
}
