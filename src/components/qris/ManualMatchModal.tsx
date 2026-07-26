import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle, Clock, Receipt } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { getPendingQrisBills, matchQrisNotification } from '@/api/qrisStatic'
import { useOutletStore } from '@/store/outletStore'
import type { QrisStaticNotification, PendingQrisBill } from '@/types'
import { formatCurrency, formatDateTime, getErrorMessage } from '@/lib/utils'

// Konfirmasi manual pembayaran QRIS statis.
//
// Dipakai saat uang SUDAH masuk — pemilik melihatnya di HP — tapi pencocokan
// otomatis tidak terjadi: izin notifikasi belum aktif, notifikasi terlanjur
// dihapus, HP penerima berbeda dari HP kasir, nominalnya kembar, atau tagihannya
// sudah kedaluwarsa. Operator memilih sendiri transaksi mana yang dilunasi.

interface Props {
  notification: QrisStaticNotification
  open: boolean
  onClose: () => void
}

export default function ManualMatchModal({ notification, open, onClose }: Props) {
  const qc = useQueryClient()
  const { selected: selectedOutlet } = useOutletStore()
  const [selectedBill, setSelectedBill] = useState<PendingQrisBill | null>(null)
  const [note, setNote] = useState('')
  const [forceMismatch, setForceMismatch] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['qris-pending-bills', selectedOutlet?.id],
    queryFn: () => getPendingQrisBills(selectedOutlet?.id),
    enabled: open,
  })
  const bills = data?.data?.data ?? []

  const amountMismatch =
    selectedBill !== null &&
    notification.amount > 0 &&
    notification.amount !== selectedBill.amount

  const mut = useMutation({
    mutationFn: () =>
      matchQrisNotification(notification.id, {
        transaction_id: selectedBill!.transaction_id!,
        force: forceMismatch,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Transaksi ditandai lunas')
      qc.invalidateQueries({ queryKey: ['qris-notifications'] })
      qc.invalidateQueries({ queryKey: ['qris-pending-bills'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      reset()
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const reset = () => {
    setSelectedBill(null)
    setNote('')
    setForceMismatch(false)
  }

  const canSubmit =
    selectedBill?.transaction_id != null && (!amountMismatch || forceMismatch) && !mut.isPending

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Konfirmasi Pembayaran Manual">
      <div className="space-y-4">
        {/* Bukti yang jadi dasar konfirmasi */}
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Notifikasi yang dipakai
          </p>
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="text-sm font-medium text-foreground">
              {notification.source_label || notification.source_package}
            </span>
            <span className="text-base font-bold text-foreground">
              {notification.amount > 0 ? formatCurrency(notification.amount) : 'Nominal tak terbaca'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{formatDateTime(notification.notified_at)}</p>
          <p className="mt-2 text-xs text-foreground border-l-2 border-border pl-2">{notification.body}</p>
        </div>

        {/* Pilih tagihan yang dilunasi */}
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Tagihan yang dibayar</p>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Memuat tagihan…</p>
          ) : bills.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Tidak ada tagihan QRIS yang menunggu pembayaran di outlet ini.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {bills.map((bill) => {
                const active = selectedBill?.payment_order_id === bill.payment_order_id
                const sameAmount = notification.amount === bill.amount
                return (
                  <button
                    key={bill.payment_order_id}
                    type="button"
                    disabled={!bill.transaction_id}
                    onClick={() => { setSelectedBill(bill); setForceMismatch(false) }}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 transition disabled:opacity-40 ${
                      active ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40' : 'border-border hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <Receipt size={13} className="text-muted-foreground" />
                        {bill.bill_number || 'Tanpa nomor nota'}
                      </span>
                      <span className="text-sm font-semibold text-foreground">{formatCurrency(bill.amount)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock size={11} />
                      {formatDateTime(bill.created_at)}
                      {bill.expired && <Badge variant="gray">Kedaluwarsa</Badge>}
                      {sameAmount && <Badge variant="green">Nominal cocok</Badge>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Nominal berbeda hampir selalu berarti salah pilih transaksi. */}
        {amountMismatch && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3">
            <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                Nominal berbeda: notifikasi {formatCurrency(notification.amount)}, tagihan{' '}
                {formatCurrency(selectedBill!.amount)}. Pastikan ini memang pembayaran yang sama —
                selisihnya akan dicatat pada bukti.
              </span>
            </p>
            <label className="mt-2 flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-200">
              <input
                type="checkbox"
                checked={forceMismatch}
                onChange={(e) => setForceMismatch(e.target.checked)}
                className="rounded border-amber-400"
              />
              Ya, saya yakin ini pembayaran untuk tagihan tersebut
            </label>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Catatan (opsional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="mis. sudah dicek di mutasi BCA jam 14:05"
            className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Nama Anda dan catatan ini tersimpan pada bukti pembayaran.
          </p>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => { reset(); onClose() }}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => mut.mutate()}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-40"
          >
            {mut.isPending ? 'Memproses…' : 'Tandai Lunas'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
