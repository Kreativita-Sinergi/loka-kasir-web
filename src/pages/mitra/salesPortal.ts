import { useOutletContext } from 'react-router-dom'
import type { SalesProfile } from '@/api/sales'

/** Data di portal sales diperbarui saat tab difokuskan dan setiap menit. */
export const salesQueryOptions = { refetchInterval: 60_000, refetchOnWindowFocus: true } as const

/** Profil sales yang dimuat SalesLayout dan diteruskan lewat Outlet. */
export const useSalesProfile = () => useOutletContext<SalesProfile>()

// Portal sales hanya untuk mitra di Indonesia dan seluruh teksnya berbahasa
// Indonesia, jadi angka dan tanggal dikunci ke id-ID — tidak mengikuti bahasa
// peramban seperti dasbor pemilik.
const rupiahFormat = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })

export const rupiah = (n: number) => rupiahFormat.format(n)
export const tanggal = (iso: string) => dateFormat.format(new Date(iso))
