import Header from '@/components/layout/Header'
import DiscountsTab from './library/DiscountsTab'

/**
 * Diskon — menu tersendiri, bukan tab di dalam halaman lain.
 *
 * Membuat promo adalah salah satu hal yang paling sering dicari pemilik usaha,
 * dan sebelumnya ia terkubur sebagai tab keempat di halaman bernama "Library".
 * Menu yang dicari lewat namanya harus bisa ditemukan lewat namanya.
 */
export default function DiscountsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Diskon"
        subtitle="Buat dan kelola potongan harga untuk pelanggan"
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <DiscountsTab />
      </div>
    </div>
  )
}
