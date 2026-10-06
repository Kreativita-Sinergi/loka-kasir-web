import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Potongan UI kecil yang dipakai bersama layar gaji: sakelar, pilihan chip,
 * baris label-nilai, dan judul bagian. Dikumpulkan di satu tempat supaya modal
 * terbitkan, modal slip, form komponen, dan setelan tahapan terbaca serupa.
 */

export const inputClass =
  'w-full min-h-11 px-3 py-2 text-sm bg-background text-foreground border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60'

export function FieldLabel({ children, required, hint, htmlFor }: {
  children: ReactNode; required?: boolean; hint?: string; htmlFor?: string
}) {
  // Tanpa pembungkus: `Form` menautkan label ke kendali yang menjadi saudara
  // berikutnya, dan keterangan ditaruh di dalam label supaya tautan itu tetap
  // berlaku saat ada keterangan.
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-foreground">
      {children}{required && <span className="text-red-500 dark:text-red-400"> *</span>}
      {hint && <span className="mt-0.5 block font-normal text-muted-foreground">{hint}</span>}
    </label>
  )
}

/** Sakelar hidup/mati — tombol dengan peran switch supaya terbaca pembaca layar. */
export function Toggle({ checked, onChange, label, disabled }: {
  checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
      )}
    >
      <span className={cn(
        'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
        checked ? 'translate-x-5.5' : 'translate-x-0.5',
      )} />
    </button>
  )
}

export interface ChipOption<T> { value: T; label: string; hint?: string; disabled?: boolean }

/** Pilihan satu-dari-banyak berbentuk chip, cermin ChoiceChip di aplikasi. */
export function Chips<T extends string | number | boolean>({ options, value, onChange, ariaLabel }: {
  options: ChipOption<T>[]; value: T; onChange: (next: T) => void; ariaLabel: string
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map(option => {
        const selected = option.value === value
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-9 rounded-full border px-3 py-1.5 text-left text-xs font-medium transition disabled:opacity-50',
              selected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {option.label}
            {option.hint && <span className="ml-1 text-[11px] font-normal text-muted-foreground">{option.hint}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Baris label di kiri, nilai di kanan — potongan diberi warna merah. */
export function PayrollRow({ label, value, detail, note, negative, strong }: {
  label: string; value: string; detail?: string | null; note?: string | null; negative?: boolean; strong?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <div className="min-w-0">
        <p className={cn('text-sm', strong ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{label}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
        {note && <p className="text-xs font-semibold text-warning">{note}</p>}
      </div>
      <p className={cn(
        'shrink-0 text-sm font-semibold tabular-nums',
        negative ? 'text-destructive' : strong ? 'text-primary' : 'text-foreground',
      )}>{value}</p>
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <p className="mb-1 mt-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{children}</p>
}

export function HintBox({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' }) {
  return (
    <div className={cn(
      'rounded-xl px-3 py-2.5 text-xs',
      tone === 'warning' ? 'bg-warning-subtle text-warning' : 'bg-primary/8 text-muted-foreground dark:bg-primary/16',
    )}>
      {children}
    </div>
  )
}
