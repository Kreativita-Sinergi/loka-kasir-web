import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Store, Check } from 'lucide-react'
import { useBusinessOutlets } from '@/hooks/useBusinessOutlets'
import { useOutletStore } from '@/store/outletStore'
import { toTitleCase } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** [compact]: hanya ikon, untuk sidebar yang menciut menjadi rail. */
export default function OutletSelector({ compact = false }: { compact?: boolean }) {
  const { selected, setOutlet, rejectedIds } = useOutletStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { outlets, isEmployee, isSuccess } = useBusinessOutlets()

  // Outlet aktif tersimpan milik karyawan bisa saja sudah dicabut dari
  // penugasannya. Dilepas begitu daftarnya terbukti tidak memuatnya — hanya
  // setelah daftar berhasil dimuat, supaya daftar kosong saat memuat tidak
  // ikut menghapus pilihan yang sah. Setelah itu pemilihan otomatis di bawah
  // mengambil alih bila ia hanya bertugas di satu outlet.
  const staleSelection = isEmployee && isSuccess && !!selected && !outlets.some(o => o.id === selected.id)
  useEffect(() => {
    if (staleSelection) setOutlet(null)
  }, [staleSelection, setOutlet])

  // Bisnis satu outlet tidak punya pilihan untuk diambil: "Semua Outlet" di
  // sana hanya berarti header X-Outlet-Id tidak pernah terkirim, dan setiap
  // halaman yang mewajibkan outlet aktif — jadwal lapangan, apotek, stok —
  // menolak dengan "outlet aktif tidak dikenali". Galat itu tidak bisa
  // dipecahkan pemiliknya sendiri: tidak ada satu pun petunjuk di layar bahwa
  // yang kurang adalah outlet yang belum pernah ia pilih.
  //
  // Bergantung pada outlet-nya, bukan pada array-nya: `?? []` menghasilkan
  // array baru setiap render, dan efek yang bergantung padanya berjalan terus.
  // Outlet yang baru ditolak server (karyawan tidak bertugas di sana) tidak
  // dipilih ulang otomatis — kalau dipilih lagi, tolak-pilih berputar terus.
  //
  // Karyawan tidak boleh berada di "Semua Outlet": tanpa header X-Outlet-Id
  // server menjawab data gabungan, termasuk cabang tempat ia tidak bertugas.
  // Jadi bagi karyawan pilihan kosong selalu diganti outlet pertama yang boleh.
  const allowed = outlets.filter(o => !rejectedIds.includes(o.id))
  const autoPick = isEmployee
    ? (allowed[0] ?? null)
    : (outlets.length === 1 ? allowed[0] ?? null : null)
  useEffect(() => {
    if (!selected && autoPick) setOutlet(autoPick)
  }, [autoPick, selected, setOutlet])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const label = selected ? toTitleCase(selected.name) : t('labelAllOutlets')

  return (
    <div ref={ref} className="relative">
      {/* Gaya pemilih outlet di sidebar tablet aplikasi: pita biru tipis,
          kotak ikon, label kecil di atas nama outlet. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={compact ? `${t('sidebarActiveOutlet')}: ${label}` : undefined}
        title={compact ? label : undefined}
        className={cn(
          'flex items-center gap-2.5 rounded-[10px] border border-primary/15 bg-primary/[0.06] text-left transition-colors hover:bg-primary/10',
          compact ? 'mx-auto h-11 w-11 justify-center' : 'w-full px-2.5 py-2',
        )}
      >
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Store size={16} aria-hidden="true" />
        </span>
        {!compact && <>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] leading-tight text-muted-foreground">{t('sidebarActiveOutlet')}</span>
            <span className="block truncate text-[13px] font-semibold leading-snug text-foreground">{label}</span>
          </span>
          <ChevronDown size={15} className={`shrink-0 text-primary transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </>}
      </button>

      {open && (
        <div className={cn('absolute z-50 overflow-hidden rounded-xl border border-border bg-card shadow-lg', compact ? 'left-full top-0 ml-2 w-64' : 'left-0 right-0 top-full mt-1')}>
          {/* All outlets option — tidak untuk karyawan (lihat autoPick) */}
          {!isEmployee && <button
            type="button"
            onClick={() => { setOutlet(null); setOpen(false) }}
            className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors border-b border-border"
          >
            <span>{t('labelAllOutlets')}</span>
            {!selected && <Check size={13} className="text-primary" />}
          </button>}

          {outlets.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">{t('outletNoneYet')}</div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {outlets.map((outlet) => (
                <button
                  type="button"
                  key={outlet.id}
                  onClick={() => { setOutlet(outlet); setOpen(false) }}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-foreground truncate">{toTitleCase(outlet.name)}</p>
                    {outlet.address && (
                      <p className="text-muted-foreground truncate mt-0.5">{outlet.address}</p>
                    )}
                  </div>
                  {selected?.id === outlet.id && <Check size={13} className="text-primary ml-2 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
