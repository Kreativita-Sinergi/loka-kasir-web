import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  subtitle?: string
  loading?: boolean
  emphasis?: boolean
}

const iconColors = {
  blue: 'bg-primary-subtle text-primary',
  green: 'bg-success-subtle text-success',
  purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300',
  orange: 'bg-warning-subtle text-warning',
  red: 'bg-destructive-subtle text-destructive',
}

export default function StatCard({ title, value, icon, color = 'blue', subtitle, loading, emphasis }: StatCardProps) {
  return (
    <Card className={cn('stat-card shadow-none', emphasis && 'stat-card-emphasis')}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-xs sm:text-sm text-muted-foreground font-medium leading-snug">{title}</p>
          <div aria-hidden="true" className={cn('w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 [&>svg]:size-4', iconColors[color])}>
            {icon}
          </div>
        </div>
        {loading ? <div className="h-7 max-w-full w-24 bg-muted rounded animate-pulse mt-3" />
          : <p className="stat-value font-semibold tracking-tight tabular-nums text-foreground mt-3" title={String(value)}>{value}</p>}
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
