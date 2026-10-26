import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/Table'
import { getSalesCustomers, PLAN_LABEL, type SalesCustomer, type SalesCustomerStatus } from '@/api/sales'
import { cn } from '@/lib/utils'
import { rupiah, salesQueryOptions, tanggal } from './salesPortal'

const STATUS: Record<SalesCustomerStatus, { label: string; variant: BadgeVariant }> = {
  unpaid: { label: 'Belum bayar', variant: 'gray' },
  active: { label: 'Aktif', variant: 'green' },
  due_soon: { label: 'Jatuh tempo ≤ 7 hari', variant: 'yellow' },
  overdue: { label: 'Lewat jatuh tempo', variant: 'red' },
  stopped: { label: 'Berhenti', variant: 'gray' },
}

const filters: { key: SalesCustomerStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'due_soon', label: 'Jatuh tempo' },
  { key: 'overdue', label: 'Lewat jatuh tempo' },
  { key: 'active', label: 'Aktif' },
  { key: 'unpaid', label: 'Belum bayar' },
  { key: 'stopped', label: 'Berhenti' },
]

function phase(c: SalesCustomer) {
  if (!c.commission_start_at || !c.rate_change_at) return '—'
  return new Date(c.rate_change_at).getTime() > Date.now()
    ? `${c.current_rate_percent}% sampai ${tanggal(c.rate_change_at)}, lalu 20%`
    : `${c.current_rate_percent}%`
}

export default function SalesCustomersPage() {
  const query = useQuery({ queryKey: ['sales', 'customers'], queryFn: async () => (await getSalesCustomers()).data.data, ...salesQueryOptions })
  const [filter, setFilter] = useState<SalesCustomerStatus | 'all'>('all')
  const rows = useMemo(() => (query.data ?? []).filter((c) => filter === 'all' || c.status === filter), [query.data, filter])
  const count = (key: SalesCustomerStatus | 'all') => (query.data ?? []).filter((c) => key === 'all' || c.status === key).length

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Pelanggan</h1>
        <p className="mt-1 text-sm text-muted-foreground">Usaha yang memakai kode Anda. Hubungi pelanggan yang jatuh tempo supaya langganannya berlanjut.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={cn(
            'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
            filter === f.key ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
          )}>{f.label} <span className="tabular-nums">({count(f.key)})</span></button>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <DataTable<SalesCustomer & { id: string }>
          data={rows.map((c) => ({ ...c, id: c.business_id }))}
          loading={query.isPending}
          error={query.error}
          onRetry={() => query.refetch()}
          emptyMessage={filter === 'all' ? 'Belum ada pelanggan yang memakai kode Anda.' : 'Tidak ada pelanggan dengan status ini.'}
          columns={[
            { key: 'name', label: 'Usaha', render: (c) => <div><p className="font-semibold">{c.name || '—'}</p><p className="text-xs text-muted-foreground">{[c.city, c.owner_phone_masked].filter(Boolean).join(' · ') || '—'}</p></div> },
            { key: 'plan', label: 'Paket', render: (c) => PLAN_LABEL[c.plan] ?? '—' },
            { key: 'status', label: 'Status', render: (c) => <Badge variant={STATUS[c.status].variant}>{STATUS[c.status].label}</Badge> },
            { key: 'end_date', label: 'Aktif sampai', render: (c) => c.end_date ? tanggal(c.end_date) : '—' },
            { key: 'phase', label: 'Komisi saat ini', render: phase },
            { key: 'total_commission', label: 'Total komisi', className: 'text-right', render: (c) => <span className="tabular-nums">{rupiah(c.total_commission)}</span> },
          ]}
        />
      </div>
    </section>
  )
}
