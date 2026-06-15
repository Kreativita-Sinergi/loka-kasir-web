import { useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { hasTour, hasSeenTour, startTour } from '@/lib/coachmark'

/**
 * Mengelola tutorial coachmark untuk halaman aktif.
 *  - Otomatis menjalankan tutorial sekali saat pertama kali halaman dibuka.
 *  - Mengembalikan `start()` untuk menjalankan ulang (dipakai tombol di Header)
 *    dan `available` untuk menampilkan/menyembunyikan tombolnya.
 */
export function useCoachmark() {
  const { pathname } = useLocation()
  const available = hasTour(pathname)

  // Auto-jalankan sekali pada kunjungan pertama. Beri jeda agar DOM (tabel,
  // tombol) selesai dirender sebelum driver.js mencari elemen target.
  useEffect(() => {
    if (!available || hasSeenTour(pathname)) return
    const t = window.setTimeout(() => startTour(pathname), 700)
    return () => window.clearTimeout(t)
  }, [pathname, available])

  const start = useCallback(() => startTour(pathname, false), [pathname])

  return { available, start }
}
