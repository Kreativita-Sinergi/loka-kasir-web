import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import QueryErrorState from '@/components/ui/QueryErrorState'
import VoidReasonModal from '@/components/finance/VoidReasonModal'
import { getAccJournalById, voidAccJournal } from '@/api/accounting'
import { formatAccDate, JOURNAL_KIND_LABEL } from '@/lib/accounting'
import { PERMS, usePermissions } from '@/hooks/usePermissions'
import { cn, formatCurrency, formatDateTime, getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { ACCOUNTING_QUERY_KEY, thClass } from './accountingUi'

/**
 * Rincian satu Jurnal Umum (manual). Jurnal tidak bisa diubah atau dihapus —
 * hanya dibatalkan dengan alasan, lalu tampil dicoret dan tidak dihitung di
 * laporan. Tombol batal hanya untuk pemegang `finance.accounting`.
 */
export default function JournalDetailModal({ journalId, onClose }: { journalId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { can } = usePermissions()
  const canWrite = can(PERMS.FINANCE_ACCOUNTING)
  const [voiding, setVoiding] = useState(false)

  const query = useQuery({
    queryKey: [ACCOUNTING_QUERY_KEY, 'journal-detail', journalId],
    queryFn: () => getAccJournalById(journalId),
    select: res => res.data.data,
  })
  const entry = query.data

  const voidMut = useMutation({
    mutationFn: (reason: string) => voidAccJournal(journalId, reason),
    onSuccess: () => {
      toast.success(t('accJournalVoided'))
      setVoiding(false)
      qc.invalidateQueries({ queryKey: [ACCOUNTING_QUERY_KEY] })
    },
    onError: err => toast.error(getErrorMessage(err)),
  })

  const struck = entry?.voided && 'line-through text-muted-foreground'

  return (
    <>
      <Modal open={!voiding} onClose={onClose} title={entry?.ref_no ? t('accJournalDetailTitle', { number: entry.ref_no }) : t('accJournalDetail')} size="lg">
        <QueryErrorState error={query.error} onRetry={query.refetch} />
        {query.isLoading && <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-4 animate-pulse rounded bg-muted" />)}</div>}
        {entry && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">{t('labelDate')}</p><p className="font-medium text-foreground">{formatAccDate(entry.date)}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('accJournalKind')}</p><p className="font-medium text-foreground">{entry.kind ? t(JOURNAL_KIND_LABEL[entry.kind]) : '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('accJournalReference')}</p><p className="font-medium text-foreground">{entry.reference || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('accCreatedBy')}</p><p className="font-medium text-foreground">{entry.created_by_name || '—'}</p></div>
            </div>
            <p className={cn('text-sm text-foreground', struck)}>{entry.description}</p>
            {entry.voided && (
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                <Badge variant="red">{t('accVoided')}</Badge>
                {entry.void_reason && <span>{t('accVoidedReason', { reason: entry.void_reason })}</span>}
                {entry.voided_by_name && <span>· {t('accVoidedBy', { name: entry.voided_by_name })}</span>}
                {entry.voided_at && <span>· {formatDateTime(entry.voided_at)}</span>}
              </div>
            )}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th scope="col" className={thClass}>{t('accColAccount')}</th>
                    <th scope="col" className={thClass}>{t('accColMemo')}</th>
                    <th scope="col" className={cn(thClass, 'text-right')}>{t('accDebit')}</th>
                    <th scope="col" className={cn(thClass, 'text-right')}>{t('accCredit')}</th>
                  </tr>
                </thead>
                <tbody className={cn(struck)}>
                  {entry.lines.map((line, index) => (
                    <tr key={index} className="border-b border-border last:border-0">
                      <td className="px-4 py-2"><span className="mr-2 font-mono text-xs text-muted-foreground">{line.account_code}</span>{line.account_name}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{line.memo || ''}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{line.debit ? formatCurrency(line.debit) : ''}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{line.credit ? formatCurrency(line.credit) : ''}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-border bg-muted/30 font-semibold">
                    <td className="px-4 py-2" colSpan={2}>{t('exportTotalRow')}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(entry.total_debit)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(entry.total_credit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted">{t('actionClose')}</button>
              {canWrite && !entry.voided && (
                <button type="button" onClick={() => setVoiding(true)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl">
                  {t('accJournalVoid')}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
      {voiding && entry && (
        <VoidReasonModal open onClose={() => setVoiding(false)} pending={voidMut.isPending} hint={t('accJournalVoidHint')}
          onConfirm={reason => voidMut.mutate(reason)}
          summary={(
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{entry.ref_no}</p>
                <p className="text-xs text-muted-foreground">{formatAccDate(entry.date)} · {entry.description}</p>
              </div>
              <span className="font-semibold tabular-nums whitespace-nowrap">{formatCurrency(entry.total_debit)}</span>
            </div>
          )} />
      )}
    </>
  )
}
