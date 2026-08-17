import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import EmptyState from '@/components/ui/EmptyState'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import TransactionDetailModal from '@/components/transactions/TransactionDetailModal'
import { getKasbonList } from '@/api/kasbon'
import { useOutletStore } from '@/store/outletStore'
import type { Transaction } from '@/types'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { t } from '@/lib/i18n'

export default function KasbonPage() {
  const { selected: selectedOutlet } = useOutletStore()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const outletId = selectedOutlet?.id

  const { data, isLoading } = useQuery({
    queryKey: ['kasbon', { page, limit: 20, search, outlet_id: outletId }],
    queryFn: () => getKasbonList({
      page,
      limit: 20,
      search: search || undefined,
      outlet_id: outletId || undefined,
    }),
  })

  const transactions = data?.data?.data?.results ?? []
  const total = data?.data?.data?.total ?? 0

  const columns = [
    {
      key: 'bill_number',
      label: t('kasbonBillNumber'),
      render: (row: Transaction) => (
        <span className="font-mono text-sm font-semibold text-foreground">#{row.bill_number}</span>
      ),
    },
    {
      key: 'customer',
      label: t('navCustomers'),
      render: (row: Transaction) => (
        <span className="text-sm text-muted-foreground">{row.customer?.name || t('kasbonWalkIn')}</span>
      ),
    },
    {
      key: 'final_price',
      label: t('kasbonTotalBill'),
      render: (row: Transaction) => (
        <span className="font-semibold text-foreground">{formatCurrency(row.final_price)}</span>
      ),
    },
    {
      key: 'amount_received',
      label: t('kasbonPaid'),
      render: (row: Transaction) => (
        <span className="text-sm text-green-600 dark:text-green-400">{formatCurrency(row.amount_received ?? 0)}</span>
      ),
    },
    {
      key: 'remaining',
      label: t('kasbonRemaining'),
      render: (row: Transaction) => {
        const remaining = row.final_price - (row.amount_received ?? 0)
        return (
          <span className="font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(remaining > 0 ? remaining : 0)}</span>
        )
      },
    },
    {
      key: 'status',
      label: t('labelStatus'),
      render: () => <Badge variant="yellow">{t('kasbonLabel')}</Badge>,
    },
    {
      key: 'created_at',
      label: t('labelTime'),
      render: (row: Transaction) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(row.created_at)}</span>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('navCredit')} subtitle={t('kasbonPageSubtitle')} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="bg-card rounded-2xl border border-border">
          {/* Search bar */}
          <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder={t('kasbonSearch')}
              className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-muted-foreground">{t('kasbonUnpaidCount', { count: total })}</span>
          </div>

          <DataTable
            columns={columns as never[]}
            data={transactions as never[]}
            loading={isLoading}
            onRowClick={(row) => setSelectedId((row as Transaction).transaction_id)}
            emptySlot={
              <EmptyState
                title={t('kasbonEmpty')}
                description={t('kasbonEmptyDesc')}
              />
            }
          />
          <Pagination page={page} total={total} limit={20} onChange={setPage} />
        </div>
      </div>

      {selectedId && (
        <TransactionDetailModal
          transactionId={selectedId}
          onClose={() => setSelectedId(null)}
          onRefund={() => {}}
          onCancel={() => {}}
        />
      )}
    </div>
  )
}
