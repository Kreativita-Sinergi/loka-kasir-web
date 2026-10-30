import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Form from '@/components/ui/Form'
import NumericInput from '@/components/ui/NumericInput'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { createCashEntry } from '@/api/cashAccounts'
import type { CashAccount, CashFlowType, ManualEntryCategory } from '@/api/cashAccounts'
import { getErrorMessage, todayISODate } from '@/lib/utils'
import { parseNumericInput } from '@/lib/materialUnits'
import { activeMoney } from '@/lib/money'
import { amountInWords } from '@/lib/terbilang'
import { newIdempotencyKey, occurredAtFor } from '@/lib/cashBook'
import { activeLocale, t } from '@/lib/i18n'
import { categoryLabel } from './cashLabels'

const inputClass = 'w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const CATEGORIES: ManualEntryCategory[] = ['income', 'expense', 'capital', 'withdrawal', 'other']

/** "Catat masuk" / "Catat keluar" untuk satu akun. Dipasang hanya saat dibuka. */
export default function CashEntryModal({ account, type, onClose }: {
  account: CashAccount
  type: CashFlowType
  onClose: () => void
}) {
  const qc = useQueryClient()
  // Satu kunci per formulir yang terbuka: kirim ulang tidak mencatat dua kali.
  const [idempotencyKey] = useState(newIdempotencyKey)
  const [date, setDate] = useState(() => todayISODate())
  const [category, setCategory] = useState<ManualEntryCategory>(type === 'IN' ? 'income' : 'expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const money = activeMoney()
  const value = parseNumericInput(amount)
  const valid = Number.isFinite(value) && value > 0

  const mutation = useMutation({
    mutationFn: () => createCashEntry(account.id, {
      type,
      amount: value,
      category,
      description: description.trim() || null,
      occurred_at: occurredAtFor(date),
    }, idempotencyKey),
    onSuccess: () => {
      toast.success(t('cashAccEntrySaved'))
      qc.invalidateQueries({ queryKey: ['cash-accounts'] })
      qc.invalidateQueries({ queryKey: ['cash-ledger'] })
      onClose()
    },
    onError: err => toast.error(getErrorMessage(err)),
  })

  return (
    <Modal open onClose={() => { if (!mutation.isPending) onClose() }} size="sm"
      title={t(type === 'IN' ? 'cashAccRecordInTitle' : 'cashAccRecordOutTitle', { name: account.name })}>
      <Form onSubmit={event => {
        event.preventDefault()
        setSubmitted(true)
        if (valid && !mutation.isPending) mutation.mutate()
      }} className="space-y-4">
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('labelDate')}</label>
            <input type="date" value={date} max={todayISODate()} required onChange={event => setDate(event.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('labelCategory')}</label>
            <SearchableSelect value={category} onChange={next => setCategory(next as ManualEntryCategory)} clearable={false} label={t('labelCategory')} className="w-full"
              options={CATEGORIES.map(value => ({ value, label: categoryLabel(value) }))} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t('labelAmount')} ({money.currency})</label>
          <NumericInput min={0} step="any" value={amount} required autoFocus onChange={event => setAmount(event.target.value)}
            aria-invalid={submitted && !valid} className={inputClass} />
          {submitted && !valid
            ? <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{t('cashAccAmountRequired')}</p>
            : valid && <p className="mt-1 text-xs italic text-muted-foreground">{amountInWords(value, activeLocale(), money.currency, money.decimals)}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t('cashAccDescription')} <span className="text-muted-foreground font-normal">({t('labelOptional')})</span></label>
          <input value={description} onChange={event => setDescription(event.target.value)} maxLength={200} placeholder={t('cashAccDescriptionHint')} className={inputClass} />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} disabled={mutation.isPending} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted">{t('actionCancel')}</button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
            {mutation.isPending ? t('saving') : t('actionSave')}
          </button>
        </div>
      </Form>
    </Modal>
  )
}
