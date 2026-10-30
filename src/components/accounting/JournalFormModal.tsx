import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Form from '@/components/ui/Form'
import NumericInput from '@/components/ui/NumericInput'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { createAccJournal, getAccAccounts } from '@/api/accounting'
import type { AccAccount, JournalKind } from '@/api/accounting'
import {
  accountOptionLabel, JOURNAL_KIND_LABEL, JOURNAL_KINDS, journalDraftTotals, journalLinesPayload,
  typeLabel, type JournalDraftLine,
} from '@/lib/accounting'
import { newIdempotencyKey } from '@/lib/cashBook'
import { cn, formatCurrency, getErrorMessage, todayISODate } from '@/lib/utils'
import { t } from '@/lib/i18n'
import type { MessageKey } from '@/lib/messages'
import { ACCOUNTING_QUERY_KEY, inputClass } from './accountingUi'

let lineSeq = 0
const blankLine = (): JournalDraftLine => ({ key: `l${++lineSeq}`, accountId: '', debit: '', credit: '', memo: '' })

const ISSUE_MESSAGE: Record<string, MessageKey> = {
  empty: 'accJournalIssueEmpty',
  too_few_lines: 'accJournalIssueTooFew',
  line_incomplete: 'accJournalIssueIncomplete',
  line_both_sides: 'accJournalIssueBothSides',
}

/**
 * Jurnal Umum (manual). Kunci idempotensi dibuat sekali saat formulir dibuka
 * dan dipakai ulang di setiap percobaan kirim — klik ganda atau kirim ulang
 * setelah jaringan putus tidak boleh membuat dua nomor JU. Tombol simpan baru
 * aktif setelah debit = kredit (sampai sen), sama dengan aturan server.
 */
export default function JournalFormModal({ onClose, onCreated }: { onClose: () => void; onCreated?: (number: string | null) => void }) {
  const qc = useQueryClient()
  const [idempotencyKey] = useState(newIdempotencyKey)
  const [date, setDate] = useState(() => todayISODate())
  const [kind, setKind] = useState<JournalKind>('general')
  const [description, setDescription] = useState('')
  const [reference, setReference] = useState('')
  const [lines, setLines] = useState<JournalDraftLine[]>(() => [blankLine(), blankLine()])
  const [submitted, setSubmitted] = useState(false)

  const accountsQuery = useQuery({
    queryKey: [ACCOUNTING_QUERY_KEY, 'accounts', { includeInactive: false, withBalance: false }],
    queryFn: () => getAccAccounts(),
    select: res => res.data.data ?? [],
  })
  // Hanya perkiraan `postable`: induk, Laba Tahun Berjalan, dan kembaran akun
  // kas ditolak server (uang kas dicatat di Kas & Rekening).
  const postable: AccAccount[] = (accountsQuery.data ?? []).filter(account => account.postable)
  const options = postable.map(account => ({ value: account.id, label: accountOptionLabel(account), group: typeLabel(account.type) }))

  const totals = journalDraftTotals(lines)
  const descriptionValid = description.trim().length >= 1 && description.trim().length <= 200
  const canSave = totals.balanced && descriptionValid

  const update = (key: string, patch: Partial<JournalDraftLine>) =>
    setLines(current => current.map(line => line.key === key ? { ...line, ...patch } : line))

  const mutation = useMutation({
    mutationFn: () => createAccJournal({
      date,
      kind,
      description: description.trim(),
      reference: reference.trim() || null,
      lines: journalLinesPayload(lines),
    }, idempotencyKey),
    onSuccess: res => {
      const number = res.data.data?.ref_no ?? null
      toast.success(t('accJournalCreated', { number: number ?? '' }))
      qc.invalidateQueries({ queryKey: [ACCOUNTING_QUERY_KEY] })
      onCreated?.(number)
      onClose()
    },
    onError: err => toast.error(getErrorMessage(err)),
  })

  const issueText = totals.issue === 'unbalanced'
    ? t('accJournalUnbalanced', { amount: formatCurrency(Math.abs(totals.difference)) })
    : totals.issue ? t(ISSUE_MESSAGE[totals.issue]) : t('accJournalBalanced')

  return (
    <Modal open onClose={() => { if (!mutation.isPending) onClose() }} title={t('accJournalNew')} size="lg">
      <Form noValidate onSubmit={event => {
        event.preventDefault()
        setSubmitted(true)
        if (canSave && !mutation.isPending) mutation.mutate()
      }} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="ju-date" className="block text-sm font-medium text-foreground mb-1">{t('labelDate')}</label>
            <input id="ju-date" type="date" value={date} max={todayISODate()} required onChange={event => setDate(event.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('accJournalKind')}</label>
            <SearchableSelect value={kind} onChange={value => value && setKind(value as JournalKind)} clearable={false} label={t('accJournalKind')}
              options={JOURNAL_KINDS.map(value => ({ value, label: t(JOURNAL_KIND_LABEL[value]) }))} className="w-full" />
          </div>
          <div>
            <label htmlFor="ju-ref" className="block text-sm font-medium text-foreground mb-1">{t('accJournalReference')} <span className="text-muted-foreground font-normal">({t('labelOptional')})</span></label>
            <input id="ju-ref" value={reference} onChange={event => setReference(event.target.value)} maxLength={60} placeholder="BKK-001" className={inputClass} />
          </div>
        </div>
        <div>
          <label htmlFor="ju-desc" className="block text-sm font-medium text-foreground mb-1">{t('accColDescription')}</label>
          <input id="ju-desc" value={description} onChange={event => setDescription(event.target.value)} maxLength={200}
            placeholder={t('accJournalDescriptionPlaceholder')} aria-invalid={submitted && !descriptionValid} className={inputClass} />
          {submitted && !descriptionValid && <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{t('accJournalDescriptionRequired')}</p>}
        </div>

        <div className="rounded-xl border border-border">
          <div className="hidden md:grid grid-cols-[minmax(0,1fr)_9rem_9rem_minmax(0,10rem)_2.75rem] gap-2 px-3 py-2 border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground">
            <span>{t('accColAccount')}</span><span className="text-right">{t('accDebit')}</span><span className="text-right">{t('accCredit')}</span><span>{t('accColMemo')}</span><span />
          </div>
          <div className="divide-y divide-border">
            {lines.map((line, index) => (
              <div key={line.key} className="grid grid-cols-2 md:grid-cols-[minmax(0,1fr)_9rem_9rem_minmax(0,10rem)_2.75rem] gap-2 p-3 items-start">
                <div className="col-span-2 md:col-span-1">
                  <SearchableSelect value={line.accountId} onChange={value => update(line.key, { accountId: value })} options={options} searchable
                    placeholder={accountsQuery.isLoading ? t('loading') : t('accSelectAccount')} label={t('accLineAccount', { n: index + 1 })} className="w-full" />
                </div>
                {/* Satu baris hanya debit ATAU kredit: mengisi satu sisi mengosongkan sisi lain. */}
                <NumericInput min={0} step="any" value={line.debit} aria-label={`${t('accDebit')} ${index + 1}`} placeholder={t('accDebit')}
                  onChange={event => update(line.key, { debit: event.target.value, ...(event.target.value ? { credit: '' } : {}) })}
                  className={cn(inputClass, 'text-right tabular-nums')} />
                <NumericInput min={0} step="any" value={line.credit} aria-label={`${t('accCredit')} ${index + 1}`} placeholder={t('accCredit')}
                  onChange={event => update(line.key, { credit: event.target.value, ...(event.target.value ? { debit: '' } : {}) })}
                  className={cn(inputClass, 'text-right tabular-nums')} />
                <input value={line.memo} onChange={event => update(line.key, { memo: event.target.value })} maxLength={200}
                  aria-label={`${t('accColMemo')} ${index + 1}`} placeholder={t('accColMemo')} className={cn(inputClass, 'col-span-2 md:col-span-1')} />
                <button type="button" onClick={() => setLines(current => current.filter(item => item.key !== line.key))} disabled={lines.length <= 2}
                  aria-label={t('accLineRemove', { n: index + 1 })} title={t('accLineRemove', { n: index + 1 })}
                  className="col-span-2 md:col-span-1 flex min-h-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-red-600 disabled:opacity-30">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-t border-border">
            <button type="button" onClick={() => setLines(current => [...current, blankLine()])} disabled={lines.length >= 100}
              className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40">
              <Plus size={15} /> {t('accLineAdd')}
            </button>
            <div className="flex flex-wrap items-center gap-4 text-sm tabular-nums">
              <span className="text-muted-foreground">{t('accDebit')}: <span className="font-semibold text-foreground">{formatCurrency(totals.debit)}</span></span>
              <span className="text-muted-foreground">{t('accCredit')}: <span className="font-semibold text-foreground">{formatCurrency(totals.credit)}</span></span>
            </div>
          </div>
        </div>
        <p role="status" className={cn('rounded-xl px-3 py-2 text-sm font-medium',
          totals.balanced ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning')}>
          {issueText}
        </p>
        <p className="text-xs text-muted-foreground">{t('accJournalCashNote')}</p>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} disabled={mutation.isPending} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted">{t('actionCancel')}</button>
          <button type="submit" disabled={!canSave || mutation.isPending} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
            {mutation.isPending ? t('saving') : t('accJournalSave')}
          </button>
        </div>
      </Form>
    </Modal>
  )
}
