import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { getLowStockRawMaterials } from '@/api/rawMaterials'

export default function LowStockAlert() {
  const [expanded, setExpanded] = useState(false)

  const { data } = useQuery({
    queryKey: ['raw-material-low-stock'],
    queryFn: getLowStockRawMaterials,
  })

  const items = data?.data?.data ?? []

  if (items.length === 0) return null

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{items.length} bahan baku stok menipis</span>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-amber-600" />
        ) : (
          <ChevronDown size={16} className="text-amber-600" />
        )}
      </button>

      {/* Expanded list */}
      {expanded && (
        <div className="border-t border-amber-200 divide-y divide-amber-100">
          {items.map(item => (
            <div key={item.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
              <span className="font-medium text-gray-800">{item.name}</span>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>
                  Stok:{' '}
                  <span className="font-semibold text-red-600">
                    {item.stock.toLocaleString('id-ID', { maximumFractionDigits: 3 })}
                  </span>{' '}
                  {item.unit?.alias ?? item.unit?.name ?? ''}
                </span>
                <span className="text-gray-300">|</span>
                <span>
                  Min:{' '}
                  <span className="font-semibold text-amber-700">
                    {item.min_stock.toLocaleString('id-ID', { maximumFractionDigits: 3 })}
                  </span>{' '}
                  {item.unit?.alias ?? item.unit?.name ?? ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
