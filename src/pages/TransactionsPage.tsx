import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShoppingCart, Package, Trash2 } from 'lucide-react'
import Header from '@/components/layout/Header'
import EmptyState from '@/components/ui/EmptyState'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import TransactionFilters from '@/components/transactions/TransactionFilters'
import TransactionDetailModal from '@/components/transactions/TransactionDetailModal'
import TransactionRefundModal from '@/components/transactions/TransactionRefundModal'
import TransactionCancelModal from '@/components/transactions/TransactionCancelModal'
import TransactionDeleteModal from '@/components/transactions/TransactionDeleteModal'
import TransactionBulkDeleteModal from '@/components/transactions/TransactionBulkDeleteModal'
import ProfitSummaryBar from '@/components/transactions/ProfitSummaryBar'
import { getTransactions, getSoldProducts, getProfitSummary } from '@/api/transactions'
import { useOutletStore } from '@/store/outletStore'
import { usePermissions, PERMS } from '@/hooks/usePermissions'
import type { SoldProduct, Transaction } from '@/types'
import { formatCurrency, formatDateTime, transactionProfit } from '@/lib/utils'
import { t } from '@/lib/i18n'

function statusBadge(tx: Transaction) {
  if (tx.is_canceled) return <Badge variant="red">{t('statusCancelled')}</Badge>
  if (tx.is_refunded) return <Badge variant="yellow">{t('statusRefundedShort')}</Badge>
  if (tx.payment_status === 'paid') return <Badge variant="green">{t('statusPaid')}</Badge>
  return <Badge variant="blue">{t('statusPending')}</Badge>
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
  const { can } = usePermissions()
  const showProfit = can(PERMS.REPORTS_FINANCIAL)

  const [tab, setTab] = useState<'transactions' | 'products'>('transactions')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [refundId, setRefundId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const canDelete = can(PERMS.POS_DELETE_TRANSACTION)

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

  // ── Pilih banyak baris untuk dihapus sekaligus ────────────────────────────
  // Yang dianggap terpilih hanyalah baris yang benar-benar ada di layar saat
  // ini: centang dari halaman atau filter sebelumnya boleh tersimpan, tetapi
  // tidak pernah ikut terhapus. Menghapus nota yang tidak terlihat adalah cara
  // paling mudah menghapus nota yang salah.
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedTransactions = transactions.filter((tx) => selectedIds.has(tx.transaction_id))
  const allSelected = transactions.length > 0 && selectedTransactions.length === transactions.length

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const tx of transactions) {
        if (allSelected) next.delete(tx.transaction_id)
        else next.add(tx.transaction_id)
      }
      return next
    })
  }

  // ── Laba periode ──────────────────────────────────────────────────────────
  // Ditanyakan terpisah, bukan dijumlah dari `transactions`: yang ada di layar
  // hanya sepuluh baris, sementara yang ditanyakan pemilik adalah laba seluruh
  // rentang tanggalnya. Filter status sengaja tidak ikut — laba hanya lahir
  // dari transaksi yang benar-benar terjual.
  const { data: profitData } = useQuery({
    queryKey: ['profit-summary', { outlet_id: outletId, search, startDate, endDate }],
    queryFn: () => getProfitSummary({
      search: search || undefined,
      outlet_id: outletId || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
    enabled: showProfit && tab === 'transactions',
  })
  const profit = profitData?.data?.data

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
      label: t('labelProduct'),
      render: (row: SoldProduct) => <span className="text-sm font-medium text-foreground">{row.product_name || '-'}</span>,
    },
    {
      key: 'units_sold',
      label: t('txQtySold'),
      className: 'text-right',
      render: (row: SoldProduct) => <span className="text-sm font-semibold text-foreground">{row.units_sold}</span>,
    },
    {
      key: 'revenue',
      label: t('txTotalAmount'),
      className: 'text-right',
      render: (row: SoldProduct) => <span className="text-sm font-semibold text-foreground">{formatCurrency(row.revenue)}</span>,
    },
  ]

  const columns = [
    ...(canDelete ? [{
      key: 'select',
      className: 'w-10',
      label: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleSelectAll}
          className="rounded"
        />
      ),
      render: (row: Transaction) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.transaction_id)}
          onChange={(e) => { e.stopPropagation(); toggleSelect(row.transaction_id) }}
          onClick={(e) => e.stopPropagation()}
          className="rounded"
        />
      ),
    }] : []),
    {
      key: 'bill_number',
      label: t('txReceiptNumber'),
      render: (row: Transaction) => (
        <span className="font-mono text-sm font-semibold text-foreground">#{row.bill_number}</span>
      ),
    },
    {
      key: 'outlet',
      label: t('labelOutlet'),
      render: (row: Transaction) => <span className="text-xs text-muted-foreground">{row.outlet?.name ?? '-'}</span>,
    },
    {
      key: 'customer',
      label: t('navCustomers'),
      render: (row: Transaction) => <span className="text-sm text-muted-foreground">{row.customer?.name || '-'}</span>,
    },
    {
      key: 'cashier',
      label: t('labelCashier'),
      render: (row: Transaction) => <span className="text-sm text-muted-foreground">{row.cashier?.business?.owner_name || '-'}</span>,
    },
    {
      key: 'order_type',
      label: t('txOrderType'),
      render: (row: Transaction) => <Badge variant="gray">{row.order_type?.name || '-'}</Badge>,
    },
    {
      key: 'payment_method',
      label: t('txPaymentMethod'),
      render: (row: Transaction) => paymentMethodCell(row),
    },
    {
      key: 'final_price',
      label: t('labelTotal'),
      render: (row: Transaction) => <span className="font-semibold text-foreground">{formatCurrency(row.final_price)}</span>,
    },
    ...(showProfit ? [{
      key: 'profit',
      label: t('txProfit'),
      render: (row: Transaction) => {
        const value = transactionProfit(row)
        return (
          <span className={'font-semibold ' + (value > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground')}>
            {formatCurrency(value)}
          </span>
        )
      },
    }] : []),
    {
      key: 'status',
      label: t('labelStatus'),
      render: (row: Transaction) => statusBadge(row),
    },
    {
      key: 'created_at',
      label: t('labelTime'),
      render: (row: Transaction) => <span className="text-xs text-muted-foreground">{formatDateTime(row.created_at)}</span>,
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('navTransactions')} subtitle={t('txPageSubtitle')} />
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
            <ShoppingCart size={15} /> {t('labelTransactions')}
          </button>
          <button
            onClick={() => setTab('products')}
            className={
              'flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition ' +
              (tab === 'products' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')
            }
          >
            <Package size={15} /> {t('txProductsSold')}
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
              {showProfit && <ProfitSummaryBar summary={profit} />}
              {canDelete && selectedTransactions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-4 py-2">
                  <span className="text-sm font-semibold text-foreground">
                    {t('selectedCount', { count: selectedTransactions.length })}
                  </span>
                  <button
                    onClick={() => setBulkDeleteOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
                  >
                    <Trash2 size={14} />
                    {t('txDeleteAction')}
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                  >
                    {t('actionCancel')}
                  </button>
                </div>
              )}
              <DataTable
                columns={columns as never[]}
                data={transactions as never[]}
                loading={isLoading}
                onRowClick={(row) => setSelectedId((row as Transaction).transaction_id)}
                emptySlot={
                  <EmptyState
                    title={t('txEmpty')}
                    description={t('txEmptyDesc')}
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
                    title={t('txNoProductsSold')}
                    description={t('txNoProductsSoldDesc')}
                  />
                }
              />
              {soldProducts.length > 0 && (
                <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3 text-sm">
                  <span className="font-semibold text-foreground">{t('productCountLabel', { count: soldProducts.length })}</span>
                  <div className="flex items-center gap-6">
                    <span className="text-muted-foreground">
                      {t('txTotalQty')} <span className="font-semibold text-foreground">{soldTotalUnits}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {t('txTotalAmountColon')} <span className="font-semibold text-foreground">{formatCurrency(soldTotalRevenue)}</span>
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selectedId && !refundId && !cancelId && !deleteTarget && (
        <TransactionDetailModal
          transactionId={selectedId}
          onClose={() => setSelectedId(null)}
          onRefund={(id) => setRefundId(id)}
          onCancel={(id) => setCancelId(id)}
          onDelete={(id) => setDeleteTarget(transactions.find((tx) => tx.transaction_id === id) ?? null)}
        />
      )}

      {deleteTarget && (
        <TransactionDeleteModal
          transactionId={deleteTarget.transaction_id}
          billNumber={deleteTarget.bill_number}
          onClose={() => setDeleteTarget(null)}
          onSuccess={() => { setDeleteTarget(null); setSelectedId(null) }}
        />
      )}

      {bulkDeleteOpen && selectedTransactions.length > 0 && (
        <TransactionBulkDeleteModal
          transactions={selectedTransactions}
          onClose={() => setBulkDeleteOpen(false)}
          onSuccess={() => { setBulkDeleteOpen(false); setSelectedIds(new Set()) }}
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
