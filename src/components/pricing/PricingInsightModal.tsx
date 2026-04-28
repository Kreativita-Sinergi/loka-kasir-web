/**
 * PricingInsightModal — lists all products with BOM-driven price suggestions,
 * flags outdated prices, and allows one-click apply per product.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { getAllPricingSuggestions, applyPricingSuggestion } from '@/api/pricing'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import type { PricingSuggestion } from '@/types'

interface PricingInsightModalProps {
  isOpen: boolean
  onClose: () => void
}

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

export default function PricingInsightModal({ isOpen, onClose }: PricingInsightModalProps) {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'outdated'>('outdated')
  const [applying, setApplying] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pricing-suggestions'],
    queryFn: getAllPricingSuggestions,
    enabled: isOpen,
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
      refetch()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rekomendasi Harga Jual">
      <div className="space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
          {(['outdated', 'all'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${filter === f ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {f === 'outdated' ? `Perlu Diperbarui (${suggestions.filter(s => s.is_outdated).length})` : `Semua (${suggestions.length})`}
            </button>
          ))}
        </div>

        {isLoading && <div className="text-sm text-gray-400 py-6 text-center">Menghitung saran harga...</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center py-10 text-gray-400">
            <CheckCircle2 size={36} className="text-green-400 mb-3" />
            <p className="text-sm font-medium text-gray-600">Semua harga sudah up-to-date!</p>
            <p className="text-xs text-gray-400 mt-1">Tidak ada produk yang memerlukan pembaruan harga.</p>
          </div>
        )}

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {filtered.map(s => (
            <div
              key={s.product_id}
              className={`rounded-xl border p-4 ${s.is_outdated ? 'border-orange-200 bg-orange-50' : 'border-gray-100 bg-white'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {s.is_outdated && <AlertTriangle size={13} className="text-orange-500 flex-shrink-0" />}
                    <p className="font-semibold text-gray-800 text-sm truncate">{s.product_name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
                    <div>
                      <p className="text-gray-400">HPP Bahan Baku</p>
                      <p className="font-medium text-gray-700">{formatCurrency(s.base_hpp)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Overhead/item</p>
                      <p className="font-medium text-gray-700">{formatCurrency(s.overhead_per_item)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Harga Saat Ini</p>
                      <p className="font-medium text-gray-700">{s.current_sell_price != null ? formatCurrency(s.current_sell_price) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Harga Diskon Min.</p>
                      <p className="font-medium text-gray-700">{formatCurrency(s.suggested_discount_limit)}</p>
                    </div>
                  </div>
                </div>

                {/* Right: suggested price + apply button */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Saran Harga</p>
                    <p className="text-lg font-bold text-blue-700">{formatCurrency(s.suggested_price)}</p>
                    <DiffBadge diff={s.price_diff} />
                  </div>
                  <button
                    type="button"
                    onClick={() => applyMut.mutate({ productId: s.product_id, price: s.suggested_price })}
                    disabled={applying === s.product_id}
                    className="text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {applying === s.product_id ? 'Menerapkan...' : 'Terapkan'}
                  </button>
                </div>
              </div>

              {/* Margin info */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>Margin target: <strong>{s.target_margin_percent}%</strong></span>
                <span>COGS total: <strong>{formatCurrency(s.base_hpp + s.overhead_per_item)}</strong></span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  )
}
