import { useNavigate } from 'react-router-dom'
import { Crown, Zap, Lock } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import type React from 'react'
import { t } from '@/lib/i18n'
import type { MessageKey } from '@/lib/messages'

interface Props {
  children: React.ReactNode
  /** 'pro' = butuh Pro/Trial | 'lite' = butuh Lite/Pro/Trial */
  require: 'pro' | 'lite'
  /** Nama fitur untuk ditampilkan di prompt */
  feature?: string
}

const CONFIG: Record<'pro' | 'lite', {
  icon: React.ReactNode
  badge: string
  badgeClass: string
  titleKey: MessageKey
  descKey: MessageKey
  ctaKey: MessageKey
}> = {
  pro: {
    icon: <Crown size={32} className="text-amber-500 dark:text-amber-400" />,
    badge: 'Pro',
    badgeClass: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20',
    titleKey: 'gateProTitle',
    descKey: 'gateProBody',
    ctaKey: 'gateProAction',
  },
  lite: {
    icon: <Zap size={32} className="text-blue-500 dark:text-blue-400" />,
    badge: 'Lite+',
    badgeClass: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20',
    titleKey: 'gateLiteTitle',
    descKey: 'gateLiteBody',
    ctaKey: 'gateLiteAction',
  },
}

export default function PlanGate({ children, require, feature }: Props) {
  const { isPro, isLite } = usePermissions()
  const navigate = useNavigate()

  const hasAccess = require === 'pro' ? isPro : isLite
  if (hasAccess) return <>{children}</>

  const cfg = CONFIG[require]

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="max-w-sm space-y-5">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center border border-border">
            {cfg.icon}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badgeClass}`}>
              {cfg.badge}
            </span>
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {feature ? `${feature} — ` : ''}{t(cfg.titleKey)}
          </h2>
          <p className="text-sm text-muted-foreground">{t(cfg.descKey)}</p>
        </div>

        <button
          onClick={() => navigate('/membership')}
          className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold py-3 rounded-xl transition"
        >
          <Lock size={14} />
          {t(cfg.ctaKey)}
        </button>

        <p className="text-xs text-muted-foreground">
          {t('planGateTrialNote')}
        </p>
      </div>
    </div>
  )
}
