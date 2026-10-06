import { Store } from 'lucide-react'
import OutletSelector from './OutletSelector'
import { t } from '@/lib/i18n'

/**
 * Halaman yang hanya berlaku per outlet (stok, jadwal lapangan) saat outlet
 * aktif masih "Semua Outlet".
 *
 * Pemilihnya ditaruh langsung di sini. Dulu hanya ada kalimat "gunakan dropdown
 * di sidebar kiri" — di ponsel sidebar itu tersembunyi di balik menu, jadi
 * pengguna berhenti di layar yang tidak bisa ia selesaikan.
 */
export default function OutletRequiredState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Store size={24} aria-hidden="true" />
      </div>
      <h3 className="mb-1 text-base font-semibold text-foreground">{t('stockPickOutletFirst')}</h3>
      <p className="mb-4 max-w-xs text-sm text-muted-foreground">{t('stockUseSidebarDropdown')}</p>
      <div className="w-full max-w-64 text-left">
        <OutletSelector />
      </div>
    </div>
  )
}
