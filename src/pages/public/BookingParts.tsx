import type { ReactNode } from 'react'
import type { PublicBookingCourt } from '@/api/public'
import { t } from '@/lib/i18n'
import { hhmm, type DayGrid, type SlotOption } from './publicBookingTime'

/** Kartu satu langkah pemesanan, bernomor supaya urutannya terbaca sekilas. */
export function StepCard({ n, title, done, children }: { n: number; title: string; done?: boolean; children: ReactNode }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/70 p-4 space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
        <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
          done ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}>
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

const swatch = {
  free: 'bg-white ring-1 ring-gray-300',
  taken: 'bg-gray-200',
  selected: 'bg-blue-600',
  closed: 'bg-[repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6_4px,#e5e7eb_4px,#e5e7eb_8px)]',
}

/** Keterangan warna kotak jam. */
export function SlotLegend({ withClosed = false }: { withClosed?: boolean }) {
  const items: [keyof typeof swatch, string][] = [
    ['free', t('pbLegendFree')],
    ['taken', t('pbLegendTaken')],
    ['selected', t('pbLegendSelected')],
    ...(withClosed ? [['closed', t('pbLegendClosed')] as [keyof typeof swatch, string]] : []),
  ]
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map(([kind, label]) => (
        <span key={kind} className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className={`w-3.5 h-3.5 rounded ${swatch[kind]}`} />
          {label}
        </span>
      ))}
    </div>
  )
}

/**
 * Pilihan jam mulai: yang kosong bisa diketuk, yang penuh tetap tampil tapi
 * dicoret. Jam yang sudah lewat disembunyikan — tidak ada gunanya, dan pagi
 * yang sudah lewat hanya mendorong jam yang masih bisa dipesan ke bawah.
 */
export function SlotPicker({ options, selected, onSelect }: {
  options: SlotOption[]
  selected: number | null
  onSelect: (minute: number) => void
}) {
  const visible = options.filter((o) => o.state !== 'past')
  const anyFree = visible.some((o) => o.state === 'free')
  return (
    <div className="space-y-2">
      <SlotLegend />
      {!anyFree && <p className="text-sm text-gray-500">{t('pbNoSlot')}</p>}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {visible.map((o) => {
          const active = o.minute === selected
          if (o.state === 'taken') {
            return (
              <div key={o.minute} aria-disabled
                className="px-2 py-1.5 rounded-xl bg-gray-100 text-center">
                <span className="block text-sm font-semibold text-gray-400 line-through">{hhmm(o.minute)}</span>
                <span className="block text-[10px] font-medium text-gray-400 leading-tight">{t('pbLegendTaken')}</span>
              </div>
            )
          }
          return (
            <button key={o.minute} type="button" onClick={() => onSelect(o.minute)}
              className={`px-2 py-2.5 rounded-xl text-sm font-semibold ring-1 transition ${
                active ? 'bg-blue-600 text-white ring-blue-600' : 'bg-white text-gray-800 ring-gray-300 hover:ring-blue-400'}`}>
              {hhmm(o.minute)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Jadwal sehari semua lapangan, berdampingan — gambaran "kapan saja yang
 * masih kosong" dalam satu layar. Kotak kosong yang bisa menjadi jam mulai
 * diketuk untuk memilih lapangan & jamnya sekaligus.
 */
export function DayScheduleGrid({ courts, grid, isStart, selected, onPick }: {
  courts: PublicBookingCourt[]
  grid: DayGrid
  /** Apakah baris [minute] di [courtId] bisa menjadi jam mulai untuk durasi terpilih. */
  isStart: (courtId: string, minute: number) => boolean
  selected: { courtId: string; from: number; to: number } | null
  onPick: (courtId: string, minute: number) => void
}) {
  // Sampai tiga lapangan muat selebar layar ponsel: tanpa gulir mendatar,
  // judul kolomnya bisa menempel di atas saat jadwal digulir ke bawah —
  // tanpa itu, di jam 20.00 pelanggan lupa kolom mana lapangan yang mana.
  const scrollable = courts.length > 3
  // 44px: sama dengan batas sentuh minimal tombol di layar sentuh (index.css),
  // supaya kotak penuh dan kotak kosong setinggi.
  const cell = 'h-11 w-full rounded-lg'
  const table = (
    <table className="w-full border-separate border-spacing-1 text-xs">
      <thead>
        <tr>
          <th className={`w-12 bg-white ${scrollable ? 'sticky left-0' : 'sticky top-0 z-10'}`} />
          {courts.map((c) => (
            <th key={c.id}
              className={`bg-white font-semibold text-gray-700 px-1 py-1.5 min-w-[72px] truncate ${scrollable ? '' : 'sticky top-0 z-10'}`}>
              {c.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {grid.rows.map((m, i) => (
          <tr key={m}>
            <td className="sticky left-0 bg-white pr-1 text-right text-gray-500 tabular-nums align-top">{hhmm(m)}</td>
            {courts.map((c) => {
              const state = grid.cells[c.id]?.[i] ?? 'closed'
              const isSelected = !!selected && selected.courtId === c.id && m >= selected.from && m < selected.to
              let body: ReactNode
              if (isSelected) {
                body = <div className={`${cell} bg-blue-600`} aria-label={t('pbLegendSelected')} />
              } else if (state === 'free') {
                body = (
                  <button type="button" disabled={!isStart(c.id, m)} onClick={() => onPick(c.id, m)}
                    aria-label={`${c.name} ${hhmm(m)} ${t('pbLegendFree')}`}
                    className={`${cell} block bg-white ring-1 ring-gray-300 hover:ring-blue-400 disabled:hover:ring-gray-300`} />
                )
              } else if (state === 'taken') {
                body = (
                  <div className={`${cell} bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-500`}>
                    {t('pbLegendTaken')}
                  </div>
                )
              } else {
                // Lewat dan tutup sama-sama tidak bisa dipilih; lewat cukup
                // diredupkan, tutup diberi arsiran.
                body = <div className={`${cell} ${state === 'past' ? 'bg-gray-50' : swatch.closed}`} />
              }
              return <td key={c.id} className="p-0">{body}</td>
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
  return (
    <div className="space-y-2">
      <SlotLegend withClosed />
      <p className="text-xs text-gray-500">{t('pbGridHint')}</p>
      {scrollable ? <div className="overflow-x-auto -mx-1 px-1">{table}</div> : table}
    </div>
  )
}
