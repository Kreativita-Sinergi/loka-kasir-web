/**
 * Tombol aksi berbasis TEKS (bukan ikon) untuk baris tabel/daftar.
 * Tujuan: pengguna awam langsung mengerti — "Edit" dan "Hapus" tertulis jelas.
 *
 * Pakai EditButton/DeleteButton untuk aksi standar, atau ActionButton untuk
 * aksi lain (mis. "Terima", "Lihat") dengan warna kustom.
 */
import type { MouseEvent, ReactNode } from 'react'

type Variant = 'edit' | 'delete' | 'neutral'

const VARIANT_CLASS: Record<Variant, string> = {
  edit: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10',
  delete: 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10',
  neutral: 'text-muted-foreground hover:text-foreground hover:bg-muted',
}

interface ActionButtonProps {
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  variant?: Variant
  children: ReactNode
  /** Hentikan propagasi klik (berguna di baris tabel yang punya onClick sendiri). */
  stopPropagation?: boolean
  type?: 'button' | 'submit'
}

export function ActionButton({
  onClick, disabled, variant = 'neutral', children, stopPropagation = true, type = 'button',
}: ActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={(e) => { if (stopPropagation) e.stopPropagation(); onClick?.(e) }}
      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASS[variant]}`}
    >
      {children}
    </button>
  )
}

export function EditButton(props: Omit<ActionButtonProps, 'variant' | 'children'> & { label?: string }) {
  const { label = 'Edit', ...rest } = props
  return <ActionButton {...rest} variant="edit">{label}</ActionButton>
}

export function DeleteButton(props: Omit<ActionButtonProps, 'variant' | 'children'> & { label?: string }) {
  const { label = 'Hapus', ...rest } = props
  return <ActionButton {...rest} variant="delete">{label}</ActionButton>
}
