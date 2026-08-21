import { Check, Crown, Star } from 'lucide-react'
import { useSubscriptionPrices } from '@/hooks/useSubscriptionPrices'
import { formatMoneyIn, minorToMajor } from '@/lib/money'
import { t } from '@/lib/i18n'
import type { BillingCycle } from './BillingToggle'

const proFeatures = () => [
  t('planFeatRegisterApp'),
  t('planFeatCustomerStaff'),
  t('planFeatTxReports'),
  t('planFeatMultiOutlet'),
  t('planFeatAdvStockPro'),
  t('planFeatFullAnalytics'),
  t('planFeatCostAndLoyalty'),
  t('planFeatFreeDigitalReceipt'),
]

interface ProPlanCardProps {
  billingCycle: BillingCycle
  isCurrent: boolean
  isLoading: boolean
  onUpgrade: () => void
}

export function ProPlanCard({ billingCycle, isCurrent, isLoading, onUpgrade }: ProPlanCardProps) {
  const prices = useSubscriptionPrices()
  const plan = billingCycle === 'three-year'
    ? 'pro-3year'
    : billingCycle === 'yearly'
      ? 'pro-yearly'
      : 'pro'
  const price = prices.priceOf(plan)
  const suffix = billingCycle === 'three-year' ? '/3 thn' : billingCycle === 'yearly' ? '/thn' : '/bln'
  const displayPrice = price
    ? formatMoneyIn(minorToMajor(price.display_amount, price.display_currency), price.display_currency)
    : ''

  return (
    <div className="relative rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-6 text-white shadow-2xl shadow-blue-500/25 ring-2 ring-blue-400 ring-offset-2 md:p-8">
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full shadow-md whitespace-nowrap">
        <Star size={10} className="fill-amber-900" />
        {t('planRecommended')}
      </div>

      <div className="grid gap-7 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-8">
        <div className="flex flex-col md:border-r md:border-white/20 md:pr-8">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/15">
              <Crown size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">Pro</span>
          </div>

          <div className="flex flex-wrap items-baseline gap-1.5">
            <p className="text-3xl font-bold tracking-tight md:text-4xl">{displayPrice}</p>
            <span className="text-sm text-blue-200">{suffix}</span>
          </div>
          <p className="mt-1 text-sm text-blue-200">{t('planForOneBusiness')}</p>
          <p className="mt-4 text-sm leading-relaxed text-blue-100">
            {t('planInfrastructureIncluded')}
          </p>

          <button
            onClick={onUpgrade}
            disabled={isCurrent || isLoading}
            className={`mt-6 w-full rounded-xl py-3 text-sm font-bold transition md:mt-auto ${
              isCurrent
                ? 'bg-white/20 text-white/60 cursor-default'
                : 'bg-white text-blue-700 hover:bg-blue-50 shadow-sm'
            }`}
          >
            {isLoading ? 'Memproses...' : isCurrent ? t('planActive') : t('planChoosePro')}
          </button>
        </div>

        <div className="grid content-start gap-x-6 gap-y-3 sm:grid-cols-2">
          {proFeatures().map((feature) => (
            <div key={feature} className="flex items-start gap-2.5 text-sm leading-relaxed text-white">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-blue-100">
                <Check size={13} strokeWidth={2.5} />
              </span>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
