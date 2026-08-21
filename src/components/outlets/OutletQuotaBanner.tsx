import { useNavigate } from 'react-router-dom'
import { Crown } from 'lucide-react'
import { t } from '@/lib/i18n'

interface OutletQuotaBannerProps {
  membershipTier?: string
  totalOutlets: number
}

// Selama masa gratis 30 hari, multi-outlet dibuka (maks. TRIAL_OUTLET_LIMIT
// outlet) agar bisnis multi-cabang bisa mencoba fitur utamanya.
// Harus sinkron dengan TrialOutletLimit di loka-kasir-service.
const TRIAL_OUTLET_LIMIT = 5

function isQuotaFull(tier: string | undefined, total: number): boolean {
  if (!tier) return false
	if (tier === 'trial') return total >= TRIAL_OUTLET_LIMIT
  return false
}

export default function OutletQuotaBanner({ membershipTier, totalOutlets }: OutletQuotaBannerProps) {
  const navigate = useNavigate()

  if (!isQuotaFull(membershipTier, totalOutlets)) return null

  return (
    <div className="mb-4 flex items-start gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3">
      <Crown size={18} className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t('outletQuotaReached')}</p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
          {t('outletQuotaTrial', { limit: TRIAL_OUTLET_LIMIT })}
          {t('outletQuotaUpgrade')}
        </p>
      </div>
      <button
        onClick={() => navigate('/membership')}
        className="shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition"
      >
        {t('actionUpgrade')}
      </button>
    </div>
  )
}
