import { useQuery } from '@tanstack/react-query'
import { Clock } from 'lucide-react'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import { getShifts } from '@/api/shifts'
import type { Shift } from '@/types'
import { formatCurrency, formatDateTime } from '@/lib/utils'

function alertBadge(status: string) {
  const map: Record<string, { label: string; variant: 'green' | 'blue' | 'yellow' | 'red' | 'gray' }> = {
    normal: { label: 'Normal', variant: 'green' },
    '1_hour': { label: '< 1 jam', variant: 'blue' },
    '30_minutes': { label: '< 30 mnt', variant: 'yellow' },
    '5_minutes': { label: '< 5 mnt', variant: 'red' },
    shift_ended: { label: 'Selesai', variant: 'gray' },
  }
  const s = map[status] ?? { label: status, variant: 'gray' as const }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

export default function ShiftsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => getShifts({ limit: 20 }),
  })

  const shifts = data?.data?.data ?? []

  const columns = [
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
      key: 'business',
      label: 'Bisnis',
      render: (row: Shift) => (
        <span className="text-sm text-gray-600 capitalize">{row.business?.business_name ?? '-'}</span>
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
        <span className="font-semibold text-gray-900">{formatCurrency(row.total_sales)}</span>
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Shift" subtitle="Monitor shift kasir yang aktif dan riwayat" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <Clock size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Riwayat Shift</span>
            <span className="ml-auto text-sm text-gray-500">{shifts.length} shift</span>
          </div>
          <DataTable columns={columns as never[]} data={shifts as never[]} loading={isLoading} emptyMessage="Belum ada data shift" />
        </div>
      </div>
    </div>
  )
}
