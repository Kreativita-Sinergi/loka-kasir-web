import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Sparkles, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Zap, Package, ChefHat, Calculator, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { getAllPricingSuggestions, applyPricingSuggestion } from '@/api/pricing'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import type { PricingSuggestion } from '@/types'

const PRICING_SETUP_STEPS = [
  {
    icon: Package,
    step: '1',
    label: 'Tambah Bahan Baku',
    desc: 'Daftarkan semua bahan baku dengan satuan dan harga beli.',
    path: '/inventory/raw-materials',
  },
  {
    icon: ChefHat,
    step: '2',
    label: 'Buat Resep Produk',
    desc: 'Di halaman Produk → tab Resep, isi komposisi bahan per porsi.',
    path: '/products',
  },
  {
    icon: Calculator,
    step: '3',
    label: 'Atur Biaya & Target Keuntungan',
    desc: 'Isi biaya operasional bulanan dan target keuntungan di Pengaturan Keuangan.',
    path: '/settings/finance',
  },
]

function PricingSetupGuide() {
  const navigate = useNavigate()
  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-orange-50 dark:bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-100 mx-auto mb-4">
          <Sparkles size={26} className="text-orange-500 dark:text-orange-400" />
        </div>
        <h3 className="text-base font-bold text-foreground">Saran harga jual belum tersedia</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          Selesaikan 3 langkah berikut agar sistem dapat menghitung harga jual dari modal produk Anda.
        </p>
      </div>
      <div className="space-y-2">
        {PRICING_SETUP_STEPS.map(({ icon: Icon, step, label, desc, path }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-orange-200 dark:border-orange-500/20 hover:bg-orange-50 dark:bg-orange-500/10 text-left transition group"
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 group-hover:bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center transition">
                <Icon size={18} className="text-orange-500 dark:text-orange-400" />
              </div>
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{step}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
            <ChevronRight size={15} className="text-muted-foreground group-hover:text-orange-400 shrink-0 transition" />
          </button>
        ))}
      </div>
    </div>
  )
}

function DiffBadge({ diff }: { diff: number }) {
  if (Math.abs(diff) < 1) return null
  const up = diff > 0
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${up ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'}`}>
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {up ? '+' : ''}{formatCurrency(diff)}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border p-5 bg-card flex flex-col gap-4 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-muted rounded" />
        <div className="h-4 bg-muted rounded flex-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-muted rounded-lg p-3 space-y-1.5">
            <div className="h-3 bg-muted rounded w-16" />
            <div className="h-4 bg-muted rounded w-20" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <div className="space-y-1.5">
          <div className="h-3 bg-muted rounded w-24" />
          <div className="h-6 bg-muted rounded w-28" />
        </div>
        <div className="h-9 bg-muted rounded-lg w-24" />
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
      <Header title="Saran Harga Jual" subtitle="Hitung harga jual dari modal, biaya operasional, dan target keuntungan" />

      <div className="p-6 space-y-5">
        {/* Filter + bulk action bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-2 bg-muted p-1 rounded-xl">
            {(['outdated', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition ${filter === f ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
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
          filter === 'outdated' ? (
            <div className="flex flex-col items-center py-20 text-muted-foreground">
              <CheckCircle2 size={48} className="text-green-400 mb-4" />
              <p className="text-base font-medium text-muted-foreground">Semua harga sudah sesuai saran terbaru</p>
              <p className="text-sm text-muted-foreground mt-1">Tidak ada produk yang memerlukan pembaruan harga.</p>
            </div>
          ) : (
            <PricingSetupGuide />
          )
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
                  className={`rounded-xl border p-5 bg-card flex flex-col gap-4 ${s.is_outdated ? 'border-orange-200 dark:border-orange-500/20' : 'border-border'}`}
                >
                  {/* Header */}
                  <div className="flex items-start gap-2">
                    {s.is_outdated
                      ? <AlertTriangle size={15} className="text-orange-500 dark:text-orange-400 mt-0.5 shrink-0" />
                      : <Sparkles size={15} className="text-blue-400 mt-0.5 shrink-0" />
                    }
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm leading-tight truncate">{s.product_name}</p>
                      {s.is_outdated && (
                        <p className="text-xs text-orange-500 dark:text-orange-400 mt-0.5">Harga perlu diperbarui</p>
                      )}
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-muted-foreground mb-0.5">HPP Bahan Baku</p>
                      <p className="font-semibold text-foreground">{formatCurrency(s.base_hpp)}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-muted-foreground mb-0.5">Overhead/item</p>
                      <p className="font-semibold text-foreground">{formatCurrency(s.overhead_per_item)}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-3 col-span-2">
                      <p className="text-blue-500 dark:text-blue-400 mb-0.5">Total Modal (bahan + biaya operasional)</p>
                      <p className="font-bold text-blue-700 dark:text-blue-400">{formatCurrency(totalCogs)}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-muted-foreground mb-0.5">Harga Saat Ini</p>
                      <p className="font-semibold text-foreground">
                        {s.current_sell_price != null ? formatCurrency(s.current_sell_price) : '—'}
                      </p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-muted-foreground mb-0.5">Min. Harga Diskon</p>
                      <p className="font-semibold text-foreground">{formatCurrency(s.suggested_discount_limit)}</p>
                    </div>
                  </div>

                  {/* Suggestion + apply */}
                  <div className="flex items-center justify-between pt-1 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Saran Harga ({s.target_margin_percent}% margin)</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{formatCurrency(s.suggested_price)}</p>
                        <DiffBadge diff={s.price_diff} />
                      </div>
                    </div>
                    <button
                      onClick={() => applyMut.mutate({ productId: s.product_id, price: s.suggested_price })}
                      disabled={isApplying}
                      className={`text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 whitespace-nowrap transition-colors ${
                        s.is_outdated
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-muted text-muted-foreground hover:bg-muted'
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
