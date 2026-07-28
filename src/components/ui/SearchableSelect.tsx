/**
 * SearchableSelect — combobox pengganti <select> native.
 *
 * Dipakai bila daftar opsi bisa panjang (ratusan kategori/produk/varian) sehingga
 * scroll <select> bawaan jadi tidak nyaman. Opsi boleh dikelompokkan lewat
 * `group` untuk kasus seperti "varian dikelompokkan per produk".
 */
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  /** Judul kelompok opsional — opsi tanpa group ditampilkan lebih dulu. */
  group?: string
  /** Teks kecil di kanan, mis. harga atau SKU. */
  hint?: string
}

interface Props {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
  /** Teks tombol reset di puncak daftar; sembunyikan bila field wajib diisi. */
  clearable?: boolean
  disabled?: boolean
}

export default function SearchableSelect({
  value, onChange, options, placeholder, clearable = true, disabled = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const q = query.trim().toLowerCase()
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q) || (o.group ?? '').toLowerCase().includes(q))
    : options

  // Pertahankan urutan kemunculan grup agar daftar tidak melompat saat difilter.
  const groups: { name: string | undefined; items: SelectOption[] }[] = []
  filtered.forEach((o) => {
    const last = groups[groups.length - 1]
    if (last && last.name === o.group) last.items.push(o)
    else groups.push({ name: o.group, items: [o] })
  })

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen((o) => !o); setQuery('') }}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5 text-left text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
      >
        <span className={`truncate ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
          {selected ? selected.label : (placeholder ?? '— Pilih —')}
        </span>
        <ChevronDown size={15} className="shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search size={14} className="shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari…"
              className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {clearable && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
              >
                {placeholder ?? '— Pilih —'}
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-muted-foreground">Tidak ditemukan</p>
            ) : (
              groups.map((g, gi) => (
                <div key={`${g.name ?? ''}-${gi}`}>
                  {g.name && (
                    <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {g.name}
                    </p>
                  )}
                  {g.items.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => { onChange(o.value); setOpen(false) }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="truncate">{o.label}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        {o.hint && <span className="text-xs text-muted-foreground">{o.hint}</span>}
                        {o.value === value && <Check size={14} className="text-primary" />}
                      </span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
