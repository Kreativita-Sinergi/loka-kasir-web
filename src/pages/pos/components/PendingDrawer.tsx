import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { RefreshCw, RotateCcw, Download, CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency, cn } from '@/lib/utils'
import {
  listPendingTransactions,
  retryPendingTransaction,
  discardPendingTransaction,
} from '@/lib/posDb'
import type { PendingTransaction, PendingStatus } from '@/pages/pos/types'

interface Props {
  open: boolean
  onClose: () => void
  /** Jalankan sync (flush) lalu refresh daftar. */
  onSync: () => Promise<void> | void
  online: boolean
}

const STATUS_META: Record<PendingStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Antre', cls: 'text-amber-600 bg-amber-500/10', icon: <Clock size={13} /> },
  SYNCING: { label: 'Mengirim', cls: 'text-blue-600 bg-blue-500/10', icon: <Loader2 size={13} className="animate-spin" /> },
  SYNCED: { label: 'Terkirim', cls: 'text-success bg-success/10', icon: <CheckCircle2 size={13} /> },
  CONFLICT: { label: 'Gagal', cls: 'text-destructive bg-destructive/10', icon: <AlertTriangle size={13} /> },
}

export default function PendingDrawer({ open, onClose, onSync, online }: Props) {
  const [rows, setRows] = useState<PendingTransaction[]>([])
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setRows(await listPendingTransactions())
  }, [])

  useEffect(() => {
    // Async load saat drawer dibuka — setState terjadi di microtask, bukan sinkron.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) void refresh()
  }, [open, refresh])

  const handleSync = async () => {
    setBusy(true)
    try {
      await onSync()
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const handleRetry = async (id: string) => {
    await retryPendingTransaction(id)
    await refresh()
    void handleSync()
  }

  const handleDiscard = async (id: string) => {
    await discardPendingTransaction(id)
    await refresh()
    toast.success('Transaksi dibuang dari antrian')
  }

  // Export cadangan: unduh antrian sebagai JSON agar tidak hilang bila browser direset.
  const handleExport = async () => {
    const data = await listPendingTransactions()
    if (data.length === 0) {
      toast.error('Tidak ada transaksi untuk diekspor')
      return
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `loka-pending-${new Date().toISOString().slice(0, 19)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const unsynced = rows.filter((r) => r.status !== 'SYNCED')

  return (
    <Modal open={open} onClose={onClose} title="Transaksi Tertunda" size="md">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={busy || !online} onClick={handleSync}>
            <RefreshCw size={14} className={cn(busy && 'animate-spin')} /> Sync Sekarang
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={14} /> Export Cadangan
          </Button>
        </div>

        {unsynced.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={26} />}
            title="Semua transaksi tersinkron"
            description="Tidak ada transaksi yang menunggu dikirim ke server."
          />
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {unsynced.map((r) => {
              const meta = STATUS_META[r.status]
              const amount = r.payment?.amount_received ?? 0
              const itemCount = r.create.items.reduce((s, i) => s + i.quantity, 0)
              return (
                <li key={r.id} className="rounded-xl border border-border px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{formatCurrency(amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {itemCount} item ·{' '}
                        {new Date(r.createdAtMs).toLocaleString('id-ID', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      {r.status === 'CONFLICT' && r.conflictReason && (
                        <p className="mt-1 text-xs text-destructive">{r.conflictReason}</p>
                      )}
                    </div>
                    <span className={cn('flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', meta.cls)}>
                      {meta.icon} {meta.label}
                    </span>
                  </div>
                  {r.status === 'CONFLICT' && (
                    <div className="mt-2 flex gap-2">
                      <Button variant="outline" size="sm" disabled={!online} onClick={() => handleRetry(r.id)}>
                        <RotateCcw size={13} /> Coba Lagi
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDiscard(r.id)} className="text-destructive">
                        Buang
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          Transaksi offline disimpan di perangkat ini & dikirim otomatis saat online. Bila browser
          akan direset, gunakan <span className="font-medium">Export Cadangan</span> dulu.
        </p>
      </div>
    </Modal>
  )
}
