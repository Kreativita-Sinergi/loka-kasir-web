import { useState } from 'react'
import Header from '@/components/layout/Header'
import { cn } from '@/lib/utils'
import UnitsTab from './library/UnitsTab'
import BrandsTab from './library/BrandsTab'
import CategoriesTab from './library/CategoriesTab'

/**
 * Kategori, satuan, dan brand — label yang dipilih saat mengisi produk.
 *
 * Dulu halaman ini bernama "Library" dan menampung lima tab: ketiga label di
 * atas plus Diskon dan Pajak. Dua yang terakhir bukan label produk melainkan
 * aturan uang, dan menyimpannya di sini berarti pemilik yang hendak membuat
 * promo tidak punya cara menebak di mana Diskon berada. Keduanya kini punya
 * halamannya sendiri (/discounts dan /settings/tax).
 */
const TABS = [
  { key: 'categories', label: 'Kategori' },
  { key: 'units', label: 'Satuan' },
  { key: 'brands', label: 'Brand' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function ProductAttributesPage() {
  // Kategori lebih dulu: ia yang paling sering ditengok, dan satu-satunya yang
  // mengubah tampilan katalog di aplikasi kasir.
  const [tab, setTab] = useState<TabKey>('categories')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Kategori, Merek & Satuan"
        subtitle="Rapikan pengelompokan, merek, dan satuan yang dipakai produk"
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6 w-fit">
          {TABS.map((t) => (
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
