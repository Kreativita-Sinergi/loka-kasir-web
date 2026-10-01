import { Package } from 'lucide-react'
import type { TopProduct } from '@/types'
import { t } from '@/lib/i18n'

interface TopProductsChartProps {
  products: TopProduct[]
  loading: boolean
}

export default function TopProductsChart({ products, loading }: TopProductsChartProps) {
  return (
    <div className="bg-card rounded-2xl border border-border">
      <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-foreground">{t('dashTopProducts')}</h2>
        <span className="text-xs text-muted-foreground">{t('labelTransactions')}</span>
      </div>
      {loading ? (
        <div className="p-5 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="px-5 py-10 flex flex-col items-center gap-3 text-center text-muted-foreground text-sm"><Package size={28} className="opacity-50" /><p>{t('emptyNoData')}</p></div>
      ) : (
        <ol className="divide-y divide-border px-5">
          {products.map((product, index) => <li key={`${product.product_name}-${index}`} className="flex items-start gap-3 py-4">
            <span className="mt-0.5 w-5 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">{product.product_name}</p><span className="shrink-0 text-sm font-semibold tabular-nums">{product.order_count}</span></div>
              <div aria-hidden="true" className="mt-2 h-1 rounded bg-muted"><div className="h-full rounded bg-primary/70" style={{ width: `${Math.max(0, Math.min(100, product.order_count / Math.max(1, ...products.map(item => item.order_count)) * 100))}%` }} /></div>
            </div>
          </li>)}
        </ol>
      )}
    </div>
  )
}
