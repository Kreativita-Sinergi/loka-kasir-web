import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Form from '@/components/ui/Form'
import NumericInput from '@/components/ui/NumericInput'
import SearchableSelect from '@/components/ui/SearchableSelect'
import Switch from '@/components/ui/Switch'
import { createCashTransfer } from '@/api/cashAccounts'
import type { CashAccount } from '@/api/cashAccounts'
import { formatCurrency, getErrorMessage, todayISODate } from '@/lib/utils'
import { parseNumericInput } from '@/lib/materialUnits'
import { activeMoney } from '@/lib/money'
import { amountInWords } from '@/lib/terbilang'
import { newIdempotencyKey, occurredAtFor, transferPreview } from '@/lib/cashBook'
import { activeLocale, t } from '@/lib/i18n'
import { accountOptionLabel } from './cashLabels'

const inputClass = 'w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

/**
 * "Pindah dana" antar akun — meniru form transfer akuntansi yang biasa dipakai
 * pelanggan: tanggal, nomor (otomatis atau manual), dari/ke, nilai beserta
 * terbilangnya, keterangan, dan saldo kedua akun sebelum/sesudah.
 */
export default function CashTransferModal({ accounts, defaultFromId, onClose }: {
  /** Akun aktif — server menolak transfer dari/ke akun nonaktif. */
  accounts: CashAccount[]
  defaultFromId?: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [idempotencyKey] = useState(newIdempotencyKey)
  const [date, setDate] = useState(() => todayISODate())
  const [autoNumber, setAutoNumber] = useState(true)
  const [number, setNumber] = useState('')
  const [fromId, setFromId] = useState(defaultFromId ?? accounts[0]?.id ?? '')
  const [toId, setToId] = useState(() => accounts.find(account => account.id !== (defaultFromId ?? accounts[0]?.id))?.id ?? '')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const money = activeMoney()
  const value = parseNumericInput(amount)
  const amountValid = Number.isFinite(value) && value > 0
  const from = accounts.find(account => account.id === fromId)
  const to = accounts.find(account => account.id === toId)
  const sameAccount = !!fromId && fromId === toId
  const valid = amountValid && !!from && !!to && !sameAccount && (autoNumber || !!number.trim())
  const preview = transferPreview(from?.balance, to?.balance, amountValid ? value : 0)
  const options = accounts.map(account => ({ value: account.id, label: accountOptionLabel(account) }))

  const mutation = useMutation({
    mutationFn: () => createCashTransfer({
      from_account_id: fromId,
      to_account_id: toId,
      amount: value,
      description: description.trim() || null,
      occurred_at: occurredAtFor(date),
      number: autoNumber ? undefined : number.trim(),
    }, idempotencyKey),
    onSuccess: response => {
      toast.success(t('cashAccTransferDone', { number: response.data.data?.number ?? '' }))
      qc.invalidateQueries({ queryKey: ['cash-accounts'] })
      qc.invalidateQueries({ queryKey: ['cash-ledger'] })
      onClose()
    },
    onError: err => toast.error(getErrorMessage(err)),
  })

  const balanceRow = (account: CashAccount | undefined, after: number | null) => account && account.balance != null && (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{t('cashAccBalanceOf', { name: account.name })}</span>
      <span className="text-right">
        <span className="block font-semibold text-foreground tabular-nums">{formatCurrency(account.balance)}</span>
        {amountValid && after != null && (
          <span className={`block text-xs tabular-nums ${after < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
            {t('cashAccBalanceAfter')}: {formatCurrency(after)}
          </span>
        )}
      </span>
    </div>
  )

  return (
    <Modal open onClose={() => { if (!mutation.isPending) onClose() }} title={t('cashAccTransferTitle')} size="md">
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
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">{t('cashAccTransferNumber')}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {t('cashAccTransferAuto')}
                <Switch size="sm" checked={autoNumber} onChange={setAutoNumber} label={t('cashAccTransferAuto')} />
              </span>
            </div>
            {autoNumber
              ? <p className="px-3 py-2.5 rounded-xl bg-muted text-xs text-muted-foreground">{t('cashAccTransferAutoHint')}</p>
              : <input value={number} onChange={event => setNumber(event.target.value)} maxLength={40} required autoFocus
                  aria-label={t('cashAccTransferNumber')} placeholder={t('cashAccTransferNumberPlaceholder')} className={inputClass} />}
          </div>
        </div>
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('cashAccTransferFrom')}</label>
            <SearchableSelect value={fromId} options={options} clearable={false} onChange={next => {
              setFromId(next)
              // Asal yang sama dengan tujuan: geser tujuan ke akun lain.
              if (next === toId) setToId(accounts.find(account => account.id !== next)?.id ?? '')
            }}
              placeholder={t('cashAccSelectAccount')} label={t('cashAccTransferFrom')} className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('cashAccTransferTo')}</label>
            <SearchableSelect value={toId} onChange={setToId} options={options.filter(option => option.value !== fromId)} clearable={false}
              placeholder={t('cashAccSelectAccount')} label={t('cashAccTransferTo')} className="w-full" />
          </div>
        </div>
        {sameAccount && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{t('cashAccTransferSame')}</p>}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t('cashAccTransferAmount')} ({money.currency})</label>
          <NumericInput min={0} step="any" value={amount} required onChange={event => setAmount(event.target.value)}
            aria-invalid={submitted && !amountValid} className={inputClass} />
          {submitted && !amountValid
            ? <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{t('cashAccAmountRequired')}</p>
            : amountValid && <p className="mt-1 text-xs italic text-muted-foreground">{amountInWords(value, activeLocale(), money.currency, money.decimals)}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t('cashAccDescription')} <span className="text-muted-foreground font-normal">({t('labelOptional')})</span></label>
          <input value={description} onChange={event => setDescription(event.target.value)} maxLength={200} className={inputClass} />
        </div>
        {(from?.balance != null || to?.balance != null) && (
          <div className="rounded-xl bg-muted px-4 py-3 text-sm space-y-2">
            {balanceRow(from, preview.fromAfter)}
            {!sameAccount && balanceRow(to, preview.toAfter)}
          </div>
        )}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} disabled={mutation.isPending} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted">{t('actionCancel')}</button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
            {mutation.isPending ? t('saving') : t('cashAccTransfer')}
          </button>
        </div>
      </Form>
    </Modal>
  )
}
