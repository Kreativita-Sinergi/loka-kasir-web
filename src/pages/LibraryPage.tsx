import { useState } from 'react'
import Header from '@/components/layout/Header'
import { cn } from '@/lib/utils'
import UnitsTab from './library/UnitsTab'
import BrandsTab from './library/BrandsTab'
import CategoriesTab from './library/CategoriesTab'
import DiscountsTab from './library/DiscountsTab'
import TaxesTab from './library/TaxesTab'

const TABS = [
  { key: 'units', label: 'Satuan' },
  { key: 'brands', label: 'Brand' },
  { key: 'categories', label: 'Kategori' },
  { key: 'discounts', label: 'Diskon' },
  { key: 'taxes', label: 'Pajak' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function LibraryPage() {
  const [tab, setTab] = useState<TabKey>('units')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Library" subtitle="Kelola data referensi produk bisnis" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === t.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'units' && <UnitsTab />}
        {tab === 'brands' && <BrandsTab />}
        {tab === 'categories' && <CategoriesTab />}
        {tab === 'discounts' && <DiscountsTab />}
        {tab === 'taxes' && <TaxesTab />}
      </div>
    </div>
  )
}
