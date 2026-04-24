import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import TransactionFilters from '@/components/transactions/TransactionFilters'
import TransactionDetailModal from '@/components/transactions/TransactionDetailModal'
import TransactionRefundModal from '@/components/transactions/TransactionRefundModal'
import TransactionCancelModal from '@/components/transactions/TransactionCancelModal'
import { getTransactions } from '@/api/transactions'
import { useOutletStore } from '@/store/outletStore'
import type { Transaction } from '@/types'
import { formatCurrency, formatDateTime } from '@/lib/utils'

function statusBadge(tx: Transaction) {
  if (tx.is_canceled) return <Badge variant="red">Dibatalkan</Badge>
  if (tx.is_refunded) return <Badge variant="yellow">Direfund</Badge>
  if (tx.status === 'paid') return <Badge variant="green">Lunas</Badge>
  return <Badge variant="blue">Pending</Badge>
}

export default function TransactionsPage() {
  const { selected: selectedOutlet } = useOutletStore()

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
      search: search || undefined,
      outlet_id: outletId || undefined,
      status: statusFilter || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
  })

  const transactions = data?.data?.data?.results ?? []
  const pagination = data?.data?.pagination

  const columns = [
    {
      key: 'bill_number',
      label: 'No. Bill',
      render: (row: Transaction) => (
        <span className="font-mono text-sm font-semibold text-gray-900">#{row.bill_number}</span>
      ),
    },
    {
      key: 'outlet',
      label: 'Outlet',
      render: (row: Transaction) => <span className="text-xs text-gray-500">{row.outlet?.name ?? '-'}</span>,
    },
    {
      key: 'customer',
      label: 'Pelanggan',
      render: (row: Transaction) => <span className="text-sm text-gray-600">{row.customer?.name || '-'}</span>,
    },
    {
      key: 'cashier',
      label: 'Kasir',
      render: (row: Transaction) => <span className="text-sm text-gray-600">{row.cashier?.business?.owner_name || '-'}</span>,
    },
    {
      key: 'order_type',
      label: 'Tipe Order',
      render: (row: Transaction) => <Badge variant="gray">{row.order_type?.name || '-'}</Badge>,
    },
    {
      key: 'final_price',
      label: 'Total',
      render: (row: Transaction) => <span className="font-semibold text-gray-900">{formatCurrency(row.final_price)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Transaction) => statusBadge(row),
    },
    {
      key: 'created_at',
      label: 'Waktu',
      render: (row: Transaction) => <span className="text-xs text-gray-400">{formatDateTime(row.created_at)}</span>,
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Transaksi" subtitle="Monitor semua transaksi bisnis" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100">
          <TransactionFilters
            search={search} setSearch={setSearch}
            statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            startDate={startDate} setStartDate={setStartDate}
            endDate={endDate} setEndDate={setEndDate}
            setPage={setPage}
            selectedOutletName={selectedOutlet?.name}
            total={pagination?.total ?? 0}
            transactions={transactions}
          />
          <DataTable
            columns={columns as never[]}
            data={transactions as never[]}
            loading={isLoading}
            onRowClick={(row) => setSelectedId((row as Transaction).transaction_id)}
          />
          <Pagination page={page} total={pagination?.total ?? 0} limit={10} onChange={setPage} />
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
