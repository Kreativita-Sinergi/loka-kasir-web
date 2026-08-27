import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { deleteTransaction } from '@/api/transactions'
import { getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface Props {
  transactionId: string
  billNumber: string
  onClose: () => void
  onSuccess: () => void
}

/**
 * Konfirmasi hapus permanen.
 *
 * Tombolnya baru hidup setelah kata konfirmasi diketik utuh. Refund dan
 * pembatalan cukup dijaga satu klik karena keduanya masih bisa ditelusuri;
 * yang ini menghapus notanya dari basis data, jadi ia harus lebih sulit ditekan
 * daripada tombol di sebelahnya — terutama karena letaknya bersebelahan.
 */
export default function TransactionDeleteModal({ transactionId, billNumber, onClose, onSuccess }: Props) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')
  const [confirmation, setConfirmation] = useState('')

  const confirmWord = t('txDeleteConfirmWord')
  const confirmed = confirmation.trim().toUpperCase() === confirmWord.toUpperCase()

  const deleteMut = useMutation({
    mutationFn: () => deleteTransaction(transactionId, reason.trim()),
    onSuccess: () => {
      toast.success(t('txDeleted'))
      // Omzet, laba, dan produk terjual semuanya ikut berubah — semua yang
      // menampilkan angka transaksi harus dimuat ulang, bukan hanya daftarnya.
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['transaction', transactionId] })
      qc.invalidateQueries({ queryKey: ['profit-summary'] })
      qc.invalidateQueries({ queryKey: ['sold-products'] })
      qc.invalidateQueries({ queryKey: ['kasbon'] })
      qc.invalidateQueries({ queryKey: ['home'] })
      onSuccess()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <Modal open onClose={onClose} title={t('txDeleteTitle')} size="sm">
      <div className="space-y-4">
        <div className="flex gap-3 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-3">
          <AlertTriangle size={18} className="shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-300">
            {t('txDeleteWarning', { bill: billNumber })}
          </p>
        </div>

        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('txDeleteReasonPlaceholder')}
          className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />

        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground">{t('txDeleteConfirmHint', { word: confirmWord })}</p>
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={confirmWord}
            className="w-full px-3 py-2.5 border border-border rounded-xl text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted"
          >
            {t('actionCancel')}
          </button>
          <button
            onClick={() => deleteMut.mutate()}
            disabled={deleteMut.isPending || !confirmed}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-60"
          >
            {deleteMut.isPending ? t('processing') : t('txDeleteAction')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
