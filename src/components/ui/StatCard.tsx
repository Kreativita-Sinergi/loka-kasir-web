import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  subtitle?: string
  loading?: boolean
}

const iconColors = {
  blue: 'bg-primary-subtle text-primary',
  green: 'bg-success-subtle text-success',
  purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300',
  orange: 'bg-warning-subtle text-warning',
  red: 'bg-destructive-subtle text-destructive',
}

export default function StatCard({ title, value, icon, color = 'blue', subtitle, loading }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            {loading ? (
              <div className="h-8 w-24 bg-muted rounded-lg animate-pulse mt-2" />
            ) : (
              <p className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums text-foreground mt-1 break-words">{value}</p>
            )}
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconColors[color])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
