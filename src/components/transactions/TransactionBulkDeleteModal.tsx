import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { bulkDeleteTransactions } from '@/api/transactions'
import { getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'
import type { Transaction } from '@/types'

interface Props {
  transactions: Transaction[]
  onClose: () => void
  onSuccess: () => void
}

/**
 * Hapus permanen beberapa nota sekaligus.
 *
 * Sengaja meminjam seluruh tata cara [TransactionDeleteModal] — alasan, kata
 * konfirmasi yang harus diketik utuh — karena bahayanya sama, hanya dikalikan
 * sebanyak baris yang dicentang.
 *
 * Seluruh nota dikirim dalam satu permintaan ke `DELETE /transaction/bulk`, yang
 * mengerjakannya utuh-atau-batal. Memanggil endpoint satuan berkali-kali akan
 * menyisakan rekap yang separuh berubah bila salah satu ditolak di tengah — dan
 * tidak ada cara memberi tahu pemilik separuh yang mana.
 */
export default function TransactionBulkDeleteModal({ transactions, onClose, onSuccess }: Props) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')
  const [confirmation, setConfirmation] = useState('')

  const confirmWord = t('txDeleteConfirmWord')
  const confirmed = confirmation.trim().toUpperCase() === confirmWord.toUpperCase()

  const deleteMut = useMutation({
    mutationFn: () => bulkDeleteTransactions(transactions.map((tx) => tx.transaction_id), reason.trim()),
    onSuccess: (res) => {
      toast.success(t('txBulkDeleted', { count: res.data?.data?.deleted ?? transactions.length }))
      // Omzet, laba, dan produk terjual semuanya ikut berubah — semua yang
      // menampilkan angka transaksi harus dimuat ulang, bukan hanya daftarnya.
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['transaction'] })
      qc.invalidateQueries({ queryKey: ['profit-summary'] })
      qc.invalidateQueries({ queryKey: ['sold-products'] })
      qc.invalidateQueries({ queryKey: ['kasbon'] })
      qc.invalidateQueries({ queryKey: ['home'] })
      onSuccess()
    },
    onError: (err) => toast.error(`${t('txBulkDeleteFailed', { count: transactions.length })} — ${getErrorMessage(err)}`),
  })

  return (
    <Modal open onClose={onClose} title={t('txBulkDeleteTitle', { count: transactions.length })} size="sm">
      <div className="space-y-4">
        <div className="flex gap-3 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-3">
          <AlertTriangle size={18} className="shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-300">
            {t('txBulkDeleteWarning', { count: transactions.length })}
          </p>
        </div>

        <div className="max-h-32 overflow-y-auto rounded-xl border border-border bg-muted/40 p-2">
          <div className="flex flex-wrap gap-1.5">
            {transactions.map((tx) => (
              <span key={tx.transaction_id} className="rounded-lg bg-card px-2 py-1 font-mono text-xs text-muted-foreground">
                #{tx.bill_number}
              </span>
            ))}
          </div>
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
            disabled={deleteMut.isPending}
            className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted disabled:opacity-60"
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
