import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { getAllPricingSuggestions, applyPricingSuggestion } from '@/api/pricing'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import type { PricingSuggestion } from '@/types'

function DiffBadge({ diff }: { diff: number }) {
  if (Math.abs(diff) < 1) return null
  const up = diff > 0
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${up ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {up ? '+' : ''}{formatCurrency(diff)}
    </span>
  )
}

export default function PricingInsightsPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'outdated'>('outdated')
  const [applying, setApplying] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['pricing-suggestions'],
    queryFn: getAllPricingSuggestions,
    select: (res) => res.data.data ?? [],
  })

  const suggestions: PricingSuggestion[] = data ?? []
  const filtered = filter === 'outdated' ? suggestions.filter(s => s.is_outdated) : suggestions

  const applyMut = useMutation({
    mutationFn: ({ productId, price }: { productId: string; price: number }) =>
      applyPricingSuggestion(productId, price),
    onMutate: ({ productId }) => setApplying(productId),
    onSettled: () => setApplying(null),
    onSuccess: () => {
      toast.success('Harga berhasil diperbarui')
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['pricing-suggestions'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <>
      <Header title="Rekomendasi Harga" />

      <div className="p-6">
        {/* Summary bar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
            {(['outdated', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition ${filter === f ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {f === 'outdated'
                  ? `Perlu Diperbarui (${suggestions.filter(s => s.is_outdated).length})`
                  : `Semua Produk (${suggestions.length})`}
              </button>
            ))}
          </div>
          {isLoading && <span className="text-sm text-gray-400">Menghitung saran harga...</span>}
        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <CheckCircle2 size={48} className="text-green-400 mb-4" />
            <p className="text-base font-medium text-gray-600">Semua harga sudah up-to-date!</p>
            <p className="text-sm text-gray-400 mt-1">Tidak ada produk yang memerlukan pembaruan harga.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div
              key={s.product_id}
              className={`rounded-xl border p-5 bg-white flex flex-col gap-4 ${s.is_outdated ? 'border-orange-200' : 'border-gray-100'}`}
            >
              {/* Header */}
              <div className="flex items-start gap-2">
                {s.is_outdated
                  ? <AlertTriangle size={15} className="text-orange-500 mt-0.5 shrink-0" />
                  : <Sparkles size={15} className="text-blue-400 mt-0.5 shrink-0" />
                }
                <p className="font-semibold text-gray-800 text-sm leading-tight">{s.product_name}</p>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 mb-0.5">HPP Bahan Baku</p>
                  <p className="font-semibold text-gray-800">{formatCurrency(s.base_hpp)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 mb-0.5">Overhead/item</p>
                  <p className="font-semibold text-gray-800">{formatCurrency(s.overhead_per_item)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 mb-0.5">Harga Saat Ini</p>
                  <p className="font-semibold text-gray-800">{s.current_sell_price != null ? formatCurrency(s.current_sell_price) : '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 mb-0.5">Diskon Minimum</p>
                  <p className="font-semibold text-gray-800">{formatCurrency(s.suggested_discount_limit)}</p>
                </div>
              </div>

              {/* Suggestion + apply */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-400">Saran Harga ({s.target_margin_percent}% margin)</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-lg font-bold text-blue-700">{formatCurrency(s.suggested_price)}</p>
                    <DiffBadge diff={s.price_diff} />
                  </div>
                </div>
                <button
                  onClick={() => applyMut.mutate({ productId: s.product_id, price: s.suggested_price })}
                  disabled={applying === s.product_id}
                  className="text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {applying === s.product_id ? 'Menerapkan...' : 'Terapkan'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
