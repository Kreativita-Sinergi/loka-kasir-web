import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, PackageX, ScanLine, X } from 'lucide-react'
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
// Jumlah item yang dirender per "halaman" incremental.
const PAGE_SIZE = 60

export default function ProductCatalog({ products, categories, loading, onPick }: Props) {
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  // Incremental rendering ("windowing tail"): hanya render sebagian item lalu
  // tambah saat sentinel di bawah terlihat. Menjaga DOM tetap ringan untuk toko
  // dengan ribuan produk, tanpa dependency virtualization.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const searchRef = useRef<HTMLInputElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Ubah query → reset jumlah render.
  const changeQuery = (v: string) => {
    setQuery(v)
    setVisibleCount(PAGE_SIZE)
  }
  const changeCategory = (v: string | null) => {
    setCategoryId(v)
    setVisibleCount(PAGE_SIZE)
  }

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

  // Keyboard shortcuts: "/" memfokuskan kotak pencarian dari mana saja,
  // "Escape" menghapus & melepas fokus. Tidak aktif saat mengetik di input lain.
  useEffect(() => {
    const onShortcut = (e: KeyboardEvent) => {
      const el = document.activeElement
      const typingElsewhere =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      if (e.key === '/' && !typingElsewhere) {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'Escape' && el === searchRef.current) {
        setQuery('')
        setVisibleCount(PAGE_SIZE)
        searchRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [])

  // Fokuskan pencarian saat panel pertama dibuka agar kasir langsung mengetik.
  useEffect(() => {
    searchRef.current?.focus()
  }, [])

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

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  // Tambah batch saat sentinel di dasar daftar masuk viewport.
  useEffect(() => {
    if (!hasMore) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length))
        }
      },
      { rootMargin: '400px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, filtered.length])

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          ref={searchRef}
          value={query}
          onChange={(e) => changeQuery(e.target.value)}
          placeholder="Cari produk atau scan barcode…  ( / )"
          className="pl-9 pr-9"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              changeQuery('')
              searchRef.current?.focus()
            }}
            aria-label="Hapus pencarian"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X size={15} />
          </button>
        ) : (
          <ScanLine className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        )}
      </div>

      {/* Category tabs */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <CategoryChip active={categoryId === null} onClick={() => changeCategory(null)} label="Semua" />
        {categories.map((c) => (
          <CategoryChip
            key={c.id}
            active={categoryId === c.id}
            onClick={() => changeCategory(c.id)}
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
            {visible.map((p) => {
              const tracks = p.track_stock
              const stockQty = p.stock ?? 0
              const outOfStock = tracks && stockQty <= 0 && !p.ignore_stock_check
              const disabled = !p.is_available || outOfStock
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
                    {tracks && (
                      <p
                        className={cn(
                          'mt-0.5 text-[11px] font-medium',
                          outOfStock ? 'text-destructive' : 'text-muted-foreground',
                        )}
                      >
                        {outOfStock ? 'Stok habis' : `Stok: ${stockQty}`}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
            {/* Sentinel: memicu render batch berikutnya saat mendekati dasar. */}
            {hasMore && (
              <div ref={sentinelRef} className="col-span-full h-8" aria-hidden />
            )}
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
