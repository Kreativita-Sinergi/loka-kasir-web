import { useInfiniteQuery } from '@tanstack/react-query'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/Table'
import { getSalesCommissions, PLAN_LABEL, type SalesCommission, type SalesCommissionStatus } from '@/api/sales'
import { rupiah, salesQueryOptions, tanggal } from './salesPortal'

const PAGE = 50

const STATUS: Record<SalesCommissionStatus, { label: string; variant: BadgeVariant }> = {
  held: { label: 'Ditahan', variant: 'yellow' },
  available: { label: 'Siap dicairkan', variant: 'green' },
  processing: { label: 'Diproses', variant: 'blue' },
  paid: { label: 'Dibayar', variant: 'purple' },
  cancelled: { label: 'Dibatalkan', variant: 'gray' },
}

const KIND: Record<SalesCommission['kind'], string> = { commission: '', reversal: 'Pembatalan', adjustment: 'Koreksi biaya' }

export default function SalesCommissionsPage() {
  const query = useInfiniteQuery({
    queryKey: ['sales', 'commissions'],
    queryFn: async ({ pageParam }) => (await getSalesCommissions(pageParam)).data.data,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.length === PAGE ? last[last.length - 1].created_at : undefined,
    ...salesQueryOptions,
  })
  const rows = query.data?.pages.flat() ?? []

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Riwayat komisi</h1>
        <p className="mt-1 text-sm text-muted-foreground">Setiap pembayaran pelanggan langsung tercatat di sini. Komisi bisa dicairkan setelah masa tahan selesai.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <DataTable<SalesCommission>
          data={rows}
          loading={query.isPending}
          error={query.error}
          onRetry={() => query.refetch()}
          emptyMessage="Belum ada komisi. Komisi muncul begitu pelanggan dengan kode Anda membayar."
          columns={[
            { key: 'created_at', label: 'Tanggal', render: (c) => tanggal(c.created_at) },
            { key: 'business_name', label: 'Pelanggan', render: (c) => <div><p className="font-semibold">{c.business_name}</p><p className="text-xs text-muted-foreground">{[PLAN_LABEL[c.plan] ?? c.plan, KIND[c.kind]].filter(Boolean).join(' · ')}</p>{c.reason && <p className="text-xs text-muted-foreground">{c.reason}</p>}</div> },
            { key: 'paid_amount', label: 'Dibayar', className: 'text-right', render: (c) => <span className="tabular-nums">{rupiah(c.paid_amount)}</span> },
            { key: 'gateway_fee', label: 'Biaya bayar', className: 'text-right', render: (c) => <span className="tabular-nums">−{rupiah(c.gateway_fee)}{c.fee_estimated && <span className="ml-1 text-xs text-warning" title="Kanal pembayaran belum diketahui; memakai biaya tertinggi sampai dikoreksi">(estimasi)</span>}</span> },
            { key: 'rate_percent', label: 'Tarif', className: 'text-right', render: (c) => `${c.rate_percent}%` },
            { key: 'amount', label: 'Komisi', className: 'text-right', render: (c) => <span className={c.amount < 0 ? 'font-semibold tabular-nums text-destructive' : 'font-semibold tabular-nums'}>{rupiah(c.amount)}</span> },
            { key: 'status', label: 'Status', render: (c) => <div><Badge variant={STATUS[c.status].variant}>{STATUS[c.status].label}</Badge>{c.status === 'held' && <p className="mt-1 text-xs text-muted-foreground">Tersedia {tanggal(c.available_at)}</p>}</div> },
          ]}
        />
      </div>
      {query.hasNextPage && <div className="flex justify-center">
        <Button variant="outline" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>{query.isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}</Button>
      </div>}
    </section>
  )
}
