import { Search } from 'lucide-react'
import { productUsageLabel } from '@/lib/libraryList'

/** Kolom cari di kepala tab Kategori/Satuan/Brand — bentuk sama dengan
 *  kolom cari Outlet dan Pelanggan. Pencariannya di server (daftar ini
 *  berhalaman), jadi halaman dikembalikan ke 1 oleh pemanggil. */
export function LibrarySearchInput({ value, onChange, placeholder }: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="relative flex-1 max-w-xs">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

/** "Dipakai 12 produk" — redup bila belum dipakai, kosong untuk server lama. */
export function ProductUsage({ count }: { count?: number | null }) {
  const label = productUsageLabel(count)
  if (!label) return null
  return <span className={`text-xs ${count ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
}
