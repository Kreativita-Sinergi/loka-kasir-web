import { useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getPendingSelfOrders } from '@/api/transactions'

/**
 * useSelfOrders mem-polling pesanan QR Scan-to-Order yang menunggu konfirmasi
 * kasir untuk outlet aktif. Saat ada pesanan BARU (id belum pernah terlihat),
 * memunculkan toast + bunyi singkat agar kasir langsung sadar.
 *
 * Polling hanya jalan saat `enabled` (mis. shift aktif & outlet terpilih).
 */
export function useSelfOrders(enabled: boolean) {
  const { data, refetch, isFetching } = useQuery({
    queryKey: ['self-orders-pending'],
    queryFn: () => getPendingSelfOrders(),
    enabled,
    refetchInterval: enabled ? 20_000 : false,
    refetchOnWindowFocus: true,
    staleTime: 0,
  })

  const orders = useMemo(() => data?.data?.data ?? [], [data])
  const seen = useRef<Set<string>>(new Set())
  const primed = useRef(false)

  useEffect(() => {
    if (!enabled) return
    const ids = orders.map((o) => o.transaction_id)

    // Muat pertama: isi set "sudah terlihat" tanpa membunyikan alarm untuk
    // pesanan yang sudah ada sebelum kasir membuka halaman.
    if (!primed.current) {
      seen.current = new Set(ids)
      primed.current = true
      return
    }

    const fresh = ids.filter((id) => !seen.current.has(id))
    if (fresh.length > 0) {
      toast(`${fresh.length} pesanan QR baru masuk`, { icon: '🔔', duration: 6000 })
      playChime()
    }
    seen.current = new Set(ids)
  }, [orders, enabled])

  return { orders, count: orders.length, refetch, isFetching }
}

/** Bunyi notifikasi singkat via WebAudio (tanpa file aset). */
function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1175, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
    osc.start()
    osc.stop(ctx.currentTime + 0.36)
    osc.onended = () => ctx.close()
  } catch {
    /* audio diblokir browser — abaikan */
  }
}
