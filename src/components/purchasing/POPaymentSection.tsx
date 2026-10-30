import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Wallet } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Form from '@/components/ui/Form'
import NumericInput from '@/components/ui/NumericInput'
import SearchableSelect from '@/components/ui/SearchableSelect'
import QueryErrorState from '@/components/ui/QueryErrorState'
import VoidReasonModal from '@/components/finance/VoidReasonModal'
import { accountOptionLabel } from '@/components/finance/cashLabels'
import { getCashAccounts } from '@/api/cashAccounts'
import {
  addPOPayment, getPOPayments, setPODueDate, voidPOPayment,
  type POPayment, type POPaymentMethod, type POPaymentSummary,
} from '@/api/purchasePayables'
import { usePermissions, PERMS } from '@/hooks/usePermissions'
import { formatCurrency, formatDate, formatDateTime, getErrorMessage, todayISODate } from '@/lib/utils'
import { parseNumericInput } from '@/lib/materialUnits'
import { activeMoney } from '@/lib/money'
import { newIdempotencyKey, occurredAtFor } from '@/lib/cashBook'
import { t } from '@/lib/i18n'
import {
  canPay, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_VARIANT, paymentStatusLabel,
} from '@/lib/purchasePayables'
import type { PurchaseOrder } from '@/types'

const inputClass = 'w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

/** Kunci query riwayat bayar satu PO. */
const poPaymentsKey = (poId: string) => ['purchase-order-payments', poId]

/**
 * Bagian "Pembayaran" di rincian PO: nilai barang diterima, dibayar, sisa
 * hutang, jatuh tempo, riwayat bayar (batal tetap tampil dicoret), dan Bayar.
 */
export default function POPaymentSection({ po }: { po: PurchaseOrder }) {
  const qc = useQueryClient()
  const { can } = usePermissions()
  const canWrite = can(PERMS.INVENTORY_PURCHASE_ORDER)
  const [payOpen, setPayOpen] = useState(false)
  const [voidTarget, setVoidTarget] = useState<POPayment | null>(null)
  const [editingDue, setEditingDue] = useState(false)
  const [dueInput, setDueInput] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: poPaymentsKey(po.id),
    queryFn: () => getPOPayments(po.id),
    select: res => res.data.data,
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: poPaymentsKey(po.id) })
    qc.invalidateQueries({ queryKey: ['purchase-order', po.id] })
    qc.invalidateQueries({ queryKey: ['purchase-orders'] })
    qc.invalidateQueries({ queryKey: ['purchase-report'] })
    qc.invalidateQueries({ queryKey: ['supplier-payables'] })
    qc.invalidateQueries({ queryKey: ['cash-accounts'] })
    qc.invalidateQueries({ queryKey: ['cash-ledger'] })
  }

  const dueMut = useMutation({
    mutationFn: (due: string | null) => setPODueDate(po.id, due),
    onSuccess: () => { toast.success(t('htsDueSaved')); setEditingDue(false); refresh() },
    onError: err => toast.error(getErrorMessage(err)),
  })
  const voidMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => voidPOPayment(po.id, id, reason),
    onSuccess: () => { toast.success(t('htsVoided')); setVoidTarget(null); refresh() },
    onError: err => toast.error(getErrorMessage(err)),
  })

  const summary: POPaymentSummary | undefined = data
  const received = summary?.received_amount ?? po.received_amount ?? 0
  const paid = summary?.paid_amount ?? po.paid_amount ?? 0
  const balance = summary?.balance ?? po.payable_balance ?? 0
  const status = summary?.payment_status ?? po.payment_status ?? 'none'
  const due = summary ? summary.due_date : po.due_date ?? null
  const overdue = canPay(balance) ? summary?.days_overdue ?? 0 : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{t('htsPayments')}</p>
        <Badge variant={PAYMENT_STATUS_VARIANT[status]}>{paymentStatusLabel(status)}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-border p-3 text-sm">
        <div className="flex justify-between gap-2"><span className="text-muted-foreground">{t('htsReceivedValue')}</span><span className="font-medium text-foreground">{formatCurrency(received)}</span></div>
        <div className="flex justify-between gap-2"><span className="text-muted-foreground">{t('htsPaid')}</span><span className="font-medium text-foreground">{formatCurrency(paid)}</span></div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">{t('htsBalance')}</span>
          <span className={`font-bold ${canPay(balance) ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{formatCurrency(balance)}</span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-muted-foreground">{t('htsDueDate')}</span>
          {editingDue ? (
            <span className="flex items-center gap-1">
              <input type="date" value={dueInput} onChange={e => setDueInput(e.target.value)}
                className="px-2 py-1 text-sm rounded-lg border border-border bg-card text-foreground" aria-label={t('htsDueDate')} />
              <button type="button" disabled={dueMut.isPending} onClick={() => dueMut.mutate(dueInput || null)}
                className="px-2 py-1 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">{t('actionSave')}</button>
              <button type="button" onClick={() => setEditingDue(false)} className="px-2 py-1 text-xs rounded-lg border border-border hover:bg-muted">{t('actionCancel')}</button>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-right">
              <span className={overdue > 0 ? 'font-medium text-red-600 dark:text-red-400' : 'font-medium text-foreground'}>
                {due ? formatDate(due) : t('htsDueNone')}
                {overdue > 0 && ` · ${t('htsOverdueDays', { days: overdue })}`}
              </span>
              {canWrite && (
                <button type="button" onClick={() => { setDueInput(due ?? ''); setEditingDue(true) }}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">{t('actionEdit')}</button>
              )}
            </span>
          )}
        </div>
      </div>
      {editingDue && <p className="text-xs text-muted-foreground">{t('htsDueHint')}</p>}
      {received <= 0.004 && <p className="text-xs text-muted-foreground">{t('htsNothingReceived')}</p>}

      <QueryErrorState error={error} onRetry={refetch} />
      {isLoading && <div className="h-4 bg-muted rounded animate-pulse" />}
      {summary && summary.payments.length === 0 && <p className="text-xs text-muted-foreground">{t('htsNoPayments')}</p>}
      {summary && summary.payments.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {summary.payments.map(p => (
            <li key={p.id} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className={`font-semibold ${p.voided ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{formatCurrency(p.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {[formatDateTime(p.paid_at), p.cash_account_name ?? t(PAYMENT_METHOD_LABEL[p.method]), p.created_by_name].filter(Boolean).join(' · ')}
                </p>
                {p.voided
                  ? <p className="text-xs text-red-600 dark:text-red-400">{[t('htsVoidedReason', { reason: p.void_reason ?? '-' }), p.voided_by_name].filter(Boolean).join(' · ')}</p>
                  : p.note && <p className="text-xs text-muted-foreground">{p.note}</p>}
              </div>
              {canWrite && !p.voided && (
                <button type="button" onClick={() => setVoidTarget(p)}
                  className="shrink-0 text-xs font-medium text-red-600 dark:text-red-400 hover:underline">{t('htsVoid')}</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canWrite && summary && canPay(summary.balance) && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setPayOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
            <Wallet size={16} /> {t('htsPay')}
          </button>
        </div>
      )}

      {payOpen && summary && (
        <POPaymentModal po={po} summary={summary} onClose={() => setPayOpen(false)} onSaved={refresh} />
      )}
      <VoidReasonModal
        open={!!voidTarget}
        onClose={() => setVoidTarget(null)}
        onConfirm={reason => voidTarget && voidMut.mutate({ id: voidTarget.id, reason })}
        pending={voidMut.isPending}
        hint={t('htsVoidHint')}
        summary={voidTarget && (
          <p className="font-medium text-foreground">{formatCurrency(voidTarget.amount)} · {formatDateTime(voidTarget.paid_at)} · {po.po_number}</p>
        )}
      />
    </div>
  )
}

/** "Bayar ke supplier". Dipasang hanya saat dibuka. */
export function POPaymentModal({ po, summary, onClose, onSaved }: {
  po: PurchaseOrder
  summary: POPaymentSummary
  onClose: () => void
  onSaved: () => void
}) {
  const { can } = usePermissions()
  // Memilih akun menulis buku Kas & Rekening: hanya untuk pemegang izinnya.
  const canCashBook = can(PERMS.FINANCE_CASH_BOOK)
  const [idempotencyKey] = useState(newIdempotencyKey)
  const [amount, setAmount] = useState(() => String(summary.balance))
  const [date, setDate] = useState(() => todayISODate())
  const [method, setMethod] = useState<POPaymentMethod>('cash')
  const [accountId, setAccountId] = useState('')
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const money = activeMoney()

  const { data: accounts = [] } = useQuery({
    queryKey: ['cash-accounts', 'active'],
    queryFn: () => getCashAccounts(),
    select: res => (res.data.data ?? []).filter(a => a.is_active),
    enabled: canCashBook,
  })

  const value = parseNumericInput(amount)
  const valid = Number.isFinite(value) && value > 0 && value <= summary.balance + 0.004

  const mutation = useMutation({
    mutationFn: () => addPOPayment(po.id, {
      amount: value,
      paid_at: occurredAtFor(date),
      method,
      cash_account_id: accountId || null,
      note: note.trim() || null,
    }, idempotencyKey),
    onSuccess: () => { toast.success(t('htsPaySaved')); onSaved(); onClose() },
    onError: err => toast.error(getErrorMessage(err)),
  })

  return (
    <Modal open onClose={() => { if (!mutation.isPending) onClose() }} size="sm"
      title={`${t('htsPayTitle')} — ${po.po_number}`}>
      <Form onSubmit={event => {
        event.preventDefault()
        setSubmitted(true)
        if (valid && !mutation.isPending) mutation.mutate()
      }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t('htsPayAmount')} ({money.currency})</label>
          <NumericInput min={0} step="any" value={amount} required autoFocus onChange={event => setAmount(event.target.value)}
            aria-invalid={submitted && !valid} className={inputClass} />
          <p className={`mt-1 text-xs ${submitted && !valid ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`} role={submitted && !valid ? 'alert' : undefined}>
            {submitted && !valid && value > summary.balance ? t('htsPayExceeds') : t('htsPayRemaining', { amount: formatCurrency(summary.balance) })}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t('htsPayDate')}</label>
          <input type="date" value={date} max={todayISODate()} required onChange={event => setDate(event.target.value)} className={inputClass} />
        </div>
        {canCashBook && accounts.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('htsPayFrom')} <span className="text-muted-foreground font-normal">({t('labelOptional')})</span></label>
            <SearchableSelect value={accountId} onChange={setAccountId} clearable={false} label={t('htsPayFrom')} className="w-full"
              options={[{ value: '', label: t('htsPayFromNone') }, ...accounts.map(a => ({ value: a.id, label: accountOptionLabel(a) }))]} />
            <p className="mt-1 text-xs text-muted-foreground">{t('htsPayFromHint')}</p>
          </div>
        )}
        {/* Bila akun dipilih, server menurunkan caranya dari jenis akun. */}
        {!accountId && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('htsPayMethod')}</label>
            <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit" role="radiogroup" aria-label={t('htsPayMethod')}>
              {(Object.keys(PAYMENT_METHOD_LABEL) as POPaymentMethod[]).map(m => (
                <button key={m} type="button" role="radio" aria-checked={method === m} onClick={() => setMethod(m)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${method === m ? 'bg-card text-blue-700 dark:text-blue-400 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t(PAYMENT_METHOD_LABEL[m])}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t('htsPayNote')} <span className="text-muted-foreground font-normal">({t('labelOptional')})</span></label>
          <input value={note} onChange={event => setNote(event.target.value)} maxLength={200} placeholder={t('htsPayNoteHint')} className={inputClass} />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} disabled={mutation.isPending} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted">{t('actionCancel')}</button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
            {mutation.isPending ? t('saving') : t('htsPay')}
          </button>
        </div>
      </Form>
    </Modal>
  )
}
