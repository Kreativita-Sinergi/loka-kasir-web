import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Eye, RotateCcw, XCircle, GitBranch } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { getTransactions, getTransactionById, refundTransaction, cancelTransaction } from '@/api/transactions'
import { useOutletStore } from '@/store/outletStore'
import type { Transaction } from '@/types'
import { formatCurrency, formatDateTime, getErrorMessage } from '@/lib/utils'

function statusBadge(tx: Transaction) {
  if (tx.is_canceled) return <Badge variant="red">Dibatalkan</Badge>
  if (tx.is_refunded) return <Badge variant="yellow">Direfund</Badge>
  if (tx.status === 'paid') return <Badge variant="green">Lunas</Badge>
  return <Badge variant="blue">Pending</Badge>
}

export default function TransactionsPage() {
  const qc = useQueryClient()
  const { selected: selectedOutlet } = useOutletStore()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [refundModal, setRefundModal] = useState(false)
  const [cancelModal, setCancelModal] = useState(false)
  const [reason, setReason] = useState('')

  const outletId = selectedOutlet?.id

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', { page, limit: 10, search, outlet_id: outletId, status: statusFilter }],
    queryFn: () => getTransactions({
      page,
      limit: 10,
      search: search || undefined,
      outlet_id: outletId || undefined,
      status: statusFilter || undefined,
    }),
  })

  const { data: detail } = useQuery({
    queryKey: ['transaction', selectedId],
    queryFn: () => getTransactionById(selectedId!),
    enabled: !!selectedId,
  })

  const tx = detail?.data?.data
  const transactions = data?.data?.data?.results ?? []
  const pagination = data?.data?.pagination

  const refundMut = useMutation({
    mutationFn: () => refundTransaction(selectedId!, reason),
    onSuccess: () => {
      toast.success('Transaksi berhasil direfund')
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['transaction', selectedId] })
      setRefundModal(false)
      setReason('')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const cancelMut = useMutation({
    mutationFn: () => cancelTransaction(selectedId!, reason),
    onSuccess: () => {
      toast.success('Transaksi berhasil dibatalkan')
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['transaction', selectedId] })
      setCancelModal(false)
      setReason('')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

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
      render: (row: Transaction) => (
        <span className="text-xs text-gray-500">{row.outlet?.name ?? '-'}</span>
      ),
    },
    {
      key: 'customer',
      label: 'Pelanggan',
      render: (row: Transaction) => (
        <span className="text-sm text-gray-600">{row.customer?.name || '-'}</span>
      ),
    },
    {
      key: 'cashier',
      label: 'Kasir',
      render: (row: Transaction) => (
        <span className="text-sm text-gray-600">{row.cashier?.business?.owner_name || '-'}</span>
      ),
    },
    {
      key: 'order_type',
      label: 'Tipe Order',
      render: (row: Transaction) => (
        <Badge variant="gray">{row.order_type?.name || '-'}</Badge>
      ),
    },
    {
      key: 'final_price',
      label: 'Total',
      render: (row: Transaction) => (
        <span className="font-semibold text-gray-900">{formatCurrency(row.final_price)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Transaction) => statusBadge(row),
    },
    {
      key: 'created_at',
      label: 'Waktu',
      render: (row: Transaction) => (
        <span className="text-xs text-gray-400">{formatDateTime(row.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row: Transaction) => (
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedId(row.transaction_id) }}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
        >
          <Eye size={15} />
        </button>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Transaksi" subtitle="Monitor semua transaksi bisnis" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari no. bill..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="py-2 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
            >
              <option value="">Semua Status</option>
              <option value="paid">Lunas</option>
              <option value="pending">Pending</option>
              <option value="canceled">Dibatalkan</option>
              <option value="refunded">Direfund</option>
            </select>

            {/* Outlet indicator */}
            {selectedOutlet && (
              <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-xl font-medium">
                <GitBranch size={12} />
                {selectedOutlet.name}
              </div>
            )}

            <p className="text-sm text-gray-500 ml-auto shrink-0">
              Total: <span className="font-semibold text-gray-900">{pagination?.total ?? 0}</span>
            </p>
          </div>
          <DataTable
            columns={columns as never[]}
            data={transactions as never[]}
            loading={isLoading}
            onRowClick={(row) => setSelectedId((row as Transaction).transaction_id)}
          />
          <Pagination page={page} total={pagination?.total ?? 0} limit={10} onChange={setPage} />
        </div>
      </div>

      {/* Detail Modal */}
      <Modal open={!!selectedId && !refundModal && !cancelModal} onClose={() => setSelectedId(null)} title="Detail Transaksi" size="lg">
        {tx ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold font-mono">#{tx.bill_number}</p>
                <p className="text-sm text-gray-400">{formatDateTime(tx.created_at)}</p>
              </div>
              {statusBadge(tx)}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Pelanggan</p>
                <p className="font-medium">{tx.customer?.name || 'Umum'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Kasir</p>
                <p className="font-medium">{tx.cashier?.business?.owner_name || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Outlet</p>
                <p className="font-medium">{tx.outlet?.name || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Tipe Order</p>
                <p className="font-medium">{tx.order_type?.name || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Meja</p>
                <p className="font-medium">{tx.table?.number || '-'}</p>
              </div>
            </div>

            {/* Items */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">Item</div>
              {tx.items?.map((item, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center justify-between border-t border-gray-50 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{item.product?.name || item.bundle?.name || 'Item'}</p>
                    <p className="text-xs text-gray-400">x{item.quantity}</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(item.total)}</p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border border-gray-100 rounded-xl p-4 space-y-2 text-sm">
              {tx.discount > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Diskon</span>
                  <span>-{formatCurrency(tx.discount)}</span>
                </div>
              )}
              {tx.tax > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Pajak</span>
                  <span>{formatCurrency(tx.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>{formatCurrency(tx.final_price)}</span>
              </div>
              {tx.amount_received && (
                <>
                  <div className="flex justify-between text-gray-500">
                    <span>Dibayar</span>
                    <span>{formatCurrency(tx.amount_received)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Kembalian</span>
                    <span>{formatCurrency(tx.change ?? 0)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            {!tx.is_canceled && !tx.is_refunded && tx.status === 'paid' && (
              <div className="flex gap-3">
                <button
                  onClick={() => { setRefundModal(true) }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-yellow-200 text-yellow-600 hover:bg-yellow-50 text-sm font-medium rounded-xl transition"
                >
                  <RotateCcw size={15} />
                  Refund
                </button>
                <button
                  onClick={() => { setCancelModal(true) }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-xl transition"
                >
                  <XCircle size={15} />
                  Batalkan
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}
      </Modal>

      {/* Refund Modal */}
      <Modal open={refundModal} onClose={() => setRefundModal(false)} title="Konfirmasi Refund" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Masukkan alasan refund untuk transaksi <span className="font-semibold">#{tx?.bill_number}</span>:</p>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Alasan refund..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex gap-3">
            <button onClick={() => setRefundModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">Batal</button>
            <button
              onClick={() => refundMut.mutate()}
              disabled={refundMut.isPending || !reason}
              className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold rounded-xl disabled:opacity-60"
            >
              {refundMut.isPending ? 'Memproses...' : 'Refund'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Cancel Modal */}
      <Modal open={cancelModal} onClose={() => setCancelModal(false)} title="Konfirmasi Batalkan" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Masukkan alasan pembatalan untuk transaksi <span className="font-semibold">#{tx?.bill_number}</span>:</p>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Alasan pembatalan..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex gap-3">
            <button onClick={() => setCancelModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">Batal</button>
            <button
              onClick={() => cancelMut.mutate()}
              disabled={cancelMut.isPending || !reason}
              className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-60"
            >
              {cancelMut.isPending ? 'Memproses...' : 'Batalkan'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
