import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { t } from '@/lib/i18n'
import QueryErrorState from './QueryErrorState'

interface Column<T> { key: string; label: ReactNode; render?: (row: T) => ReactNode; className?: string }
interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  emptySlot?: ReactNode
  onRowClick?: (row: T) => void
  error?: unknown
  onRetry?: () => unknown
  /** Dense comparison reports can retain their horizontal table on small screens. */
  mobileLayout?: 'cards' | 'scroll'
}

export function DataTable<T extends object>({ columns, data, loading, emptyMessage = t('emptyNoData'), emptySlot, onRowClick, mobileLayout = 'cards', error, onRetry }: TableProps<T>) {
  const cards = mobileLayout === 'cards'
  const primaryKey = columns.find(column => column.key !== 'select' && column.key !== 'actions')?.key
  const openRow = (event: React.MouseEvent, row: T) => {
    if ((event.target as Element).closest('button, a, input, select, textarea, [role="button"]')) return
    onRowClick?.(row)
  }
  return (
    <div className="min-w-0 max-w-full overflow-x-auto" aria-busy={loading}>
      <QueryErrorState error={error} onRetry={onRetry} />
      <table className={cn('w-full text-sm', cards && 'data-table-cards')}>
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {columns.map(col => <th key={col.key} scope="col" data-selection={col.key === 'select' ? 'true' : undefined}
              className={cn('px-4 py-3 text-left text-xs font-semibold text-muted-foreground', col.className)}>
              {col.label}{cards && col.key === 'select' && <span className="ml-2 md:hidden">{t('tableSelectAll')}</span>}
            </th>)}
          </tr>
        </thead>
        <tbody>
          {loading ? Array.from({ length: 5 }, (_, index) => <tr key={index} className="border-b border-border">
            {columns.map(col => <td key={col.key} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-muted" /></td>)}
          </tr>) : error && data.length === 0 ? null : data.length === 0 ? <tr><td colSpan={columns.length}>{emptySlot ?? <div className="px-4 py-12 text-center text-muted-foreground">{emptyMessage}</div>}</td></tr>
            : data.map((row, index) => <tr key={String((row as Record<string, unknown>).id ?? (row as Record<string, unknown>).transaction_id ?? index)}
              tabIndex={onRowClick ? 0 : undefined} onClick={event => openRow(event, row)}
              onKeyDown={onRowClick ? event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); onRowClick(row) } } : undefined}
              className={cn('border-b border-border transition-colors hover:bg-muted/40', onRowClick && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary')}>
              {columns.map(col => <td key={col.key} className={cn('px-4 py-3 text-foreground', col.className)} data-primary={col.key === primaryKey ? 'true' : undefined} data-actions={col.key === 'actions' || col.label === '' ? 'true' : undefined} data-selection={col.key === 'select' ? 'true' : undefined}>
                {cards && <span className="table-cell-label" aria-hidden="true">{typeof col.label === 'string' ? col.label : t('tableSelectRow')}</span>}
                <div className="table-cell-value">{col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}</div>
              </td>)}
            </tr>)}
        </tbody>
      </table>
    </div>
  )
}
