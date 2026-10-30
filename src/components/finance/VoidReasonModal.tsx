import { useState, type ReactNode } from 'react'
import Modal from '@/components/ui/Modal'
import Form from '@/components/ui/Form'
import { t } from '@/lib/i18n'
import { isValidVoidReason, VOID_REASON_MAX } from '@/lib/cashBook'

interface VoidReasonModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  pending?: boolean
  /** Ringkasan catatan yang akan dibatalkan. */
  summary?: ReactNode
  /** Penjelasan akibatnya (saldo/total dihitung ulang, sisi lawan ikut batal). */
  hint: string
}

/**
 * Alasan wajib untuk "Batalkan" catatan kas — dipakai buku mutasi akun dan
 * kas masuk/keluar shift. Catatan tidak pernah dihapus; alasannya yang
 * menjelaskan baris yang dicoret di kemudian hari.
 */
export default function VoidReasonModal({ open, onClose, onConfirm, pending, summary, hint }: VoidReasonModalProps) {
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const invalid = !isValidVoidReason(reason)
  const close = () => {
    if (pending) return
    setReason('')
    setSubmitted(false)
    onClose()
  }
  return (
    <Modal open={open} onClose={close} title={t('cashAccVoidTitle')} size="sm">
      <Form noValidate onSubmit={event => {
        event.preventDefault()
        setSubmitted(true)
        if (!invalid && !pending) onConfirm(reason.trim())
      }} className="space-y-4">
        {summary && <div className="rounded-xl bg-muted p-3 text-sm">{summary}</div>}
        <p className="text-sm text-muted-foreground">{hint}</p>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t('cashAccVoidReason')}</label>
          <textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={VOID_REASON_MAX} rows={2}
            placeholder={t('cashAccVoidReasonHint')} disabled={pending} aria-invalid={submitted && invalid}
            className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {submitted && invalid && <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{t('cashAccVoidReasonInvalid')}</p>}
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={close} disabled={pending} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted">{t('actionCancel')}</button>
          <button type="submit" disabled={pending} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
            {pending ? t('loading') : t('cashAccVoidConfirm')}
          </button>
        </div>
      </Form>
    </Modal>
  )
}
