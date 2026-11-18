import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownCircle, ArrowLeftRight, ArrowUpCircle, CalendarRange, Download, Landmark, Plus, Wallet, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import StatCard from '@/components/ui/StatCard'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import { ActionButton, DeleteButton, EditButton } from '@/components/ui/RowActions'
import CashAccountFormModal from '@/components/finance/CashAccountFormModal'
import CashEntryModal from '@/components/finance/CashEntryModal'
import CashTransferModal from '@/components/finance/CashTransferModal'
import VoidReasonModal from '@/components/finance/VoidReasonModal'
import { categoryLabel, entryReference, kindLabel } from '@/components/finance/cashLabels'
import { deleteCashAccount, getCashAccounts, getCashLedger, voidCashEntry } from '@/api/cashAccounts'
import type { CashAccount, CashFlowType, LedgerEntry } from '@/api/cashAccounts'
import { PERMS, usePermissions } from '@/hooks/usePermissions'
import { defaultLedgerRange } from '@/lib/cashBook'
import { csvFilename, exportToCSV } from '@/lib/exportUtils'
import { cn, formatCurrency, formatDateTime, getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'

const LEDGER_LIMIT = 50

/**
 * Kas & Rekening — akun kas (Kas Besar, Kas Kecil, Brankas) dan rekening bank
 * milik usaha, masing-masing dengan buku mutasinya. Kas laci shift bukan akun:
 * setoran laci tampil di sini sebagai baris "Kas shift" dan dibatalkan dari
 * rincian shift, bukan dari halaman ini.
 */
export default function CashAccountsPage() {
  const qc = useQueryClient()
  const { can } = usePermissions()
  // Rutenya sudah dipagari izin ini; pemeriksaan di sini menjaga tampilan tetap
  // masuk akal bila halaman dirender tanpa izin (saldo null dari server).
  const canManage = can(PERMS.FINANCE_CASH_BOOK)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [accountForm, setAccountForm] = useState<{ account: CashAccount | null } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CashAccount | null>(null)
  const [entryType, setEntryType] = useState<CashFlowType | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [voidTarget, setVoidTarget] = useState<LedgerEntry | null>(null)
  const [range, setRange] = useState(defaultLedgerRange)
  const [page, setPage] = useState(1)
  const isDefaultRange = (() => { const initial = defaultLedgerRange(); return initial.start === range.start && initial.end === range.end })()

  const accountsQuery = useQuery({
    queryKey: ['cash-accounts', { includeInactive: canManage }],
    queryFn: () => getCashAccounts(canManage ? { include_inactive: true } : undefined),
  })
  const accounts: CashAccount[] = accountsQuery.data?.data?.data ?? []
  const activeAccounts = accounts.filter(account => account.is_active)
  const selected = accounts.find(account => account.id === selectedId) ?? accounts[0] ?? null

  const ledgerQuery = useQuery({
    queryKey: ['cash-ledger', selected?.id, range.start, range.end, page],
    queryFn: () => getCashLedger(selected!.id, { start_date: range.start || undefined, end_date: range.end || undefined, page, limit: LEDGER_LIMIT }),
    enabled: !!selected && canManage,
  })
  const ledger = ledgerQuery.data?.data?.data
  const entries: LedgerEntry[] = ledger?.entries ?? []

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCashAccount(id),
    onSuccess: (_, id) => {
      toast.success(t('cashAccDeleted'))
      if (selectedId === id) setSelectedId(null)
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['cash-accounts'] })
    },
    // Akun yang sudah punya mutasi ditolak server dengan pesan yang menyarankan
    // menonaktifkan — pesan itu yang ditampilkan apa adanya.
    onError: err => toast.error(getErrorMessage(err)),
  })

  const voidMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => voidCashEntry(id, reason),
    onSuccess: () => {
      toast.success(t('cashAccVoidDone'))
      setVoidTarget(null)
      qc.invalidateQueries({ queryKey: ['cash-accounts'] })
      qc.invalidateQueries({ queryKey: ['cash-ledger'] })
    },
    onError: err => toast.error(getErrorMessage(err)),
  })

  // Ekspor membaca SELURUH mutasi rentang ini dari server (export=1), bukan
  // hanya halaman yang sedang tampil. Baris batal tetap ditulis beserta
  // alasannya; tanpa baris TOTAL karena saldo tidak bermakna bila dijumlah.
  const [exporting, setExporting] = useState(false)
  const handleExport = async () => {
    if (!selected) return
    setExporting(true)
    try {
      const res = await getCashLedger(selected.id, { start_date: range.start || undefined, end_date: range.end || undefined, export: 1 })
      const all: LedgerEntry[] = res.data?.data?.entries ?? []
      exportToCSV(all.map(row => ({
        [t('labelTime')]: formatDateTime(row.occurred_at),
        [t('cashAccCsvCategory')]: categoryLabel(row.category),
        [t('cashAccColDetail')]: [row.description, entryReference(row)].filter(Boolean).join(' · '),
        [t('cashAccCsvNumber')]: row.number ?? '',
        [t('cashAccIn')]: row.type === 'IN' ? row.amount : '',
        [t('cashAccOut')]: row.type === 'OUT' ? row.amount : '',
        [t('cashAccColBalance')]: row.balance_after ?? '',
        [t('cashAccCsvBy')]: row.created_by_name ?? '',
        [t('labelStatus')]: row.voided ? [t('cashAccVoided'), row.void_reason].filter(Boolean).join(': ') : '',
      })), csvFilename(`mutasi-${selected.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'kas'}`), { withTotal: false })
    } catch (err) {
      toast.error(getErrorMessage(err) || t('cashAccExportFailed'))
    } finally {
      setExporting(false)
    }
  }

  const selectAccount = (account: CashAccount) => { setSelectedId(account.id); setPage(1) }
  const changeRange = (next: Partial<typeof range>) => { setRange(current => ({ ...current, ...next })); setPage(1) }

  const accountColumns = [
    {
      key: 'name', label: t('cashAccColAccount'),
      render: (row: CashAccount) => (
        <div className="min-w-0">
          <p className={cn('font-medium text-foreground', row.id === selected?.id && 'text-primary')}>{row.name}</p>
          {row.kind === 'bank' && row.account_holder && <p className="text-xs text-muted-foreground">{row.account_holder}</p>}
        </div>
      ),
    },
    {
      key: 'kind', label: t('cashAccKind'),
      render: (row: CashAccount) => <Badge variant={row.kind === 'bank' ? 'purple' : 'blue'}>{kindLabel(row.kind)}</Badge>,
    },
    {
      key: 'bank', label: t('cashAccColBank'),
      render: (row: CashAccount) => row.kind === 'bank' && (row.bank_name || row.account_number)
        ? <span className="text-sm text-foreground">{[row.bank_name, row.account_number].filter(Boolean).join(' · ')}</span>
        : <span className="text-muted-foreground">—</span>,
    },
    ...(canManage ? [{
      key: 'balance', label: t('cashAccColBalance'),
      render: (row: CashAccount) => row.balance == null
        ? <span className="text-muted-foreground">—</span>
        : <span className={cn('font-semibold tabular-nums', row.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>{formatCurrency(row.balance)}</span>,
    }] : []),
    {
      key: 'is_active', label: t('labelStatus'),
      render: (row: CashAccount) => row.is_active
        ? <Badge variant="green">{t('statusActive')}</Badge>
        : <Badge variant="gray">{t('statusInactiveShort')}</Badge>,
    },
    {
      key: 'actions', label: '',
      render: (row: CashAccount) => (
        <div className="flex gap-1 justify-end">
          {canManage && <ActionButton onClick={() => selectAccount(row)}>{t('cashAccViewLedger')}</ActionButton>}
          {canManage && <EditButton onClick={() => setAccountForm({ account: row })} />}
          {canManage && <DeleteButton onClick={() => setDeleteTarget(row)} />}
        </div>
      ),
    },
  ]

  const struck = (entry: LedgerEntry) => entry.voided && 'line-through text-muted-foreground'
  const ledgerColumns = [
    {
      key: 'occurred_at', label: t('labelTime'),
      render: (row: LedgerEntry) => (
        <div className={cn(struck(row))}>
          <p className="text-xs text-foreground">{formatDateTime(row.occurred_at)}</p>
          {row.created_by_name && <p className="text-xs text-muted-foreground">{t('cashAccBy', { name: row.created_by_name })}</p>}
        </div>
      ),
    },
    {
      key: 'detail', label: t('cashAccColDetail'),
      render: (row: LedgerEntry) => {
        const reference = entryReference(row)
        return (
          <div className="min-w-0 space-y-0.5">
            <div className={cn('flex flex-wrap items-center gap-1.5', struck(row))}>
              <span className="text-sm font-medium text-foreground">{categoryLabel(row.category)}</span>
              {row.number && <span className="font-mono text-xs text-muted-foreground">{row.number}</span>}
            </div>
            {(row.description || reference) && (
              <p className={cn('text-xs text-muted-foreground', struck(row))}>{[row.description, reference].filter(Boolean).join(' · ')}</p>
            )}
            {row.voided && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <Badge variant="red">{t('cashAccVoided')}</Badge>
                {row.void_reason && <span className="text-xs text-muted-foreground">{t('cashAccVoidedReason', { reason: row.void_reason })}</span>}
                {row.voided_by_name && <span className="text-xs text-muted-foreground">· {t('cashAccVoidedBy', { name: row.voided_by_name })}</span>}
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'in', label: t('cashAccIn'), className: 'text-right',
      render: (row: LedgerEntry) => row.type === 'IN'
        ? <span className={cn('tabular-nums font-medium text-green-600 dark:text-green-400', struck(row))}>{formatCurrency(row.amount)}</span>
        : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'out', label: t('cashAccOut'), className: 'text-right',
      render: (row: LedgerEntry) => row.type === 'OUT'
        ? <span className={cn('tabular-nums font-medium text-red-600 dark:text-red-400', struck(row))}>{formatCurrency(row.amount)}</span>
        : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'balance_after', label: t('cashAccColBalance'), className: 'text-right',
      render: (row: LedgerEntry) => row.balance_after == null
        ? <span className="text-muted-foreground">—</span>
        : <span className="tabular-nums text-foreground">{formatCurrency(row.balance_after)}</span>,
    },
    {
      key: 'actions', label: '',
      render: (row: LedgerEntry) => row.voidable && !row.voided
        ? <div className="flex justify-end"><ActionButton variant="delete" onClick={() => setVoidTarget(row)}>{t('cashAccVoidAction')}</ActionButton></div>
        : null,
    },
  ]

  const writable = canManage && !!selected?.is_active

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      <Header title={t('navCashAccounts')} subtitle={t('cashAccSubtitle')} />
      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">

        {/* Daftar akun */}
        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{t('cashAccCount', { count: accounts.length })}</span>
            {canManage && (
              <button onClick={() => setAccountForm({ account: null })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
                <Plus size={15} /> {t('cashAccAdd')}
              </button>
            )}
          </div>
          <DataTable columns={accountColumns as never[]} data={accounts as never[]} loading={accountsQuery.isLoading}
            error={accountsQuery.error} onRetry={accountsQuery.refetch}
            onRowClick={canManage ? (row: CashAccount) => selectAccount(row) : undefined}
            emptySlot={<EmptyState icon={<Wallet size={26} />} title={t('cashAccEmpty')} description={t('cashAccEmptyBody')}
              action={canManage ? { label: t('cashAccAdd'), icon: <Plus size={15} />, onClick: () => setAccountForm({ account: null }) } : undefined} />} />
          {!canManage && <p className="px-5 py-3 text-xs text-muted-foreground">{t('cashAccNoAccess')}</p>}
        </div>

        {/* Mutasi akun terpilih */}
        {canManage && selected && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-base font-semibold text-foreground">{t('cashAccLedgerTitle', { name: selected.name })}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('cashAccLedgerHint')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!writable} onClick={() => setEntryType('IN')} className="flex min-h-11 flex-1 sm:flex-none items-center justify-center gap-2 border border-border px-4 py-2 rounded-xl text-sm font-semibold hover:bg-muted disabled:opacity-50">
                  <ArrowDownCircle size={16} className="text-green-600 dark:text-green-400" /> {t('cashAccRecordIn')}
                </button>
                <button type="button" disabled={!writable} onClick={() => setEntryType('OUT')} className="flex min-h-11 flex-1 sm:flex-none items-center justify-center gap-2 border border-border px-4 py-2 rounded-xl text-sm font-semibold hover:bg-muted disabled:opacity-50">
                  <ArrowUpCircle size={16} className="text-red-600 dark:text-red-400" /> {t('cashAccRecordOut')}
                </button>
                <button type="button" disabled={!writable || activeAccounts.length < 2} onClick={() => setTransferOpen(true)}
                  title={activeAccounts.length < 2 ? t('cashAccTransferNeedTwo') : undefined}
                  className="flex min-h-11 flex-1 sm:flex-none items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                  <ArrowLeftRight size={16} /> {t('cashAccTransfer')}
                </button>
              </div>
            </div>
            {!selected.is_active && <p className="text-xs text-muted-foreground">{t('cashAccInactiveNote')}</p>}

            <div className="rounded-xl border border-border bg-card p-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CalendarRange size={16} className="text-muted-foreground" />{t('labelPeriod')}
                {!isDefaultRange && <button type="button" onClick={() => { setRange(defaultLedgerRange()); setPage(1) }} className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground" aria-label={t('cashAccResetRange')} title={t('cashAccResetRange')}><X size={16} /></button>}
              </div>
              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                <label className="min-w-0 space-y-1 text-xs text-muted-foreground">{t('cashDiscFrom')}
                  <input type="date" value={range.start} max={range.end || undefined} onChange={e => changeRange({ start: e.target.value })} className="block min-w-0 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground" />
                </label>
                <label className="min-w-0 space-y-1 text-xs text-muted-foreground">{t('cashDiscTo')}
                  <input type="date" value={range.end} min={range.start || undefined} onChange={e => changeRange({ end: e.target.value })} className="block min-w-0 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <StatCard title={t('cashAccOpening')} value={formatCurrency(ledger?.opening_balance ?? 0)} icon={<Landmark size={20} />} color="blue" loading={ledgerQuery.isLoading} />
              <StatCard title={t('cashAccIn')} value={formatCurrency(ledger?.total_in ?? 0)} icon={<ArrowDownCircle size={20} />} color="green" loading={ledgerQuery.isLoading} />
              <StatCard title={t('cashAccOut')} value={formatCurrency(ledger?.total_out ?? 0)} icon={<ArrowUpCircle size={20} />} color="orange" loading={ledgerQuery.isLoading} />
              <StatCard title={t('cashAccClosing')} value={formatCurrency(ledger?.closing_balance ?? 0)} icon={<Wallet size={20} />} color="purple" emphasis loading={ledgerQuery.isLoading} />
            </div>

            <div className="bg-card rounded-2xl border border-border">
              <div className="px-5 py-3 border-b border-border flex items-center justify-end">
                <button onClick={handleExport} disabled={!entries.length || exporting}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted disabled:opacity-40 transition shrink-0">
                  <Download size={14} />
                  {t('exportCsv')}
                </button>
              </div>
              <DataTable columns={ledgerColumns as never[]} data={entries as never[]} loading={ledgerQuery.isLoading}
                error={ledgerQuery.error} onRetry={ledgerQuery.refetch} emptyMessage={t('cashAccLedgerEmpty')} />
              <Pagination page={page} total={ledger?.pagination?.total ?? 0} limit={LEDGER_LIMIT} onChange={setPage} />
            </div>
          </div>
        )}
      </div>

      {accountForm && <CashAccountFormModal account={accountForm.account} onClose={() => setAccountForm(null)}
        onSaved={account => { if (!accountForm.account) setSelectedId(account.id) }} />}

      {entryType && selected && <CashEntryModal account={selected} type={entryType} onClose={() => setEntryType(null)} />}

      {transferOpen && <CashTransferModal accounts={activeAccounts} defaultFromId={selected?.is_active ? selected.id : undefined} onClose={() => setTransferOpen(false)} />}

      {voidTarget && (
        <VoidReasonModal open onClose={() => setVoidTarget(null)} pending={voidMut.isPending}
          hint={voidTarget.source === 'transfer' ? `${t('cashAccVoidHint')} ${t('cashAccVoidTransferHint')}` : t('cashAccVoidHint')}
          onConfirm={reason => voidMut.mutate({ id: voidTarget.id, reason })}
          summary={(
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{categoryLabel(voidTarget.category)}{voidTarget.number ? ` · ${voidTarget.number}` : ''}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(voidTarget.occurred_at)}{voidTarget.description ? ` · ${voidTarget.description}` : ''}</p>
              </div>
              <span className={cn('font-semibold tabular-nums whitespace-nowrap', voidTarget.type === 'IN' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                {voidTarget.type === 'IN' ? '+' : '−'}{formatCurrency(voidTarget.amount)}
              </span>
            </div>
          )} />
      )}

      <Modal open={!!deleteTarget} onClose={() => { if (!deleteMut.isPending) setDeleteTarget(null) }} title={t('cashAccDelete')} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('cashAccDeleteConfirm', { name: deleteTarget?.name ?? '' })}</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted">{t('actionCancel')}</button>
            <button onClick={() => deleteMut.mutate(deleteTarget!.id)} disabled={deleteMut.isPending} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
              {deleteMut.isPending ? t('actionDeleting') : t('actionDelete')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
