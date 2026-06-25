import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft } from 'lucide-react'
import { NAV_ITEMS, type NavItem } from './navItems'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'

/**
 * Command palette global: tekan Cmd/Ctrl+K untuk membuka, ketik untuk mencari
 * halaman, panah ↑/↓ untuk navigasi, Enter untuk pindah, Esc untuk tutup.
 *
 * Memakai NAV_ITEMS yang sama dengan Sidebar sehingga otomatis menghormati
 * hak akses (permission) dan paket (plan) pengguna — tanpa duplikasi menu.
 *
 * Bagian dalam (PaletteBody) di-mount ulang tiap kali dibuka, jadi query &
 * indeks aktif otomatis fresh tanpa perlu reset via effect.
 */
export default function CommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    const onOpenEvent = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('open-command-palette', onOpenEvent)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('open-command-palette', onOpenEvent)
    }
  }, [])

  if (!open) return null
  return <PaletteBody onClose={() => setOpen(false)} />
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const { can, canAny, isPro, isLite } = usePermissions()

  // Fokuskan input segera setelah palette ter-mount.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Hanya tampilkan menu yang boleh diakses pengguna.
  const accessible = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        if (item.anyOf && item.anyOf.length > 0) return canAny(...item.anyOf)
        if (item.permission) return can(item.permission)
        return true
      }),
    [can, canAny],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return accessible
    return accessible.filter((item) => item.label.toLowerCase().includes(q))
  }, [accessible, query])

  // Clamp saat render agar indeks tetap valid walau hasil mengecil.
  const selected = Math.min(active, Math.max(0, results.length - 1))

  const go = (item: NavItem) => {
    onClose()
    navigate(item.path)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = results[selected]
      if (item) go(item)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  // Auto-scroll item aktif agar selalu terlihat.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${selected}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  const planLabel = (item: NavItem): string | null => {
    if (item.planRequired === 'pro' && !isPro) return 'Pro'
    if (item.planRequired === 'lite' && !isLite) return 'Lite'
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search size={16} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Cari halaman… (mis. Produk, Laporan, Shift)"
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Tidak ada halaman yang cocok.
            </p>
          ) : (
            results.map((item, idx) => {
              const plan = planLabel(item)
              return (
                <button
                  key={item.path}
                  data-idx={idx}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => go(item)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition',
                    idx === selected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  )}
                >
                  <span className={cn('shrink-0', idx === selected ? 'text-primary-foreground' : 'text-muted-foreground')}>
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {plan && (
                    <span
                      className={cn(
                        'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold',
                        idx === selected
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-primary-subtle text-primary',
                      )}
                    >
                      {plan}
                    </span>
                  )}
                  {idx === selected && <CornerDownLeft size={13} className="shrink-0 opacity-70" />}
                </button>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border px-1">↑</kbd>
            <kbd className="rounded border border-border px-1">↓</kbd>
            navigasi
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border px-1">↵</kbd>
            buka
          </span>
        </div>
      </div>
    </div>
  )
}
