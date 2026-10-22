import { useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import type { AddonSection } from '@/lib/modifierGroups'
import { formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'

/** Kolom cari muncul bila pilihannya sebanyak ini atau lebih. */
const SEARCH_THRESHOLD = 16

const sectionKey = (s: AddonSection) => s.group?.id ?? 'loose'

/**
 * Pemilih ekstra di menu QR: tiap grup satu blok, pilihannya chip berjajar.
 *
 * Dulu satu pilihan satu baris — seblak prasmanan dengan puluhan isian
 * berarti menggulir berlayar-layar di HP pembeli. Bar lompat dan kolom cari
 * menempel di atas area gulir lembar ([Sheet]), jadi tetap terlihat saat
 * pembeli sudah jauh di bawah.
 *
 * [registerSection] memberi tahu induk elemen tiap grup, supaya "Tambahkan"
 * bisa menggulir ke grup wajib yang masih kosong.
 */
export default function AddonPicker({
  sections, selected, onToggle, flagMissing, registerSection,
}: {
  sections: AddonSection[]
  selected: ReadonlySet<string>
  onToggle: (section: AddonSection, id: string) => void
  flagMissing: boolean
  registerSection: (key: string, el: HTMLElement | null) => void
}) {
  const [query, setQuery] = useState('')
  const [els] = useState(() => new Map<string, HTMLElement>())
  const total = sections.reduce((n, s) => n + s.addons.length, 0)
  const q = query.trim().toLowerCase()
  const picked = (s: AddonSection) => s.addons.filter((a) => selected.has(a.id)).length
  const visible = sections
    .map((s) => (q ? { ...s, addons: s.addons.filter((a) => a.name.toLowerCase().includes(q)) } : s))
    .filter((s) => s.addons.length > 0)

  const jump = (key: string) => els.get(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const showSearch = total >= SEARCH_THRESHOLD
  const showBar = sections.length >= 3

  return (
    <div>
      {(showSearch || showBar) && (
        <div className="sticky top-0 z-10 -mx-4 sm:-mx-5 px-4 sm:px-5 pt-1 pb-3 bg-white">
          {showSearch && (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('menuExtraSearch')}
                className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {query && (
                <button type="button" aria-label={t('actionClose')} onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-gray-400">
                  <X size={14} />
                </button>
              )}
            </div>
          )}
          {showBar && (
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] mt-2">
              {sections.map((s) => {
                const n = picked(s)
                const missing = !!s.group?.is_required && n === 0
                return (
                  <button
                    key={sectionKey(s)}
                    type="button"
                    onClick={() => { setQuery(''); requestAnimationFrame(() => jump(sectionKey(s))) }}
                    className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                      n > 0 ? 'border-blue-600 bg-blue-50 text-blue-700' : missing ? 'border-red-400 text-gray-700' : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    {missing && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                    {s.group?.name ?? t('menuAddons')}
                    {n > 0 && <span className="min-w-[18px] rounded-full bg-blue-600 px-1.5 text-[11px] font-bold text-white">{n}</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {q && visible.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-500">{t('menuExtraSearchEmpty', { query: query.trim() })}</p>
      )}

      {visible.map((s) => {
        const original = sections.find((x) => sectionKey(x) === sectionKey(s)) ?? s
        const n = picked(original)
        const required = !!s.group?.is_required
        const missing = required && n === 0
        const framed = flagMissing && missing
        return (
          <div
            key={sectionKey(s)}
            ref={(el) => {
              if (el) els.set(sectionKey(s), el)
              else els.delete(sectionKey(s))
              registerSection(sectionKey(s), el)
            }}
            className={`mb-5 scroll-mt-28 ${framed ? 'rounded-2xl border-2 border-red-400 bg-red-50/40 p-3' : ''}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <p className="flex-1 text-sm font-bold text-gray-900">{s.group?.name ?? t('menuAddons')}</p>
              {/* Satu pilihan saja: aturan pilih tidak berarti apa-apa. */}
              {s.group && original.addons.length > 1 && <span className="text-xs text-gray-400">{ruleHint(s)}</span>}
              {required ? (
                <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  missing ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {!missing && <Check size={11} strokeWidth={3} />}
                  {t('menuRequired')}
                </span>
              ) : n > 0 && (
                <span className="min-w-[20px] rounded-full bg-blue-600 px-1.5 text-center text-[11px] font-bold text-white">{n}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {s.addons.map((a) => {
                const on = selected.has(a.id)
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onToggle(original, a.id)}
                    className={`min-h-11 flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-left transition-colors ${
                      on ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-900 active:bg-gray-50'
                    }`}
                  >
                    {on && <Check size={14} strokeWidth={3} className="shrink-0" />}
                    <span>
                      <span className={`block text-sm ${on ? 'font-bold' : 'font-medium'}`}>{a.name}</span>
                      {a.price > 0 && (
                        <span className={`block text-[11px] ${on ? 'text-blue-600' : 'text-gray-500'}`}>+{formatCurrency(a.price)}</span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ruleHint(s: AddonSection): string {
  const g = s.group!
  // "Wajib" tampil sebagai penanda sendiri; di sini cukup cara pilihnya.
  if (g.select_type === 'SINGLE') return t('menuPickOneRequired')
  return g.max_select ? t('menuPickUpTo', { count: g.max_select }) : t('menuPickAny')
}
