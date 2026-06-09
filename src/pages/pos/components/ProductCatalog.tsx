import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, PackageX, ScanLine } from 'lucide-react'
import { Input } from '@/components/ui/input'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency, cn } from '@/lib/utils'
import type { Product, Category } from '@/types'
import { resolveSellPrice } from '@/pages/pos/types'

interface Props {
  products: Product[]
  categories: Category[]
  loading: boolean
  onPick: (product: Product) => void
}

/**
 * Catalog panel: search, category filter, responsive product grid.
 * Supports hardware USB barcode scanners (they type fast + Enter) by matching
 * the typed buffer against product SKU and auto-picking on exact match.
 */
export default function ProductCatalog({ products, categories, loading, onPick }: Props) {
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Barcode scanner: capture rapid keystrokes ending in Enter anywhere on page.
  useEffect(() => {
    let buffer = ''
    let lastTime = 0
    const onKey = (e: KeyboardEvent) => {
      const now = Date.now()
      if (now - lastTime > 80) buffer = ''
      lastTime = now
      if (e.key === 'Enter') {
        if (buffer.length >= 4) {
          const match = products.find((p) => p.sku && p.sku === buffer)
          if (match) {
            onPick(match)
            buffer = ''
            e.preventDefault()
          }
        }
        buffer = ''
        return
      }
      if (e.key.length === 1) buffer += e.key
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [products, onPick])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (categoryId && p.category?.id !== categoryId) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [products, query, categoryId])

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari produk atau scan barcode…"
          className="pl-9"
        />
        <ScanLine className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
      </div>

      {/* Category tabs */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <CategoryChip active={categoryId === null} onClick={() => setCategoryId(null)} label="Semua" />
        {categories.map((c) => (
          <CategoryChip
            key={c.id}
            active={categoryId === c.id}
            onClick={() => setCategoryId(c.id)}
            label={c.name}
          />
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<PackageX size={26} />} title="Produk tidak ditemukan" description="Coba kata kunci lain atau ubah kategori." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => {
              const disabled = !p.is_available
              return (
                <button
                  key={p.id}
                  disabled={disabled}
                  onClick={() => onPick(p)}
                  className={cn(
                    'flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition hover:border-primary hover:shadow-sm',
                    disabled && 'opacity-50',
                  )}
                >
                  <div className="aspect-square w-full bg-muted">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl font-bold text-muted-foreground">
                        {p.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 text-xs font-medium">{p.name}</p>
                    <p className="mt-1 text-sm font-bold text-primary">
                      {formatCurrency(resolveSellPrice(p))}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function CategoryChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted',
      )}
    >
      {label}
    </button>
  )
}
