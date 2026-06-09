import { useState } from 'react'
import toast from 'react-hot-toast'
import { LogOut } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/utils'
import { closeShift } from '@/api/pos'

interface Props {
  open: boolean
  shiftId: string | null
  onClose: () => void
  onClosed: () => void
}

/** Tutup shift kasir aktif — mengikuti alur app (kas akhir + catatan opsional). */
export default function CloseShiftModal({ open, shiftId, onClose, onClosed }: Props) {
  const [closingCash, setClosingCash] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleClose = async () => {
    if (!shiftId) return
    setSubmitting(true)
    try {
      await closeShift(shiftId, { closing_cash: Number(closingCash) || 0, notes: notes || null })
      toast.success('Shift ditutup')
      setClosingCash('')
      setNotes('')
      onClosed()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Tutup Shift" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LogOut size={16} /> Hitung kas akhir di laci, lalu tutup shift.
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Kas Akhir</label>
          <Input
            type="number"
            inputMode="numeric"
            value={closingCash}
            onChange={(e) => setClosingCash(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Catatan (opsional)</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="mis. selisih kas" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button variant="destructive" className="flex-1" onClick={handleClose} disabled={submitting}>
            {submitting ? 'Menutup…' : 'Tutup Shift'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
