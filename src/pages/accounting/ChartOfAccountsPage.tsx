import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Info, Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Switch from '@/components/ui/Switch'
import EmptyState from '@/components/ui/EmptyState'
import QueryErrorState from '@/components/ui/QueryErrorState'
import { ActionButton, EditButton } from '@/components/ui/RowActions'
import AccountFormModal from '@/components/accounting/AccountFormModal'
import { ACCOUNTING_QUERY_KEY, primaryButtonClass } from '@/components/accounting/accountingUi'
import { activateAccAccount, deactivateAccAccount, getAccAccounts } from '@/api/accounting'
import type { AccAccount } from '@/api/accounting'
import { buildAccountTree, typeLabel, type AccountTreeRow } from '@/lib/accounting'
import { PERMS, usePermissions } from '@/hooks/usePermissions'
import { cn, formatCurrency, getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'

/**
 * Daftar Perkiraan (Chart of Accounts) per usaha — dibuat otomatis dari
 * template UMKM saat menu ini pertama dibuka. Disusun per jenis lalu pohon
 * induk-anak. Tidak ada hapus: perkiraan dinonaktifkan saja, dan perkiraan
 * bawaan tidak bisa dinonaktifkan sama sekali.
 */
export default function ChartOfAccountsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const canWrite = can(PERMS.FINANCE_ACCOUNTING)
  const [showInactive, setShowInactive] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<{ account: AccAccount | null } | null>(null)

  // Selalu ambil termasuk nonaktif: pemilih induk di formulir dan saringan
  // "tampilkan nonaktif" memakai data yang sama tanpa permintaan kedua.
  const query = useQuery({
    queryKey: [ACCOUNTING_QUERY_KEY, 'accounts', { includeInactive: true, withBalance: true }],
    queryFn: () => getAccAccounts({ include_inactive: true, with_balance: true }),
    select: res => res.data.data ?? [],
  })
  const all = query.data ?? []
  const q = search.trim().toLowerCase()
  const visible = all.filter(account => (showInactive || account.is_active)
    && (!q || account.code.toLowerCase().includes(q) || account.name.toLowerCase().includes(q)))
  // Saat mencari, pohon diratakan: anak yang cocok tetap tampil walau induknya tidak.
  const groups = buildAccountTree(visible)
  const inactiveCount = all.filter(account => !account.is_active).length

  const toggleMut = useMutation({
    mutationFn: (account: AccAccount) => account.is_active ? deactivateAccAccount(account.id) : activateAccAccount(account.id),
    onSuccess: res => {
      toast.success(res.data.data?.is_active ? t('accAccountActivated') : t('accAccountDeactivated'))
      qc.invalidateQueries({ queryKey: [ACCOUNTING_QUERY_KEY] })
    },
    // Penolakan (dipetakan, masih punya anak aktif) dijelaskan server.
    onError: err => toast.error(getErrorMessage(err)),
  })

  const columns = [
    {
      key: 'code', label: t('accColCode'),
      render: (row: AccountTreeRow) => (
        <span className={cn('font-mono text-sm', row.account.is_group ? 'font-semibold text-foreground' : 'text-muted-foreground')}
          style={{ paddingLeft: `${row.level * 1.25}rem` }}>{row.account.code}</span>
      ),
    },
    {
      key: 'name', label: t('accColAccount'),
      render: (row: AccountTreeRow) => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn('text-sm text-foreground', row.account.is_group && 'font-semibold', !row.account.is_active && 'text-muted-foreground')}>{row.account.name}</span>
            {row.account.is_group && <Badge variant="blue">{t('accBadgeGroup')}</Badge>}
            {row.account.cash_account_id && <Badge variant="purple">{t('accBadgeCashTwin')}</Badge>}
            {row.account.is_system && !row.account.cash_account_id && <Badge variant="gray">{t('accBadgeSystem')}</Badge>}
          </div>
          {row.account.description && <p className="text-xs text-muted-foreground">{row.account.description}</p>}
        </div>
      ),
    },
    {
      key: 'normal', label: t('accNormalBalance'),
      render: (row: AccountTreeRow) => <span className="text-xs text-muted-foreground">{row.account.normal_balance === 'debit' ? t('accDebit') : t('accCredit')}</span>,
    },
    {
      key: 'balance', label: t('accColBalance'), className: 'text-right',
      render: (row: AccountTreeRow) => row.account.balance == null
        ? <span className="text-muted-foreground">—</span>
        : <span className={cn('tabular-nums font-medium', row.account.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>{formatCurrency(row.account.balance)}</span>,
    },
    {
      key: 'is_active', label: t('labelStatus'),
      render: (row: AccountTreeRow) => row.account.is_active
        ? <Badge variant="green">{t('statusActive')}</Badge>
        : <Badge variant="gray">{t('statusInactiveShort')}</Badge>,
    },
    {
      key: 'actions', label: '',
      render: (row: AccountTreeRow) => (
        <div className="flex flex-wrap justify-end gap-1">
          {!row.account.is_group && <ActionButton onClick={() => navigate(`/accounting/ledger?account_id=${row.account.id}`)}>{t('navAccLedger')}</ActionButton>}
          {canWrite && <EditButton onClick={() => setForm({ account: row.account })} />}
          {/* Perkiraan bawaan tidak bisa dinonaktifkan — tombolnya tidak ditawarkan. */}
          {canWrite && !row.account.is_system && (
            <ActionButton variant={row.account.is_active ? 'delete' : 'neutral'} disabled={toggleMut.isPending}
              onClick={() => toggleMut.mutate(row.account)}>
              {row.account.is_active ? t('accDeactivate') : t('accActivate')}
            </ActionButton>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header title={t('navAccAccounts')} subtitle={t('accAccountsSubtitle')} />
      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder={t('accSearchAccount')} aria-label={t('accSearchAccount')}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-card text-foreground" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {inactiveCount > 0 && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                {t('accShowInactive', { count: inactiveCount })}
                <Switch size="sm" checked={showInactive} onChange={setShowInactive} label={t('accShowInactive', { count: inactiveCount })} />
              </span>
            )}
            {canWrite && (
              <button type="button" onClick={() => setForm({ account: null })} className={primaryButtonClass}>
                <Plus size={15} /> {t('accAccountAdd')}
              </button>
            )}
          </div>
        </div>

        <QueryErrorState error={query.error} onRetry={query.refetch} />
        {query.isLoading && (
          <div className="bg-card rounded-2xl border border-border">
            <DataTable columns={columns as never[]} data={[]} loading />
          </div>
        )}
        {!query.isLoading && !query.error && groups.length === 0 && (
          <div className="bg-card rounded-2xl border border-border">
            <EmptyState icon={<BookOpen size={26} />} title={q ? t('accSearchEmpty') : t('accAccountsEmpty')} />
          </div>
        )}
        {groups.map(group => (
          <section key={group.type} className="bg-card rounded-2xl border border-border">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">{typeLabel(group.type)}</h2>
              <span className="text-xs text-muted-foreground">{t('accAccountCount', { count: group.rows.length })}</span>
            </div>
            <DataTable columns={columns as never[]} data={group.rows.map(row => ({ ...row, id: row.account.id })) as never[]} />
          </section>
        ))}

        <div className="flex gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">{t('accAccountsNote')}</p>
        </div>
      </div>

      {form && <AccountFormModal account={form.account} accounts={all} onClose={() => setForm(null)} />}
    </div>
  )
}
