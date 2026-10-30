import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ActionButton } from '@/components/ui/RowActions'
import TransactionDetailModal from '@/components/transactions/TransactionDetailModal'
import TransactionRefundModal from '@/components/transactions/TransactionRefundModal'
import TransactionCancelModal from '@/components/transactions/TransactionCancelModal'
import TransactionDeleteModal from '@/components/transactions/TransactionDeleteModal'
import { PERMS, usePermissions } from '@/hooks/usePermissions'
import { journalDrillDown } from '@/lib/accounting'
import { t } from '@/lib/i18n'
import JournalDetailModal from './JournalDetailModal'
import PurchaseOrderPeekModal from './PurchaseOrderPeekModal'
import { ACCOUNTING_QUERY_KEY } from './accountingUi'

type TxAction = { kind: 'refund' | 'cancel' | 'delete'; id: string }

/**
 * Tombol "Lihat sumber" untuk satu entri jurnal / baris buku besar: membuka
 * modal yang sudah ada (detail nota, ringkasan PO, Jurnal Umum) atau pindah
 * ke halaman sumbernya (Kas & Rekening, shift, stok). Tidak dirender bila
 * sumbernya tidak punya tujuan atau pengguna tidak berhak membukanya.
 */
export default function SourceDrillDown({ refType, refId, refNo, journalId }: {
  refType: string
  refId: string | null
  refNo?: string | null
  journalId?: string | null
}) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { can } = usePermissions()
  const [open, setOpen] = useState(false)
  const [txAction, setTxAction] = useState<TxAction | null>(null)
  const target = journalDrillDown({ ref_type: refType, ref_id: refId, journal_id: journalId })
  if (!target) return null
  if (target.kind === 'page' && !can(target.permission)) return null
  if (target.kind === 'purchase_order' && !can(PERMS.INVENTORY_VIEW)) return null

  const label = target.kind === 'journal' ? t('accViewJournal') : t('accViewSource')
  const refreshed = () => {
    setTxAction(null)
    setOpen(false)
    qc.invalidateQueries({ queryKey: [ACCOUNTING_QUERY_KEY] })
  }

  return (
    <>
      <ActionButton onClick={() => target.kind === 'page' ? navigate(target.path) : setOpen(true)}>{label}</ActionButton>
      {open && target.kind === 'transaction' && !txAction && (
        <TransactionDetailModal transactionId={target.id} onClose={() => setOpen(false)}
          onRefund={id => setTxAction({ kind: 'refund', id })}
          onCancel={id => setTxAction({ kind: 'cancel', id })}
          onDelete={id => setTxAction({ kind: 'delete', id })} />
      )}
      {txAction?.kind === 'refund' && <TransactionRefundModal transactionId={txAction.id} onClose={() => setTxAction(null)} onSuccess={refreshed} />}
      {txAction?.kind === 'cancel' && <TransactionCancelModal transactionId={txAction.id} onClose={() => setTxAction(null)} onSuccess={refreshed} />}
      {txAction?.kind === 'delete' && <TransactionDeleteModal transactionId={txAction.id} billNumber={refNo ?? ''} onClose={() => setTxAction(null)} onSuccess={refreshed} />}
      {open && target.kind === 'purchase_order' && <PurchaseOrderPeekModal poId={target.id} onClose={() => setOpen(false)} />}
      {open && target.kind === 'journal' && <JournalDetailModal journalId={target.id} onClose={() => setOpen(false)} />}
    </>
  )
}
