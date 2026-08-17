import Header from '@/components/layout/Header'
import TaxesTab from '../library/TaxesTab'
import { t } from '@/lib/i18n'

/**
 * Pajak — halaman Pengaturan tersendiri.
 *
 * Pajak menentukan berapa yang dibayar pembeli, jadi tempatnya di Pengaturan
 * bersama aturan uang lainnya, bukan di antara kategori dan satuan produk.
 *
 * Sengaja TIDAK digabung ke "Pengaturan Keuangan": halaman itu terkunci paket
 * Pro, sementara pajak dipakai warung di paket mana pun. Menggabungkannya
 * berarti mencabut pengaturan pajak dari pengguna yang selama ini memilikinya.
 */
export default function TaxSettingsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title={t('labelTax')}
        subtitle={t('taxPageSubtitle')}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <TaxesTab />
      </div>
    </div>
  )
}
