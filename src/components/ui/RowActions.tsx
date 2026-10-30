/**
 * Tombol aksi berbasis TEKS (bukan ikon) untuk baris tabel/daftar.
 * Tujuan: pengguna awam langsung mengerti — "Edit" dan "Hapus" tertulis jelas.
 *
 * Pakai EditButton/DeleteButton untuk aksi standar, atau ActionButton untuk
 * aksi lain (mis. "Terima", "Lihat") dengan warna kustom.
 */
import type { MouseEvent, ReactNode } from 'react'
import { t } from '@/lib/i18n'
import { useCanWrite } from '@/hooks/useSubscription'

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
  title?: string
}

export function ActionButton({
  onClick, disabled, variant = 'neutral', children, stopPropagation = true, type = 'button', title,
}: ActionButtonProps) {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={(e) => { if (stopPropagation) e.stopPropagation(); onClick?.(e) }}
      className={`inline-flex items-center justify-center min-h-11 sm:min-h-9 px-3 py-1.5 text-sm font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASS[variant]}`}
    >
      {children}
    </button>
  )
}

export function EditButton(props: Omit<ActionButtonProps, 'variant' | 'children'> & { label?: string }) {
  const { label = t('actionEdit'), ...rest } = props
  return <ActionButton {...rest} variant="edit">{label}</ActionButton>
}

/** Hapus dimatikan saat langganan berakhir (mode lihat saja). Edit sengaja
 * tidak: formnya juga dipakai untuk melihat rincian, dan menyimpannya ditolak
 * server dengan 402 yang membuka paywall. */
export function DeleteButton(props: Omit<ActionButtonProps, 'variant' | 'children'> & { label?: string }) {
  const { label = t('actionDelete'), disabled, ...rest } = props
  const canWrite = useCanWrite()
  return (
    <ActionButton {...rest} disabled={disabled || !canWrite} title={canWrite ? undefined : t('subLockedTitle')} variant="delete">
      {label}
    </ActionButton>
  )
}
