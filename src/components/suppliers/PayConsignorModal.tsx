import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { HandCoins } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Form from '@/components/ui/Form'
import NumericInput from '@/components/ui/NumericInput'
import { Button } from '@/components/ui/button'
import { payConsignor, type ConsignorBalance } from '@/api/consignment'
import { parseNumericInput } from '@/lib/materialUnits'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { inputCls } from './consignmentUtils'
import { invalidateConsignmentMoney } from './consignmentQueries'

/**
 * Menyerahkan uang hasil penjualan ke penitip, sebesar nominal pilihan.
 *
 * Bawaannya seluruh kewajiban; pemilik boleh menurunkannya bila kasnya belum
 * cukup — sisanya tetap tercatat sebagai kewajiban dan muncul lagi di daftar
 * "belum dibayar". Server menolak nominal di atas kewajiban.
 */
export default function PayConsignorModal({ balance, onClose, onPaid }: {
  balance: ConsignorBalance
  onClose: () => void
  /** Dipanggil dengan id catatan penyerahan — sumber struknya. */
  onPaid: (settlementId: string) => void
}) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState(String(Math.round(balance.outstanding)))
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const value = parseNumericInput(amount)
  const valid = Number.isFinite(value) ? value : 0
  const remaining = balance.outstanding - valid

  const mut = useMutation({
    mutationFn: () => payConsignor({ supplier_id: balance.supplier_id, amount: valid, ...(note.trim() ? { note: note.trim() } : {}) }),
    onSuccess: (res) => {
      toast.success(res.data.message || t('csPaySuccess'))
      invalidateConsignmentMoney(qc)
      onPaid(res.data.data.id)
      onClose()
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const submit = () => {
    if (valid <= 0) { setError(t('csPayErrEmpty')); return }
    if (valid > balance.outstanding + 0.5) { setError(t('csPayErrOver', { amount: formatCurrency(Math.round(balance.outstanding)) })); return }
    setError(null)
    mut.mutate()
  }
  const set = (v: number) => { setAmount(String(Math.round(v))); setError(null) }

  return (
    <Modal open onClose={onClose} title={t('csPayTitle', { name: balance.supplier_name })} size="sm">
      <Form onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('csPaySubtitle', {
            outstanding: formatCurrency(Math.round(balance.outstanding)),
            owed: formatCurrency(Math.round(balance.owed)),
            paid: formatCurrency(Math.round(balance.paid)),
          })}
        </p>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t('csPayAmountLabel')}</label>
          <NumericInput min={0} step="any" value={amount} disabled={mut.isPending}
            onChange={(e) => { setAmount(e.target.value); setError(null) }} className={inputCls} />
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => set(balance.outstanding)} disabled={mut.isPending}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted">{t('csPayAll')}</button>
            <button type="button" onClick={() => set(balance.outstanding / 2)} disabled={mut.isPending}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted">{t('csPayHalf')}</button>
          </div>
          <p className={`mt-2 text-xs font-semibold ${remaining > 0.5 ? 'text-warning' : 'text-success'}`}>
            {remaining > 0.5 ? t('csPayRemaining', { amount: formatCurrency(Math.round(remaining)) }) : t('csPaySettled')}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t('labelNoteOptional')}</label>
          <input type="text" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} disabled={mut.isPending}
            placeholder={t('csPayNoteHint')} className={inputCls} />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={mut.isPending}>{t('actionCancel')}</Button>
          <Button type="submit" disabled={mut.isPending || valid <= 0}>
            <HandCoins /> {mut.isPending ? t('saving') : t('csPaySubmit', { amount: formatCurrency(Math.round(valid)) })}
          </Button>
        </div>
      </Form>
    </Modal>
  )
}
