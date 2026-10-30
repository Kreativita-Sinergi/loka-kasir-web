import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useAuthStore } from '@/store/authStore'

/**
 * Area cetak laporan akuntansi — pola yang sama dengan bukti konsinyasi:
 * dirender ke <body> lewat portal supaya @media print bisa menyembunyikan
 * seluruh dasbor (sidebar, header, kontainer ber-overflow) dan hanya
 * mencetak laporannya. Dialog cetak dibuka begitu komponen ini dipasang;
 * `onDone` dipanggil setelah dialog ditutup.
 */
export default function PrintPortal({ title, period, children, onDone }: {
  title: string
  period: string
  children: ReactNode
  onDone: () => void
}) {
  const storeName = useAuthStore(s => s.user?.business?.business_name)

  useEffect(() => {
    const finish = () => onDone()
    window.addEventListener('afterprint', finish, { once: true })
    const frame = requestAnimationFrame(() => window.print())
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('afterprint', finish)
    }
  }, [onDone])

  return createPortal(
    <div id="accounting-print-area" className="hidden print:block">
      <style>{`
        @media print {
          body > * { display: none !important; }
          #accounting-print-area { display: block !important; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>
      <div className="bg-white text-black text-[11px] leading-snug">
        <div className="mb-3 text-center">
          {storeName && <p className="text-sm font-bold">{storeName}</p>}
          <p className="text-base font-bold">{title}</p>
          <p>{period}</p>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
