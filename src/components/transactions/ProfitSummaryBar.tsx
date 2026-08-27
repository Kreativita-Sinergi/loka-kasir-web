import { AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { ProfitSummary } from '@/types'
import { t } from '@/lib/i18n'

interface Props {
  summary: ProfitSummary | undefined
}

/**
 * Strip laba di atas tabel transaksi.
 *
 * Angkanya menjawab seluruh rentang filter, bukan halaman yang sedang dilihat —
 * karena itu ia datang dari endpoint sendiri, bukan dari penjumlahan baris di
 * layar. Peringatan harga modal ikut ditampilkan: tanpa itu warung yang belum
 * mengisi harga modal melihat margin 100% dan mengira itu kabar baik.
 */
export default function ProfitSummaryBar({ summary }: Props) {
  if (!summary) return null

  const positive = summary.gross_profit >= 0

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">{t('txNetRevenue')}</p>
          <p className="font-semibold text-foreground">{formatCurrency(summary.total_revenue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('txCogs')}</p>
          <p className="font-semibold text-foreground">{formatCurrency(summary.total_cogs)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('txGrossProfit')}</p>
          <p className={'font-bold ' + (positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
            {formatCurrency(summary.gross_profit)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('txMargin')}</p>
          <p className="font-semibold text-foreground">{summary.gross_margin.toFixed(1)}%</p>
        </div>
      </div>

      {summary.missing_cost_count > 0 && (
        <div className="mt-2 flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-400">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{t('txProfitMissingCost', { count: summary.missing_cost_count })}</span>
        </div>
      )}
    </div>
  )
}
