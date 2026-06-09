/* eslint-disable @typescript-eslint/no-explicit-any */
// Jaga layar tetap menyala selama kasir terbuka (Screen Wake Lock API).
// Best-effort (Chromium/Android + HTTPS). Re-acquire saat tab kembali aktif
// karena lock otomatis lepas ketika tab disembunyikan.

import { useEffect } from 'react'

export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    let sentinel: any = null

    const request = async () => {
      try {
        const wl = (navigator as any).wakeLock
        if (wl?.request) sentinel = await wl.request('screen')
      } catch {
        /* ditolak/ tidak didukung — abaikan */
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      sentinel?.release?.().catch(() => {})
    }
  }, [active])
}
