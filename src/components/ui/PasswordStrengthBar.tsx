import { useMemo } from 'react'

type Level = 'weak' | 'fair' | 'strong' | 'very-strong'

function evaluate(password: string): Level | null {
  if (!password) return null

  const hasUpper   = /[A-Z]/.test(password)
  const hasLower   = /[a-z]/.test(password)
  const hasDigit   = /\d/.test(password)
  const hasSpecial = /[!@#$&*~%^()_\-+=<>?/]/.test(password)

  const score = [
    password.length >= 6,
    password.length >= 8,
    hasUpper && hasLower,
    hasDigit,
    hasSpecial,
  ].filter(Boolean).length

  if (score <= 1) return 'weak'
  if (score === 2) return 'fair'
  if (score === 3) return 'strong'
  return 'very-strong'
}

const CONFIG: Record<Level, { segments: number; color: string; label: string }> = {
  'weak':        { segments: 1, color: '#EF4444', label: 'Lemah' },
  'fair':        { segments: 2, color: '#F97316', label: 'Cukup' },
  'strong':      { segments: 3, color: '#22C55E', label: 'Kuat' },
  'very-strong': { segments: 4, color: '#16A34A', label: 'Sangat Kuat' },
}

interface Props {
  password: string
}

export default function PasswordStrengthBar({ password }: Props) {
  const level = useMemo(() => evaluate(password), [password])

  if (!level) return null

  const { segments, color, label } = CONFIG[level]

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i < segments ? color : '#E5E7EB' }}
          />
        ))}
      </div>
      <p className="text-xs font-semibold text-right transition-colors duration-200" style={{ color }}>
        {label}
      </p>
    </div>
  )
}
