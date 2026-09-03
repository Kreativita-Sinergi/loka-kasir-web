import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, TrendingDown, TrendingUp, Layers, Info } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import { getCashDiscrepancyReport, type CashierDiscrepancyRow } from '@/api/shifts'
import { formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'

// ── Rentang tanggal ─────────────────────────────────────────────────────────

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

// ── Lencana persentase ──────────────────────────────────────────────────────

/**
 * Warna dipilih relatif terhadap rata-rata TOKO, bukan terhadap ambang tetap.
 *
 * Ambang tetap ("merah bila >20%") salah di kedua arah: di toko yang seluruh
 * kasirnya berantakan semuanya jadi merah dan tidak ada yang menonjol, sedangkan
 * di toko yang sangat rapi kasir dengan 8% — dua kali lipat rekannya — tampak
 * hijau dan aman. Yang dicari halaman ini adalah kasir yang menyimpang dari
 * rekan-rekannya sendiri.
 */
function RateBadge({ rate, average }: { rate: number; average: number }) {
  const ratio = average > 0 ? rate / average : rate > 0 ? 2 : 0
  const cls =
    ratio >= 1.5
      ? 'bg-destructive-subtle text-destructive'
      : ratio >= 1
        ? 'bg-warning-subtle text-warning'
        : 'bg-success-subtle text-success'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {rate.toFixed(0)}%
    </span>
  )
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-muted rounded w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function CashierRow({ row, average }: { row: CashierDiscrepancyRow; average: number }) {
  return (
    <tr className="hover:bg-muted transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-foreground">{row.cashier_name}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{row.outlet_name || '—'}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground text-center">{row.total_shifts}</td>
      <td className="px-4 py-3 text-sm text-center font-semibold text-destructive">{row.short_count}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground text-center">{row.over_count}</td>
      <td className="px-4 py-3 text-sm text-right font-semibold text-destructive">
        {row.total_short > 0 ? formatCurrency(row.total_short) : '—'}
      </td>
      <td className="px-4 py-3 text-center">
        <RateBadge rate={row.short_rate} average={average} />
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground text-right">
        {row.worst_short > 0 ? formatCurrency(row.worst_short) : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground text-right">{formatCurrency(row.total_sales)}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {row.last_shift_at ? new Date(row.last_shift_at).toLocaleDateString() : '—'}
      </td>
    </tr>
  )
}

export default function CashDiscrepancyPage() {
  const [from, setFrom] = useState(() => isoDate(new Date(Date.now() - 30 * 86400000)))
  const [to, setTo] = useState(() => isoDate(new Date()))

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cash-discrepancy', from, to],
    queryFn: () => getCashDiscrepancyReport({ from, to }),
    select: (res) => res.data.data,
  })

  const rows = data?.rows ?? []
  const summary = data?.summary
  const average = summary?.average_short_rate ?? 0

  return (
    <>
      <Header title={t('navCashDiscrepancy')} subtitle={t('cashDiscSubtitle')} />

      <div className="p-6 space-y-6">
        {/* Rentang tanggal */}
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t('cashDiscFrom')}</span>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t('cashDiscTo')}</span>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
            />
          </label>
        </div>

        {isError && (
          <div className="bg-destructive-subtle border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">
            {t('cashDiscLoadFailed')}
          </div>
        )}

        {/* Kartu ringkasan */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t('cashDiscTotalShifts')}
            value={summary?.total_shifts ?? 0}
            icon={<Layers size={18} />}
            color="blue"
            loading={isLoading}
          />
          <StatCard
            title={t('cashDiscShortShifts')}
            value={summary?.short_count ?? 0}
            icon={<AlertTriangle size={18} />}
            color="red"
            loading={isLoading}
          />
          <StatCard
            title={t('cashDiscTotalShort')}
            value={formatCurrency(summary?.total_short ?? 0)}
            icon={<TrendingDown size={18} />}
            color="red"
            loading={isLoading}
          />
          <StatCard
            title={t('cashDiscAvgRate')}
            value={`${average.toFixed(0)}%`}
            subtitle={formatCurrency(summary?.total_over ?? 0) + ' ' + t('cashDiscTotalOver').toLowerCase()}
            icon={<TrendingUp size={18} />}
            color="orange"
            loading={isLoading}
          />
        </div>

        {/* Tabel */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('cashDiscColCashier')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('cashDiscColOutlet')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">{t('cashDiscColShifts')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">{t('cashDiscColShort')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">{t('cashDiscColOver')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">{t('cashDiscColTotalShort')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">{t('cashDiscColRate')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">{t('cashDiscColWorst')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">{t('cashDiscColSales')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('cashDiscColLast')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <SkeletonRows cols={10} />
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {t('cashDiscEmpty')}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => <CashierRow key={row.cashier_id} row={row} average={average} />)
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Catatan pembacaan — sengaja di bawah tabel, bukan di atasnya:
            yang membuka halaman ini datang untuk melihat angka, dan penjelasan
            di atas tabel hanya menunda apa yang dicarinya. */}
        <div className="flex gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">{t('cashDiscNote')}</p>
        </div>
      </div>
    </>
  )
}
