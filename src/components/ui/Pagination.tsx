import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface PaginationProps { page: number; total: number; limit: number; onChange: (page: number) => void }

export default function Pagination({ page, total, limit, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1 || limit <= 0) return null
  const current = Math.min(Math.max(1, page), totalPages)
  const start = Math.max(1, Math.min(current - 2, totalPages - 4))
  const mobileStart = Math.max(1, Math.min(current - 1, totalPages - 2))
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index)
  return (
    <nav aria-label={t('paginationNavigation')} className="flex min-w-0 flex-col items-center justify-between gap-3 border-t border-border px-3 py-4 sm:flex-row sm:px-4">
      <p className="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">{t('paginationShowing', { from: (current - 1) * limit + 1, to: Math.min(current * limit, total), total })}</p>
      <div className="flex max-w-full items-center gap-0.5">
        <button type="button" aria-label={t('paginationPrevious')} disabled={current <= 1} onClick={() => onChange(current - 1)} className="flex h-11 w-10 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={18} /></button>
        {pages.map(number => <button key={number} type="button" aria-label={t('paginationPage', { page: number })} aria-current={number === current ? 'page' : undefined}
          onClick={() => onChange(number)} className={cn(number < mobileStart || number > mobileStart + 2 ? 'hidden sm:inline-flex' : 'inline-flex', 'items-center justify-center h-11 w-10 rounded-xl text-sm font-semibold transition', number === current ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted')}>{number}</button>)}
        <button type="button" aria-label={t('paginationNext')} disabled={current >= totalPages} onClick={() => onChange(current + 1)} className="flex h-11 w-10 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={18} /></button>
      </div>
    </nav>
  )
}
