// Tracks online/offline state and the offline transaction queue, and auto-syncs
// when connectivity returns. Browser equivalent of the app's
// `pending_sync_indicator_widget` + `sync_status_action`.

import { useCallback, useEffect, useRef, useState } from 'react'
import { posDb } from '@/lib/posDb'
import { flushPending, pullProducts } from '@/lib/posSync'

export function usePendingSync(outletId: string | null) {
  const [online, setOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [conflictCount, setConflictCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const busy = useRef(false)

  const refreshCounts = useCallback(async () => {
    const [pending, conflict] = await Promise.all([
      posDb.pendingTransactions.where('status').anyOf('PENDING', 'SYNCING').count(),
      posDb.pendingTransactions.where('status').equals('CONFLICT').count(),
    ])
    setPendingCount(pending)
    setConflictCount(conflict)
  }, [])

  const sync = useCallback(async () => {
    if (busy.current || !navigator.onLine) return
    busy.current = true
    setSyncing(true)
    try {
      if (outletId) await pullProducts(outletId).catch(() => 0)
      await flushPending()
      await refreshCounts()
    } finally {
      busy.current = false
      setSyncing(false)
    }
  }, [outletId, refreshCounts])

  useEffect(() => {
    // Async initial load: state is set in a microtask, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCounts()
    const onOnline = () => {
      setOnline(true)
      void sync()
    }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    // Periodic flush while the POS is open (every 30s), like the app.
    const timer = window.setInterval(() => void sync(), 30_000)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.clearInterval(timer)
    }
  }, [sync, refreshCounts])

  return { online, pendingCount, conflictCount, syncing, sync, refreshCounts }
}
