import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { cancelTransaction } from '@/api/transactions'
import { getErrorMessage } from '@/lib/utils'

interface Props {
  transactionId: string
  onClose: () => void
  onSuccess: () => void
}

export default function TransactionCancelModal({ transactionId, onClose, onSuccess }: Props) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')

  const cancelMut = useMutation({
    mutationFn: () => cancelTransaction(transactionId, reason),
    onSuccess: () => {
      toast.success('Transaksi berhasil dibatalkan')
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['transaction', transactionId] })
      setReason('')
      onSuccess()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const handleClose = () => { setReason(''); onClose() }

  return (
    <Modal open onClose={handleClose} title="Konfirmasi Batalkan" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Masukkan alasan pembatalan untuk transaksi ini:</p>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Alasan pembatalan..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex gap-3">
          <button onClick={handleClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">Batal</button>
          <button
            onClick={() => cancelMut.mutate()}
            disabled={cancelMut.isPending || !reason}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-60"
          >
            {cancelMut.isPending ? 'Memproses...' : 'Batalkan'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
