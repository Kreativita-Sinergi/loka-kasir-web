import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'green' | 'red' | 'blue' | 'yellow' | 'gray' | 'purple'
  children: React.ReactNode
  className?: string
}

const variants = {
  green: 'bg-green-50 text-green-700 border-green-100',
  red: 'bg-red-50 text-red-700 border-red-100',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
}

export default function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', variants[variant], className)}>
      {children}
    </span>
  )
}
