import type React from 'react'

interface Props {
  children: React.ReactNode
  require?: 'pro'
  /** Nama fitur (dipertahankan untuk dokumentasi rute). */
  feature?: string
}

/**
 * Penanda rute berpaket Pro.
 *
 * Tidak ada lagi paket Gratis: setiap usaha memegang fitur Pro selama trial
 * atau langganan, dan saat langganan berakhir usaha terkunci dalam mode lihat
 * saja — halaman Pro yang dipakai selama trial tetap boleh DIBUKA. Karena itu
 * gerbang ini tidak lagi menutup halaman; penulisan ditahan lewat useCanWrite()
 * dan penolakan 402 SUBSCRIPTION_EXPIRED dari server (paywall + banner).
 */
export default function PlanGate({ children }: Props) {
  return <>{children}</>
}
