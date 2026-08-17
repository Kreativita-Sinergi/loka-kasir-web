import { useState } from 'react'
import Header from '@/components/layout/Header'
import { cn } from '@/lib/utils'
import UnitsTab from './library/UnitsTab'
import BrandsTab from './library/BrandsTab'
import CategoriesTab from './library/CategoriesTab'
import { t } from '@/lib/i18n'

/**
 * Kategori, satuan, dan brand — label yang dipilih saat mengisi produk.
 *
 * Dulu halaman ini bernama "Library" dan menampung lima tab: ketiga label di
 * atas plus Diskon dan Pajak. Dua yang terakhir bukan label produk melainkan
 * aturan uang, dan menyimpannya di sini berarti pemilik yang hendak membuat
 * promo tidak punya cara menebak di mana Diskon berada. Keduanya kini punya
 * halamannya sendiri (/discounts dan /settings/tax).
 */
// Fungsi, bukan konstanta: isinya memanggil t(), dan konstanta modul
// dievaluasi sekali saat berkas dimuat — bahasanya akan terkunci pada yang
// kebetulan aktif saat itu dan tidak ikut berubah saat pengguna menggantinya.
const tabs = () => [
  { key: 'categories', label: t('labelCategory') },
  { key: 'units', label: t('labelUnit') },
  { key: 'brands', label: t('labelBrandShort') },
] as const

type TabKey = ReturnType<typeof tabs>[number]['key']

export default function ProductAttributesPage() {
  // Kategori lebih dulu: ia yang paling sering ditengok, dan satu-satunya yang
  // mengubah tampilan katalog di aplikasi kasir.
  const [tab, setTab] = useState<TabKey>('categories')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title={t('navLibrary')}
        subtitle={t('attrPageSubtitle')}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6 w-fit">
          {tabs().map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === t.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'categories' && <CategoriesTab />}
        {tab === 'units' && <UnitsTab />}
        {tab === 'brands' && <BrandsTab />}
      </div>
    </div>
  )
}
