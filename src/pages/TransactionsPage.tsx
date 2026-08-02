import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShoppingCart, Package } from 'lucide-react'
import Header from '@/components/layout/Header'
import EmptyState from '@/components/ui/EmptyState'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import TransactionFilters from '@/components/transactions/TransactionFilters'
import TransactionDetailModal from '@/components/transactions/TransactionDetailModal'
import TransactionRefundModal from '@/components/transactions/TransactionRefundModal'
import TransactionCancelModal from '@/components/transactions/TransactionCancelModal'
import { getTransactions, getSoldProducts } from '@/api/transactions'
import { useOutletStore } from '@/store/outletStore'
import type { SoldProduct, Transaction } from '@/types'
import { formatCurrency, formatDateTime } from '@/lib/utils'

function statusBadge(tx: Transaction) {
  if (tx.is_canceled) return <Badge variant="red">Dibatalkan</Badge>
  if (tx.is_refunded) return <Badge variant="yellow">Direfund</Badge>
  if (tx.payment_status === 'paid') return <Badge variant="green">Lunas</Badge>
  return <Badge variant="blue">Pending</Badge>
}

/** Badge metode pembayaran dari record `payments` (mendukung split, mis. Tunai + QRIS). */
function paymentMethodCell(tx: Transaction) {
  const methods = [
    ...new Set(
      (tx.payments ?? [])
        .map((p) => (p.payment_method?.code || p.payment_method?.name || p.payment_method_name || '').toUpperCase())
        .filter(Boolean),
    ),
  ]
  if (methods.length === 0) return <span className="text-xs text-muted-foreground">-</span>
  return (
    <div className="flex flex-wrap gap-1">
      {methods.map((m) => {
        const isQris = m.includes('QRIS')
        const isCash = m.includes('CASH') || m.includes('TUNAI')
        const label = isQris ? 'QRIS' : isCash ? 'Tunai' : m
        return (
          <Badge key={m} variant={isQris ? 'blue' : isCash ? 'green' : 'gray'}>
            {label}
          </Badge>
        )
      })}
    </div>
  )
}

export default function TransactionsPage() {
  const { selected: selectedOutlet } = useOutletStore()

  const [tab, setTab] = useState<'transactions' | 'products'>('transactions')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [refundId, setRefundId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)

  const outletId = selectedOutlet?.id

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', { page, limit: 10, search, outlet_id: outletId, status: statusFilter, startDate, endDate }],
    queryFn: () => getTransactions({
      page, limit: 10,
      // Terbaru dulu + selaras dengan index (business_id, created_at DESC):
      // scan maju tanpa langkah sort terpisah, cepat & konsisten walau data besar.
      sort_by: 'created_at', order_by: 'desc',
      search: search || undefined,
      outlet_id: outletId || undefined,
      status: statusFilter || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
  })

  const transactions = data?.data?.data?.results ?? []
  const pagination = data?.data?.pagination

  // ── Tab "Produk Terjual": agregasi per produk untuk filter tanggal/outlet ──
  const { data: soldData, isLoading: soldLoading } = useQuery({
    queryKey: ['sold-products', { outlet_id: outletId, startDate, endDate }],
    queryFn: () => getSoldProducts({
      outlet_id: outletId || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
    enabled: tab === 'products',
  })
  const soldProducts = soldData?.data?.data ?? []
  const soldTotalUnits = soldProducts.reduce((s, p) => s + (p.units_sold ?? 0), 0)
  const soldTotalRevenue = soldProducts.reduce((s, p) => s + (p.revenue ?? 0), 0)

  const productColumns = [
    {
      key: 'product_name',
      label: 'Produk',
      render: (row: SoldProduct) => <span className="text-sm font-medium text-foreground">{row.product_name || '-'}</span>,
    },
    {
      key: 'units_sold',
      label: 'Jumlah Terjual',
      className: 'text-right',
      render: (row: SoldProduct) => <span className="text-sm font-semibold text-foreground">{row.units_sold}</span>,
    },
    {
      key: 'revenue',
      label: 'Total Nominal',
      className: 'text-right',
      render: (row: SoldProduct) => <span className="text-sm font-semibold text-foreground">{formatCurrency(row.revenue)}</span>,
    },
  ]

  const columns = [
    {
      key: 'bill_number',
      label: 'Nomor Struk',
      render: (row: Transaction) => (
        <span className="font-mono text-sm font-semibold text-foreground">#{row.bill_number}</span>
      ),
    },
    {
      key: 'outlet',
      label: 'Outlet',
      render: (row: Transaction) => <span className="text-xs text-muted-foreground">{row.outlet?.name ?? '-'}</span>,
    },
    {
      key: 'customer',
      label: 'Pelanggan',
      render: (row: Transaction) => <span className="text-sm text-muted-foreground">{row.customer?.name || '-'}</span>,
    },
    {
      key: 'cashier',
      label: 'Kasir',
      render: (row: Transaction) => <span className="text-sm text-muted-foreground">{row.cashier?.business?.owner_name || '-'}</span>,
    },
    {
      key: 'order_type',
      label: 'Jenis Pesanan',
      render: (row: Transaction) => <Badge variant="gray">{row.order_type?.name || '-'}</Badge>,
    },
    {
      key: 'payment_method',
      label: 'Metode Bayar',
      render: (row: Transaction) => paymentMethodCell(row),
    },
    {
      key: 'final_price',
      label: 'Total',
      render: (row: Transaction) => <span className="font-semibold text-foreground">{formatCurrency(row.final_price)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Transaction) => statusBadge(row),
    },
    {
      key: 'created_at',
      label: 'Waktu',
      render: (row: Transaction) => <span className="text-xs text-muted-foreground">{formatDateTime(row.created_at)}</span>,
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Riwayat Transaksi" subtitle="Periksa penjualan, pembayaran, pembatalan, dan pengembalian dana" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* ── Tab switch: Transaksi vs Produk Terjual ─────────────────────── */}
        <div className="mb-4 inline-flex rounded-xl border border-border bg-card p-1">
          <button
            onClick={() => setTab('transactions')}
            className={
              'flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition ' +
              (tab === 'transactions' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')
            }
          >
            <ShoppingCart size={15} /> Transaksi
          </button>
          <button
            onClick={() => setTab('products')}
            className={
              'flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition ' +
              (tab === 'products' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')
            }
          >
            <Package size={15} /> Produk Terjual
          </button>
        </div>

        <div className="bg-card rounded-2xl border border-border">
          <TransactionFilters
            search={search} setSearch={setSearch}
            statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            startDate={startDate} setStartDate={setStartDate}
            endDate={endDate} setEndDate={setEndDate}
            setPage={setPage}
            selectedOutletName={selectedOutlet?.name}
            total={tab === 'products' ? soldProducts.length : (pagination?.total ?? 0)}
            transactions={transactions}
          />

          {tab === 'transactions' ? (
            <>
              <DataTable
                columns={columns as never[]}
                data={transactions as never[]}
                loading={isLoading}
                onRowClick={(row) => setSelectedId((row as Transaction).transaction_id)}
                emptySlot={
                  <EmptyState
                    title="Belum ada transaksi"
                    description="Transaksi muncul setelah kasir menyelesaikan penjualan melalui aplikasi Loka Kasir. Jika masih kosong, pastikan produk dan perangkat kasir sudah disiapkan."
                  />
                }
              />
              <Pagination page={page} total={pagination?.total ?? 0} limit={10} onChange={setPage} />
            </>
          ) : (
            <>
              <DataTable
                columns={productColumns as never[]}
                data={soldProducts as never[]}
                loading={soldLoading}
                emptySlot={
                  <EmptyState
                    title="Belum ada produk terjual"
                    description="Belum ada penjualan lunas pada rentang & outlet yang dipilih."
                  />
                }
              />
              {soldProducts.length > 0 && (
                <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3 text-sm">
                  <span className="font-semibold text-foreground">{soldProducts.length} produk</span>
                  <div className="flex items-center gap-6">
                    <span className="text-muted-foreground">
                      Total qty: <span className="font-semibold text-foreground">{soldTotalUnits}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Total nominal: <span className="font-semibold text-foreground">{formatCurrency(soldTotalRevenue)}</span>
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selectedId && !refundId && !cancelId && (
        <TransactionDetailModal
          transactionId={selectedId}
          onClose={() => setSelectedId(null)}
          onRefund={(id) => setRefundId(id)}
          onCancel={(id) => setCancelId(id)}
        />
      )}

      {refundId && (
        <TransactionRefundModal
          transactionId={refundId}
          onClose={() => setRefundId(null)}
          onSuccess={() => { setRefundId(null); setSelectedId(null) }}
        />
      )}

      {cancelId && (
        <TransactionCancelModal
          transactionId={cancelId}
          onClose={() => setCancelId(null)}
          onSuccess={() => { setCancelId(null); setSelectedId(null) }}
        />
      )}
    </div>
  )
}
