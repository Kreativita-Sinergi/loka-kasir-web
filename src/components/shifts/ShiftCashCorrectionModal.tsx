import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { correctClosingCash } from '@/api/shifts'
import type { Shift } from '@/types'
import { t } from '@/lib/i18n'
import { formatCurrency, getErrorMessage } from '@/lib/utils'

export default function ShiftCashCorrectionModal({ shift, onClose, onSuccess }: {
  shift: Shift; onClose: () => void; onSuccess: () => void
}) {
  const qc = useQueryClient()
  const [cash, setCash] = useState('')
  const [reason, setReason] = useState('')
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
  return <Modal open onClose={() => { if (!mutation.isPending) onClose() }} title={t('shiftCorrectCash')} size="sm">
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault()
      if (valid && !mutation.isPending) mutation.mutate()
    }}>
      <p className="text-sm text-muted-foreground">{t('shiftCorrectCashHint')}</p>
      <div className="rounded-xl bg-muted p-3 text-sm space-y-1">
        <p>{shift.cashier?.name ?? '—'} · {shift.outlet?.name ?? '—'} · {shift.terminal?.name ?? '—'}</p>
        <p>{t('shiftPreviousCash')}: <strong>{formatCurrency(shift.closing_cash ?? 0)}</strong></p>
        <p>{t('shiftExpectedCash')}: {shift.expected_cash == null ? '—' : formatCurrency(shift.expected_cash)}</p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="correct-closing-cash" className="text-sm font-medium">{t('shiftNewClosingCash')}</label>
        <input id="correct-closing-cash" type="number" min="0" step="any" required autoFocus
          value={cash} onChange={(event) => setCash(event.target.value)} disabled={mutation.isPending}
          className="w-full px-3 py-2 bg-background border border-border rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="cash-correction-reason" className="text-sm font-medium">{t('shiftCorrectionReason')}</label>
        <textarea id="cash-correction-reason" required minLength={3} maxLength={200} rows={3}
          value={reason} onChange={(event) => setReason(event.target.value)} disabled={mutation.isPending}
          className="w-full px-3 py-2 bg-background border border-border rounded-xl" />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={mutation.isPending} className="px-4 py-2 border border-border rounded-xl">{t('actionCancel')}</button>
        <button type="submit" disabled={!valid || mutation.isPending} className="px-4 py-2 text-white bg-primary rounded-xl disabled:opacity-50">{t('actionSave')}</button>
      </div>
    </form>
  </Modal>
}
