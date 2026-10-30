import { t } from '@/lib/i18n'

interface Props {
  from: string
  to: string
  onChange: (range: { from: string; to: string }) => void
}

// Dua isian tanggal "Dari/Sampai" yang sama dengan Komisi Karyawan — dipisah
// supaya Laba per Nota, Ringkasan Penjualan, dan Profitabilitas tidak menulis
// ulang batas min/max yang menjaga rentang tidak terbalik.
export default function ReportDateRange({ from, to, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">{t('cashDiscFrom')}</span>
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => onChange({ from: e.target.value, to })}
          className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">{t('cashDiscTo')}</span>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => onChange({ from, to: e.target.value })}
          className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
        />
      </label>
    </div>
  )
}
