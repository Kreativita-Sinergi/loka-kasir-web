import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PackageMinus, Boxes, UserX, Layers, Info } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import { getStockShrinkageReport, type StockShrinkageRow } from '@/api/stock'
import { formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
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

function ShrinkageRow({ row }: { row: StockShrinkageRow }) {
  return (
    <tr className="hover:bg-muted transition-colors">
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-foreground">{row.product_name}</div>
        {row.sku && <div className="text-xs text-muted-foreground">{row.sku}</div>}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{row.outlet_name || '—'}</td>
      <td className="px-4 py-3 text-sm text-center font-semibold text-destructive">{row.shrink_qty}</td>
      <td className="px-4 py-3 text-sm text-right font-semibold text-destructive">{formatCurrency(row.shrink_value)}</td>
      {/* Jumlah penyesuaian ditandai hanya ketika berulang: satu koreksi besar
          biasanya barang rusak, sedangkan koreksi kecil yang terjadi lagi dan
          lagi adalah hal yang dicari halaman ini. */}
      <td className="px-4 py-3 text-center">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
            row.adjustment_count >= 3 ? 'bg-destructive-subtle text-destructive' : 'text-muted-foreground'
          }`}
        >
          {row.adjustment_count}×
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground text-center">{row.gain_qty > 0 ? `+${row.gain_qty}` : '—'}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {row.actors === '-' ? <span className="text-warning">—</span> : row.actors}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {row.last_shrink_at ? new Date(row.last_shrink_at).toLocaleDateString() : '—'}
      </td>
    </tr>
  )
}

export default function StockShrinkagePage() {
  const [from, setFrom] = useState(() => isoDate(new Date(Date.now() - 90 * 86400000)))
  const [to, setTo] = useState(() => isoDate(new Date()))

  const { data, isLoading, isError } = useQuery({
    queryKey: ['stock-shrinkage', from, to],
    queryFn: () => getStockShrinkageReport({ from, to }),
    select: (res) => res.data.data,
  })

  const rows = data?.rows ?? []

  return (
    <>
      <Header title={t('navShrinkage')} subtitle={t('shrinkSubtitle')} />

      <div className="p-6 space-y-6">
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
            {t('shrinkLoadFailed')}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t('shrinkTotalValue')}
            value={formatCurrency(data?.total_shrink_value ?? 0)}
            icon={<PackageMinus size={18} />}
            color="red"
            loading={isLoading}
          />
          <StatCard
            title={t('shrinkTotalQty')}
            value={data?.total_shrink_qty ?? 0}
            icon={<Boxes size={18} />}
            color="orange"
            loading={isLoading}
          />
          <StatCard
            title={t('shrinkProducts')}
            value={rows.length}
            icon={<Layers size={18} />}
            color="blue"
            loading={isLoading}
          />
          <StatCard
            title={t('shrinkUnattributed')}
            value={data?.unattributed_count ?? 0}
            icon={<UserX size={18} />}
            color="orange"
            loading={isLoading}
          />
        </div>

        {/* Peringatan pelaku kosong. Ditaruh DI ATAS tabel, tidak seperti catatan
            pembacaan di bawah: ia bukan penjelasan tambahan melainkan syarat
            untuk membaca kolom "Dilakukan Oleh" dengan benar, dan pemilik yang
            melewatkannya akan menyimpulkan tidak ada yang bertanggung jawab. */}
        {!isLoading && (data?.unattributed_count ?? 0) > 0 && (
          <div className="flex gap-3 rounded-xl border border-warning/30 bg-warning-subtle px-4 py-3">
            <UserX size={16} className="shrink-0 mt-0.5 text-warning" />
            <p className="text-xs leading-relaxed text-warning">
              {t('shrinkUnattributedWarn', { count: data?.unattributed_count ?? 0 })}
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('shrinkColProduct')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('shrinkColOutlet')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">{t('shrinkColQty')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">{t('shrinkColValue')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">{t('shrinkColCount')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">{t('shrinkColGain')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('shrinkColActors')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('shrinkColLast')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <SkeletonRows cols={8} />
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {t('shrinkEmpty')}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => <ShrinkageRow key={`${row.product_id}-${row.outlet_id ?? 'none'}`} row={row} />)
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">{t('shrinkNote')}</p>
        </div>
      </div>
    </>
  )
}
