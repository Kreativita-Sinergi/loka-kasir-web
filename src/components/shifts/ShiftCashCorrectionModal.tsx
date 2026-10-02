import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import NumericInput from '@/components/ui/NumericInput'
import { correctClosingCash } from '@/api/shifts'
import type { Shift } from '@/types'
import { t } from '@/lib/i18n'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import { activeMoney, symbolFor } from '@/lib/money'

export default function ShiftCashCorrectionModal({ shift, onClose, onSuccess }: {
  shift: Shift; onClose: () => void; onSuccess: () => void
}) {
  const qc = useQueryClient()
  const [cash, setCash] = useState('')
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const money = activeMoney()
  const mutation = useMutation({
    mutationFn: () => correctClosingCash(shift.id, {
      closing_cash: Number(cash), previous_closing_cash: shift.closing_cash!, reason: reason.trim(),
    }),
    onSuccess: () => {
      for (const key of ['shifts', 'shift-detail', 'shifts-financial', 'cash-discrepancy']) {
        qc.invalidateQueries({ queryKey: [key] })
      }
      toast.success(t('shiftCorrectCashSuccess'))
      onSuccess()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
  const valid = cash.trim() !== '' && Number.isFinite(Number(cash)) && Number(cash) >= 0 &&
    Number(cash) !== shift.closing_cash && reason.trim().length >= 3
  const cashError = !cash.trim() ? t('shiftCashRequired') : !Number.isFinite(Number(cash)) || Number(cash) < 0 ? t('inputInvalidNumbers') : Number(cash) === shift.closing_cash ? t('shiftCashUnchanged') : ''
  const reasonError = reason.trim().length < 3 ? t('shiftCorrectionReasonRequired') : ''
  const inputClass = 'w-full pl-14 pr-3 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-lg font-semibold tabular-nums'
  return <Modal open onClose={() => { if (!mutation.isPending) onClose() }} title={t('shiftCorrectCash')} size="md">
    <form noValidate className="space-y-5" onSubmit={(event) => {
      event.preventDefault()
      setSubmitted(true)
      if (valid && !mutation.isPending) mutation.mutate()
    }}>
      <p className="text-sm text-muted-foreground">{t('shiftCorrectCashHint')}</p>
      <div className="rounded-xl bg-muted p-4 text-sm space-y-3">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">{t('labelCashier')}</dt><dd className="font-medium">{shift.cashier?.name ?? '—'}</dd>
          <dt className="text-muted-foreground">{t('labelOutlet')}</dt><dd>{shift.outlet?.name ?? '—'}</dd>
          <dt className="text-muted-foreground">{t('labelDevice')}</dt><dd>{shift.terminal?.name ?? '—'}</dd>
        </dl>
        <dl className="border-t border-border pt-3 space-y-2">
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('shiftPreviousCash')}</dt><dd className="font-semibold whitespace-nowrap">{formatCurrency(shift.closing_cash ?? 0)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('shiftExpectedCash')}</dt><dd className="font-semibold whitespace-nowrap">{shift.expected_cash == null ? '—' : formatCurrency(shift.expected_cash)}</dd></div>
        </dl>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="correct-closing-cash" className="text-sm font-medium">{t('shiftNewClosingCash')}</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">{symbolFor(money.currency)}</span>
          {money.decimals === 0 ? <input id="correct-closing-cash" type="text" inputMode="numeric" autoFocus
            value={cash === '' ? '' : new Intl.NumberFormat(money.intlLocale).format(Number(cash))}
            onChange={(event) => { const digits = event.target.value.replace(/[.,\s]/g, ''); if (/^\d*$/.test(digits)) setCash(digits) }}
            placeholder={new Intl.NumberFormat(money.intlLocale).format(688000)} disabled={mutation.isPending}
            aria-invalid={submitted && !!cashError} aria-describedby="correction-cash-feedback" className={inputClass} /> :
            <NumericInput id="correct-closing-cash" min={0} step="any" autoFocus value={cash}
              onChange={(event) => setCash(event.target.value)} disabled={mutation.isPending}
              aria-invalid={submitted && !!cashError} aria-describedby="correction-cash-feedback" className={inputClass} />}
        </div>
        <p id="correction-cash-feedback" className={`text-xs ${submitted && cashError ? 'text-red-600' : 'text-muted-foreground'}`}>
          {submitted && cashError ? cashError : t('shiftCashZeroHint')}
        </p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="cash-correction-reason" className="text-sm font-medium">{t('shiftCorrectionReason')}</label>
        <textarea id="cash-correction-reason" maxLength={200} rows={2} placeholder={t('shiftCorrectionReasonHint')}
          value={reason} onChange={(event) => setReason(event.target.value)} disabled={mutation.isPending}
          aria-invalid={submitted && !!reasonError} aria-describedby="correction-reason-feedback"
          className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
        {submitted && reasonError && <p id="correction-reason-feedback" role="alert" className="text-xs text-red-600">{reasonError}</p>}
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={mutation.isPending} className="px-4 py-2 border border-border rounded-xl">{t('actionCancel')}</button>
        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 font-semibold text-white bg-primary rounded-xl disabled:opacity-50">{mutation.isPending ? t('loading') : t('shiftSaveCorrection')}</button>
      </div>
    </form>
  </Modal>
}
