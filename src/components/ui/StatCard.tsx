import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  subtitle?: string
  loading?: boolean
  /** Kartu utama di barisnya: angkanya ikut berwarna. */
  emphasis?: boolean
}

// Sama dengan tile KPI Beranda di aplikasi (home_kpi_tiles.dart): latar warna
// 8% (16% di mode gelap) tanpa garis, ikon di lingkaran warna 16%.
const tones = {
  blue: { tile: 'bg-primary/8 dark:bg-primary/16', icon: 'bg-primary/16 text-primary', value: 'text-primary' },
  green: { tile: 'bg-success/8 dark:bg-success/16', icon: 'bg-success/16 text-success', value: 'text-success' },
  purple: { tile: 'bg-violet/8 dark:bg-violet/16', icon: 'bg-violet/16 text-violet', value: 'text-violet' },
  orange: { tile: 'bg-warning/8 dark:bg-warning/16', icon: 'bg-warning/16 text-warning', value: 'text-warning' },
  red: { tile: 'bg-destructive/8 dark:bg-destructive/16', icon: 'bg-destructive/16 text-destructive', value: 'text-destructive' },
}

export default function StatCard({ title, value, icon, color = 'blue', subtitle, loading, emphasis }: StatCardProps) {
  const tone = tones[color]
  return (
    <div className={cn('stat-card min-w-0 rounded-[14px] px-3.5 py-3', tone.tile)}>
      <div aria-hidden="true" className={cn('flex size-7.5 items-center justify-center rounded-full [&>svg]:size-4', tone.icon)}>
        {icon}
      </div>
      {loading ? <div className="mt-2.5 h-7 w-24 max-w-full animate-pulse rounded bg-foreground/8" />
        : <p className={cn('stat-value mt-2.5 font-bold tracking-tight tabular-nums', emphasis ? tone.value : 'text-foreground')} title={String(value)}>{value}</p>}
      <p className="mt-0.5 text-xs font-semibold leading-snug text-muted-foreground">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  )
}
