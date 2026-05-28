import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        // shadcn-style variants
        default:     'border-transparent bg-primary text-primary-foreground',
        secondary:   'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-destructive/20 bg-destructive-subtle text-destructive',
        outline:     'border-border bg-muted text-muted-foreground',
        // semantic aliases used by existing pages
        green:   'border-success/20 bg-success-subtle text-success',
        red:     'border-destructive/20 bg-destructive-subtle text-destructive',
        blue:    'border-primary/20 bg-primary-subtle text-primary',
        yellow:  'border-warning/20 bg-warning-subtle text-warning',
        gray:    'border-border bg-muted text-muted-foreground',
        purple:  'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/40 dark:bg-purple-950/40 dark:text-purple-300',
        success: 'border-success/20 bg-success-subtle text-success',
        warning: 'border-warning/20 bg-warning-subtle text-warning',
      },
    },
    defaultVariants: { variant: 'gray' },
  }
)

export type BadgeVariant = VariantProps<typeof badgeVariants>['variant']

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  )
)
Badge.displayName = 'Badge'

export { Badge, badgeVariants }
export default Badge
