import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
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
      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 mb-4 text-gray-400">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-800 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-xs mb-5">{description}</p>
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
        <p className="text-xs text-gray-400 mt-3 max-w-xs">{hint}</p>
      )}
    </div>
  )
}
