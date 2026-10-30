import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Info, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import SearchableSelect from '@/components/ui/SearchableSelect'
import QueryErrorState from '@/components/ui/QueryErrorState'
import { ACCOUNTING_QUERY_KEY, primaryButtonClass } from '@/components/accounting/accountingUi'
import { getAccAccounts, getAccMappings, updateAccMappings } from '@/api/accounting'
import { accountOptionLabel, mappableAccounts, typeLabel } from '@/lib/accounting'
import { PERMS, usePermissions } from '@/hooks/usePermissions'
import { getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'

/**
 * Pemetaan posting: jurnal otomatis menyebut *peran* ("Kas laci kasir",
 * "Penjualan", …) dan pemilik memilih perkiraannya di sini. Hanya peran yang
 * diubah yang dikirim — server menerima pembaruan sebagian.
 */
export default function AccountMappingPage() {
  const qc = useQueryClient()
  const { can } = usePermissions()
  const canWrite = can(PERMS.FINANCE_ACCOUNTING)
  // Draf per peran; kosong = belum diubah (nilai dari server yang tampil).
  const [draft, setDraft] = useState<Record<string, string>>({})

  const mappingsQuery = useQuery({
    queryKey: [ACCOUNTING_QUERY_KEY, 'mappings'],
    queryFn: () => getAccMappings(),
    select: res => res.data.data ?? [],
  })
  const accountsQuery = useQuery({
    queryKey: [ACCOUNTING_QUERY_KEY, 'accounts', { includeInactive: false, withBalance: false }],
    queryFn: () => getAccAccounts(),
    select: res => res.data.data ?? [],
  })
  const mappings = mappingsQuery.data ?? []
  const accounts = accountsQuery.data ?? []
  const changes = mappings
    .filter(mapping => draft[mapping.role] && draft[mapping.role] !== mapping.account_id)
    .map(mapping => ({ role: mapping.role, account_id: draft[mapping.role] }))

  const saveMut = useMutation({
    mutationFn: () => updateAccMappings(changes),
    onSuccess: () => {
      toast.success(t('accMappingSaved'))
      setDraft({})
      qc.invalidateQueries({ queryKey: [ACCOUNTING_QUERY_KEY] })
    },
    onError: err => toast.error(getErrorMessage(err)),
  })

  const loading = mappingsQuery.isLoading || accountsQuery.isLoading

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header title={t('navAccMappings')} subtitle={t('accMappingSubtitle')} />
      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground min-w-0 flex-1">{t('accMappingHint')}</p>
            {canWrite && (
              <button type="button" onClick={() => saveMut.mutate()} disabled={!changes.length || saveMut.isPending} className={primaryButtonClass}>
                <Save size={15} /> {saveMut.isPending ? t('saving') : changes.length ? t('accMappingSaveCount', { count: changes.length }) : t('actionSave')}
              </button>
            )}
          </div>
          <QueryErrorState error={mappingsQuery.error ?? accountsQuery.error} onRetry={() => { void mappingsQuery.refetch(); void accountsQuery.refetch() }} />
          {loading && <div className="p-5 space-y-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-muted" />)}</div>}
          {!loading && !mappingsQuery.error && mappings.length === 0 && <p className="px-5 py-12 text-center text-sm text-muted-foreground">{t('emptyNoData')}</p>}
          <div className="divide-y divide-border">
            {mappings.map(mapping => {
              const value = draft[mapping.role] || mapping.account_id
              const allowed = mappableAccounts(accounts, mapping.allowed_types)
              const options = allowed.map(account => ({ value: account.id, label: accountOptionLabel(account), group: typeLabel(account.type) }))
              // Perkiraan yang sedang terpasang tetap tampil walau sudah tidak
              // lolos saringan (mis. dinonaktifkan) — supaya pilihannya tidak kosong.
              if (!options.some(option => option.value === mapping.account_id)) {
                options.unshift({ value: mapping.account_id, label: accountOptionLabel({ code: mapping.account_code, name: mapping.account_name }), group: '' })
              }
              const changed = value !== mapping.account_id
              return (
                <div key={mapping.role} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{mapping.label}{changed && <span className="ml-2 text-xs font-normal text-warning">{t('accMappingChanged')}</span>}</p>
                    {mapping.description && <p className="text-xs text-muted-foreground">{mapping.description}</p>}
                    {mapping.allowed_types.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{t('accMappingAllowed', { types: mapping.allowed_types.map(typeLabel).join(', ') })}</p>
                    )}
                  </div>
                  <SearchableSelect value={value} onChange={next => next && setDraft(current => ({ ...current, [mapping.role]: next }))}
                    options={options} clearable={false} searchable disabled={!canWrite} label={mapping.label} className="w-full" />
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">{t('accMappingNote')}</p>
        </div>
      </div>
    </div>
  )
}
