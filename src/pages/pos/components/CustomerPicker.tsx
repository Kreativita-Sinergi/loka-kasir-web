import { useEffect, useState } from 'react'
import { Search, X, Star } from 'lucide-react'
import { getCustomersByBusiness } from '@/api/customers'
import { usePosSessionStore } from '@/store/posSessionStore'
import type { Customer } from '@/types'

/**
 * Pencari pelanggan untuk POS: ketik nama / no HP → muat pelanggan yang sudah
 * ada (tampil poin), atau biarkan sebagai nama baru. Pelanggan terpilih dikirim
 * sebagai customer_id saat checkout; bila hanya nama/HP diketik tanpa memilih,
 * backend akan menautkan/membuat berdasarkan HP.
 */
export default function CustomerPicker() {
  const customer = usePosSessionStore((s) => s.customer)
  const setCustomer = usePosSessionStore((s) => s.setCustomer)
  const customerName = usePosSessionStore((s) => s.customerName)
  const setCustomerName = usePosSessionStore((s) => s.setCustomerName)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Cari pelanggan (debounced) saat belum ada yang dipilih.
  useEffect(() => {
    if (customer) return
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const t = setTimeout(() => {
      getCustomersByBusiness('', { search: q, limit: 6 })
        .then((res) => setResults(res.data?.data ?? []))
        .catch(() => setResults([])) // mis. plan free (403) → diam saja
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [query, customer])

  // Pelanggan sudah dipilih → tampilkan chip dengan poin + tombol hapus.
  if (customer) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary-subtle px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{customer.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {customer.phone || 'Tanpa no HP'}
            {typeof customer.points === 'number' && (
              <span className="ml-2 inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                <Star size={11} /> {customer.points} poin
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => { setCustomer(null); setQuery(''); setCustomerName(null) }}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted"
          title="Ganti pelanggan"
        >
          <X size={15} />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setCustomerName(e.target.value || null) // fallback: dipakai sebagai nama bila tak memilih
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Cari / tambah pelanggan (nama / no HP)"
        className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {open && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
          {loading ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Mencari…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Tidak ada pelanggan cocok. Akan disimpan sebagai pelanggan baru.
            </div>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setCustomer({ id: c.id, name: c.name, phone: c.phone, points: c.points_balance })
                  setQuery('')
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{c.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{c.phone || 'Tanpa no HP'}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400">
                  <Star size={11} /> {c.points_balance}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
