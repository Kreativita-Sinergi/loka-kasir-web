import type { ComponentType, ReactNode } from 'react'
import * as Loka from '@/components/icons/loka'
import type { LokaIconProps } from '@/components/icons/loka'
import { t } from '@/lib/i18n'

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')

/**
 * Kepala halaman pembeli (menu QR, cek pesanan, booking, saldo): biru brand,
 * logo toko di tile putih, dan motif ikon Loka samar di pojok — satu bentuk
 * untuk semua halaman publik.
 */
export function PublicHeader({ logo, name, subtitle, motif: Motif = Loka.Store, actions, children }: {
  logo?: string | null
  name: string
  subtitle?: string | null
  /** Ikon Loka besar yang samar di pojok kanan — sesuai halamannya. */
  motif?: ComponentType<LokaIconProps>
  /** Chip di kanan judul (meja, pesanan saya, judul halaman). */
  actions?: ReactNode
  /** Isi tambahan di bawah judul, masih di atas latar biru. */
  children?: ReactNode
}) {
  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-600 to-blue-800 text-white">
      <Motif size={168} strokeWidth={1.5} accent="#fff" accentOpacity={0.08}
        className="pointer-events-none absolute -right-8 -top-6 text-white/10 rotate-[-12deg]" />
      <div className="pointer-events-none absolute -left-12 -bottom-20 w-48 h-48 rounded-full bg-white/[0.06]" />
      <div className="relative max-w-2xl mx-auto px-4 pt-4 pb-8">
        <div className="flex items-center gap-3">
          {logo ? (
            <img src={logo} alt="" className="w-11 h-11 rounded-2xl object-cover bg-white shadow-sm ring-2 ring-white/40" />
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-white text-blue-700 shadow-sm ring-2 ring-white/40 flex items-center justify-center text-sm font-extrabold tracking-tight">
              {initials(name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] font-bold leading-tight truncate">{name}</h1>
            {subtitle && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-white/80 truncate">
                <Loka.Store size={12} accentOpacity={0} className="shrink-0" />
                <span className="truncate">{subtitle}</span>
              </p>
            )}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </header>
  )
}

/** Chip kaca di kepala halaman — tombol bila [onClick] ada. */
export function HeaderChip({ icon: Icon, children, onClick, label, className = '' }: {
  icon?: ComponentType<LokaIconProps>
  children: ReactNode
  onClick?: () => void
  label?: string
  className?: string
}) {
  const cls = `shrink-0 flex items-center gap-1.5 text-xs font-semibold bg-white/15 ring-1 ring-white/25 backdrop-blur-sm rounded-full px-3 py-1.5 ${className}`
  const body = <>{Icon && <Icon size={14} accent="#fff" accentOpacity={0.25} />}<span className="truncate">{children}</span></>
  return onClick
    ? <button type="button" onClick={onClick} aria-label={label} className={`${cls} active:bg-white/25`}>{body}</button>
    : <span className={cls}>{body}</span>
}

/** Tile ikon beraksen untuk layar status & kartu info. */
export function IconTile({ icon: Icon, tone = 'blue', size = 'md' }: {
  icon: ComponentType<LokaIconProps>
  tone?: 'blue' | 'emerald' | 'amber' | 'red' | 'gray'
  size?: 'sm' | 'md' | 'lg'
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    red: 'bg-red-50 text-red-600 ring-red-100',
    gray: 'bg-gray-100 text-gray-500 ring-gray-200',
  }
  const dims = { sm: ['w-9 h-9 rounded-xl', 18], md: ['w-12 h-12 rounded-2xl', 24], lg: ['w-16 h-16 rounded-3xl', 32] } as const
  const [box, px] = dims[size]
  return (
    <div className={`${box} ${tones[tone]} ring-1 flex items-center justify-center shrink-0`}>
      <Icon size={px} />
    </div>
  )
}

/** Jejak brand di kaki halaman pembeli. */
export function PoweredByLoka() {
  return (
    <a href="https://www.lokakasir.id" target="_blank" rel="noreferrer"
      className="mx-auto mt-8 flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] text-gray-400 active:bg-gray-100">
      {t('publicPoweredBy')}
      <img src="/icon-current.svg" alt="" className="w-4 h-4 rounded-[5px]" />
      <span className="font-semibold text-gray-600">Loka Kasir</span>
    </a>
  )
}
