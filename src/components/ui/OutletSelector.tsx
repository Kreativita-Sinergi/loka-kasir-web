import { useState, useRef, useEffect } from 'react'
import { ChevronDown, GitBranch, Check } from 'lucide-react'
import { useBusinessOutlets } from '@/hooks/useBusinessOutlets'
import { useOutletStore } from '@/store/outletStore'
import { toTitleCase } from '@/lib/utils'
import { t } from '@/lib/i18n'

export default function OutletSelector() {
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
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:bg-blue-500/15 transition-colors text-left"
      >
        <GitBranch size={14} className="text-blue-500 dark:text-blue-400 shrink-0" />
        <span className="flex-1 text-xs font-medium text-blue-700 dark:text-blue-400 truncate">{label}</span>
        <ChevronDown size={13} className={`text-blue-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {/* All outlets option — tidak untuk karyawan (lihat autoPick) */}
          {!isEmployee && <button
            onClick={() => { setOutlet(null); setOpen(false) }}
            className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors border-b border-border"
          >
            <span>{t('labelAllOutlets')}</span>
            {!selected && <Check size={13} className="text-blue-500 dark:text-blue-400" />}
          </button>}

          {outlets.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">{t('outletNoneYet')}</div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {outlets.map((outlet) => (
                <button
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
                  {selected?.id === outlet.id && <Check size={13} className="text-blue-500 dark:text-blue-400 ml-2 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
