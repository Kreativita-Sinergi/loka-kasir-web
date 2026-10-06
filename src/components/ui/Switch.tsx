import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Nama untuk pembaca layar; wajib bila tidak ada label teks di sebelahnya. */
  label?: string
  disabled?: boolean
  /** `sm` untuk baris tabel dan sidebar; `md` untuk formulir. */
  size?: 'sm' | 'md'
  /** Warna jalur saat aktif; bawaan biru brand. */
  tone?: 'primary' | 'success'
  className?: string
}

/**
 * Sakelar seperti `Switch` Material di aplikasi (jalur biru saat aktif, bulatan
 * putih). Mengganti ikon ToggleLeft/ToggleRight yang tampak seperti gambar
 * tempelan, bukan kontrol yang bisa ditekan.
 */
export default function Switch({ checked, onChange, label, disabled, size = 'md', tone = 'primary', className }: SwitchProps) {
  const sm = size === 'sm'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(event) => { event.stopPropagation(); onChange(!checked) }}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        sm ? 'h-5 w-9' : 'h-6 w-11',
        checked ? (tone === 'success' ? 'bg-success' : 'bg-primary') : 'bg-muted-foreground/30',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none inline-block transform rounded-full bg-white shadow transition-transform',
          sm ? 'h-4 w-4' : 'h-5 w-5',
          checked ? (sm ? 'translate-x-4' : 'translate-x-5') : 'translate-x-0',
        )}
      />
    </button>
  )
}
