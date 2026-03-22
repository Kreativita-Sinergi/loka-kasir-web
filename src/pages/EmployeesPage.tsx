import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Users } from 'lucide-react'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import { getEmployees } from '@/api/employees'
import type { Employee } from '@/types'
import { formatDate } from '@/lib/utils'

export default function EmployeesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['employees', { page, limit: 10, search }],
    queryFn: () => getEmployees({ page, limit: 10, search: search || undefined }),
  })

  const employees = data?.data?.data ?? []
  const pagination = data?.data?.pagination

  const columns = [
    {
      key: 'name',
      label: 'Karyawan',
      render: (row: Employee) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm">
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
      key: 'business',
      label: 'Bisnis',
      render: (row: Employee) => (
        <span className="text-sm text-gray-600 capitalize">{row.business?.business_name ?? '-'}</span>
      ),
    },
    {
      key: 'shift_schedule',
      label: 'Jadwal Shift',
      render: (row: Employee) => (
        <span className="text-sm text-gray-500">{row.shift_schedule?.name ?? '-'}</span>
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
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Karyawan" subtitle="Data semua karyawan bisnis" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari karyawan..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-sm text-gray-500 ml-auto shrink-0">
              Total: <span className="font-semibold text-gray-900">{pagination?.total ?? 0}</span>
            </p>
          </div>
          <DataTable
            columns={columns as never[]}
            data={employees as never[]}
            loading={isLoading}
            emptyMessage="Belum ada karyawan"
          />
          <Pagination page={page} total={pagination?.total ?? 0} limit={10} onChange={setPage} />
        </div>
      </div>
    </div>
  )
}
