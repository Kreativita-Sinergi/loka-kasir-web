import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, LogOut } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import { closeShift, getActiveShiftForCashier } from '@/api/pos'
import type { Shift } from '@/types'

interface Props {
  open: boolean
  shiftId: string | null
  cashierId: string | null
  /** Transaksi offline yang belum tersinkron — shift tak boleh ditutup bila > 0. */
  pendingCount: number
  onClose: () => void
  onClosed: () => void
}

/** Kas yang diharapkan di laci — dihitung lokal selagi shift masih terbuka
 *  (selaras dengan perhitungan di app; `expected_cash` server bisa null saat open). */
function expectedCashOf(s: Shift): number {
  return (
    s.opening_cash +
    (s.total_sales ?? 0) -
    (s.total_refunds ?? 0) +
    (s.total_cash_in ?? 0) -
    (s.total_cash_out ?? 0)
  )
}

/** Tutup shift kasir aktif — mengikuti alur app (ringkasan shift, kas akhir,
 *  preview selisih, catatan opsional). */
export default function CloseShiftModal({ open, shiftId, cashierId, pendingCount, onClose, onClosed }: Props) {
  const [closingCash, setClosingCash] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [shift, setShift] = useState<Shift | null>(null)
  const [loadingShift, setLoadingShift] = useState(false)

  // Ambil detail shift aktif saat modal dibuka untuk menampilkan ringkasan.
  useEffect(() => {
    if (!open || !cashierId) return
    let cancelled = false
    setLoadingShift(true)
    setShift(null)
    getActiveShiftForCashier(cashierId)
      .then((res) => {
        if (!cancelled) setShift(res.data.data ?? null)
      })
      .catch(() => {
        if (!cancelled) setShift(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingShift(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, cashierId])

  const handleClose = async () => {
    if (!shiftId) return
    if (pendingCount > 0) {
      toast.error(
        `Gagal! Ada ${pendingCount} transaksi offline yang belum tersinkronisasi. Harap tunggu hingga jaringan kembali online.`,
      )
      return
    }
    setSubmitting(true)
    try {
      await closeShift(shiftId, { closing_cash: Number(closingCash) || 0, notes: notes || null })
      toast.success('Shift ditutup')
      setClosingCash('')
      setNotes('')
      setShift(null)
      onClosed()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  const expected = shift ? expectedCashOf(shift) : 0
  const closingNum = Number(closingCash) || 0
  const difference = closingNum - expected
  const showPreview = !!shift && closingNum > 0

  return (
    <Modal open={open} onClose={onClose} title="Tutup Shift" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LogOut size={16} /> Hitung kas akhir di laci, lalu tutup shift.
        </div>

        {pendingCount > 0 && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              Ada {pendingCount} transaksi offline yang belum tersinkronisasi. Harap tunggu hingga jaringan kembali
              online sebelum menutup shift.
            </span>
          </div>
        )}

        {/* ── Ringkasan shift ───────────────────────────────────────────── */}
        {loadingShift ? (
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            Memuat ringkasan shift…
          </div>
        ) : shift ? (
          <div className="space-y-1.5 rounded-xl border border-border bg-muted/30 p-3 text-sm">
            <div className="mb-1 font-semibold">Ringkasan Shift</div>
            <SummaryRow label="Kas Awal" value={formatCurrency(shift.opening_cash)} />
            <SummaryRow
              label="Total Penjualan"
              value={formatCurrency(shift.total_sales ?? 0)}
              valueClass="text-green-600 dark:text-green-400"
            />
            <SummaryRow
              label="Total Refund"
              value={`-${formatCurrency(shift.total_refunds ?? 0)}`}
              valueClass="text-red-500"
            />
            <SummaryRow
              label="Kas Masuk"
              value={formatCurrency(shift.total_cash_in ?? 0)}
              valueClass="text-green-600 dark:text-green-400"
            />
            <SummaryRow
              label="Kas Keluar"
              value={`-${formatCurrency(shift.total_cash_out ?? 0)}`}
              valueClass="text-red-500"
            />
            <div className="my-1 border-t border-border" />
            <SummaryRow
              label="Kas Diharapkan"
              value={formatCurrency(expected)}
              labelClass="font-semibold"
              valueClass="font-semibold text-primary"
            />
          </div>
        ) : null}

        {/* ── Input kas akhir ───────────────────────────────────────────── */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Kas Akhir (Fisik) <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            inputMode="numeric"
            value={closingCash}
            onChange={(e) => setClosingCash(e.target.value)}
            placeholder="0"
            autoFocus
          />
        </div>

        {/* ── Preview selisih kas ───────────────────────────────────────── */}
        {showPreview && (
          <div className="space-y-1.5">
            <div className="px-1 text-lg font-semibold text-primary">{formatCurrency(closingNum)}</div>
            <div
              className={
                'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ' +
                (difference === 0
                  ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                  : difference > 0
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                    : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400')
              }
            >
              {difference === 0 ? (
                <CheckCircle2 size={16} />
              ) : difference > 0 ? (
                <ArrowUpRight size={16} />
              ) : (
                <ArrowDownRight size={16} />
              )}
              {difference === 0
                ? 'Kas sesuai'
                : difference > 0
                  ? `Lebih: ${formatCurrency(difference)}`
                  : `Kurang: ${formatCurrency(-difference)}`}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium">Catatan (opsional)</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="mis. selisih kas" />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleClose}
            disabled={submitting || pendingCount > 0}
          >
            {submitting ? 'Menutup…' : 'Tutup Shift'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function SummaryRow({
  label,
  value,
  labelClass = '',
  valueClass = '',
}: {
  label: string
  value: string
  labelClass?: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={'text-muted-foreground ' + labelClass}>{label}</span>
      <span className={'font-medium ' + valueClass}>{value}</span>
    </div>
  )
}
