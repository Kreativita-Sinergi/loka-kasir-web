import { Zap, Crown, XCircle } from 'lucide-react'
import { deriveStatus } from '@/store/subscriptionStore'
import { formatDate } from '@/lib/utils'
import type { Membership } from '@/types'
import { t } from '@/lib/i18n'

interface CurrentPlanBannerProps {
  membership: Membership | null | undefined
}

export default function CurrentPlanBanner({ membership }: CurrentPlanBannerProps) {
  const status = deriveStatus(membership)
  const days   = membership?.days_remaining ?? membership?.days_left ?? 0

  if (status === 'TRIAL') {
    return (
      <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-amber-200" />
              <span className="text-amber-100 text-sm font-semibold uppercase tracking-wide">{t('planTrialBadge')}</span>
            </div>
            <p className="text-2xl font-bold">
              {days > 0 ? t('planDaysRemaining', { days }) : t('planEndsToday')}
            </p>
            <p className="text-amber-100 text-sm mt-1">
              {t('planTrialBody')}
            </p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Zap size={20} />
          </div>
        </div>
      </div>
    )
  }

  // Berdasarkan status, bukan tier mentah: Pro yang sudah lewat end_date
  // diturunkan deriveStatus ke EXPIRED dan tidak boleh tampil "Aktif".
  if (status === 'ACTIVE') {
    return (
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown size={16} className="text-blue-200" />
              <span className="text-blue-100 text-sm font-semibold uppercase tracking-wide">{t('planProName')}</span>
            </div>
            <p className="text-2xl font-bold">{t('statusActive')}</p>
            <p className="text-blue-100 text-sm mt-1">
              {membership?.end_date ? t('planValidUntil', { date: formatDate(membership.end_date) }) : t('planProAllFeatures')}
            </p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Crown size={20} />
          </div>
        </div>
      </div>
    )
  }

  // EXPIRED: trial/langganan berakhir — usaha terkunci dalam mode lihat saja.
  return (
    <div className="rounded-2xl p-5 shadow-sm border bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={16} className="text-red-500 dark:text-red-400" />
            <span className="text-sm font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
              {t('planExpiredName')}
            </span>
          </div>
          <p className="text-lg font-bold text-red-700 dark:text-red-400">
            {t('planLimitedAccess')}
          </p>
          <p className="text-sm mt-1 text-red-500 dark:text-red-400">
            {membership?.end_date ? `${t('planEndedOn', { date: formatDate(membership.end_date) })} ` : ''}{t('planExpiredBody')}
          </p>
        </div>
      </div>
    </div>
  )
}
