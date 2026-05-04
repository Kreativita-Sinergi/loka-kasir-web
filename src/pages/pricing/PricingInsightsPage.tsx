import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Zap } from 'lucide-react'
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

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-100 p-5 bg-white flex flex-col gap-4 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-gray-100 rounded" />
        <div className="h-4 bg-gray-100 rounded flex-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-1.5">
            <div className="h-3 bg-gray-100 rounded w-16" />
            <div className="h-4 bg-gray-100 rounded w-20" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <div className="space-y-1.5">
          <div className="h-3 bg-gray-100 rounded w-24" />
          <div className="h-6 bg-gray-100 rounded w-28" />
        </div>
        <div className="h-9 bg-gray-100 rounded-lg w-24" />
      </div>
    </div>
  )
}

export default function PricingInsightsPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'outdated'>('outdated')
  const [applying, setApplying] = useState<string | null>(null)
  const [bulkApplying, setBulkApplying] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['pricing-suggestions'],
    queryFn: getAllPricingSuggestions,
    select: (res) => res.data.data ?? [],
  })

  const suggestions: PricingSuggestion[] = data ?? []
  const outdatedItems = suggestions.filter(s => s.is_outdated)
  const filtered = filter === 'outdated' ? outdatedItems : suggestions

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

  async function handleBulkApply() {
    if (!outdatedItems.length) return
    if (!confirm(`Terapkan harga saran untuk ${outdatedItems.length} produk sekaligus?`)) return
    setBulkApplying(true)
    let successCount = 0
    let failCount = 0
    for (const s of outdatedItems) {
      try {
        await applyPricingSuggestion(s.product_id, s.suggested_price)
        successCount++
      } catch {
        failCount++
      }
    }
    setBulkApplying(false)
    if (failCount === 0) {
      toast.success(`${successCount} harga berhasil diperbarui`)
    } else {
      toast.error(`${successCount} berhasil, ${failCount} gagal diperbarui`)
    }
    qc.invalidateQueries({ queryKey: ['products'] })
    qc.invalidateQueries({ queryKey: ['pricing-suggestions'] })
  }

  return (
    <>
      <Header title="Rekomendasi Harga" />

      <div className="p-6 space-y-5">
        {/* Filter + bulk action bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
            {(['outdated', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition ${filter === f ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {f === 'outdated'
                  ? `Perlu Diperbarui (${outdatedItems.length})`
                  : `Semua Produk (${suggestions.length})`}
              </button>
            ))}
          </div>

          {outdatedItems.length > 1 && !isLoading && (
            <button
              onClick={handleBulkApply}
              disabled={bulkApplying}
              className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50"
            >
              <Zap size={14} />
              {bulkApplying ? 'Menerapkan...' : `Terapkan Semua (${outdatedItems.length})`}
            </button>
          )}
        </div>

        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <CheckCircle2 size={48} className="text-green-400 mb-4" />
            <p className="text-base font-medium text-gray-600">
              {filter === 'outdated' ? 'Semua harga sudah up-to-date!' : 'Belum ada produk dengan BOM terdaftar.'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === 'outdated'
                ? 'Tidak ada produk yang memerlukan pembaruan harga.'
                : 'Tambahkan resep (BOM) pada produk agar saran harga dapat dihitung.'
              }
            </p>
          </div>
        )}

        {/* Cards */}
        {!isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(s => {
              const totalCogs = s.base_hpp + s.overhead_per_item
              const isApplying = applying === s.product_id || bulkApplying

              return (
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
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{s.product_name}</p>
                      {s.is_outdated && (
                        <p className="text-xs text-orange-500 mt-0.5">Harga perlu diperbarui</p>
                      )}
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-400 mb-0.5">HPP Bahan Baku</p>
                      <p className="font-semibold text-gray-800">{formatCurrency(s.base_hpp)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-400 mb-0.5">Overhead/item</p>
                      <p className="font-semibold text-gray-800">{formatCurrency(s.overhead_per_item)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 col-span-2">
                      <p className="text-blue-500 mb-0.5">Total COGS (HPP + Overhead)</p>
                      <p className="font-bold text-blue-700">{formatCurrency(totalCogs)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-400 mb-0.5">Harga Saat Ini</p>
                      <p className="font-semibold text-gray-800">
                        {s.current_sell_price != null ? formatCurrency(s.current_sell_price) : '—'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-400 mb-0.5">Min. Harga Diskon</p>
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
                      disabled={isApplying}
                      className={`text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 whitespace-nowrap transition-colors ${
                        s.is_outdated
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {isApplying ? 'Menerapkan...' : 'Terapkan'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
