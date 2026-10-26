import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/Table'
import { getSalesPayouts, type SalesPayout } from '@/api/sales'
import { rupiah, salesQueryOptions, tanggal, useSalesProfile } from './salesPortal'

export default function SalesPayoutsPage() {
  const profile = useSalesProfile()
  const query = useQuery({ queryKey: ['sales', 'payouts'], queryFn: async () => (await getSalesPayouts()).data.data, ...salesQueryOptions })

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Pencairan</h1>
        <p className="mt-1 text-sm text-muted-foreground">Komisi yang siap dicairkan ditransfer setiap bulan sekitar tanggal 10, minimal Rp100.000.</p>
      </div>
      {!profile.kyc_complete && <p className="rounded-xl border border-warning/20 bg-warning-subtle p-3 text-sm text-warning">Data KTP atau rekening Anda belum lengkap, jadi komisi belum bisa ditransfer. Kirim datanya ke tim Loka Kasir.</p>}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <DataTable<SalesPayout>
          data={query.data ?? []}
          loading={query.isPending}
          error={query.error}
          onRetry={() => query.refetch()}
          emptyMessage="Belum ada pencairan."
          columns={[
            { key: 'created_at', label: 'Dibuat', render: (p) => tanggal(p.created_at) },
            { key: 'amount', label: 'Nominal', className: 'text-right', render: (p) => <span className="font-semibold tabular-nums">{rupiah(p.amount)}</span> },
            { key: 'bank', label: 'Rekening', render: (p) => <div><p>{p.bank_name} {p.bank_account_no}</p><p className="text-xs text-muted-foreground">{p.bank_account_name}</p></div> },
            { key: 'status', label: 'Status', render: (p) => p.status === 'paid'
              ? <div><Badge variant="green">Ditransfer</Badge>{p.paid_at && <p className="mt-1 text-xs text-muted-foreground">{tanggal(p.paid_at)}</p>}</div>
              : <Badge variant="blue">Diproses</Badge> },
            { key: 'transfer_ref', label: 'Referensi', render: (p) => <div><p className="tabular-nums">{p.transfer_ref || '—'}</p>{/^https?:\/\//i.test(p.proof_url) && <a href={p.proof_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Lihat bukti</a>}</div> },
          ]}
        />
      </div>
    </section>
  )
}
