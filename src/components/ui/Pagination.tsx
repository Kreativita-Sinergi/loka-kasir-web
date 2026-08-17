import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface PaginationProps {
  page: number
  total: number
  limit: number
  onChange: (page: number) => void
}

export default function Pagination({ page, total, limit, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border">
      <p className="text-xs sm:text-sm text-muted-foreground">
        {t('paginationShowing', {
          from: (page - 1) * limit + 1,
          to: Math.min(page * limit, total),
          total,
        })}
      </p>
      <div className="flex items-center gap-1 ml-auto">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="p-2.5 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p = i + 1
          if (totalPages > 5 && page > 3) p = page - 2 + i
          if (p > totalPages) return null
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={cn(
                'w-9 h-9 rounded-lg text-sm font-medium transition',
                p === page ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {p}
            </button>
          )
        })}
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="p-2.5 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
