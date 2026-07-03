import type { ReactNode } from 'react'
import Lottie from 'lottie-react'
import emptyStateAnimation from '../../assets/lottie/empty_state.json'

interface EmptyStateProps {
  /** Ikon statis opsional. Tanpa ikon, animasi empty state (sama dengan
   *  aplikasi kasir mobile) yang ditampilkan. */
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  hint?: string
}

export default function EmptyState({ icon, title, description, action, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon ? (
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center border border-border mb-4 text-muted-foreground">
          {icon}
        </div>
      ) : (
        <Lottie
          animationData={emptyStateAnimation}
          loop
          className="w-36 h-36 -my-2"
          aria-hidden
        />
      )}
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-5">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
        >
          {action.icon}
          {action.label}
        </button>
      )}
      {hint && (
        <p className="text-xs text-muted-foreground mt-3 max-w-xs">{hint}</p>
      )}
    </div>
  )
}
