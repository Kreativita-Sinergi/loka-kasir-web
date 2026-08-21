import { Check } from 'lucide-react'
import { t } from '@/lib/i18n'

export type BillingCycle = 'monthly' | 'yearly' | 'three-year'

interface BillingToggleProps {
  value: BillingCycle
  onChange: (v: BillingCycle) => void
}

export default function BillingToggle({ value, onChange }: BillingToggleProps) {
  return (
    <div
      className="mx-auto grid w-full max-w-3xl gap-2 sm:grid-cols-3"
      role="group"
      aria-label={t('planBillingToggle')}
    >
      {([
        ['monthly', t('planMonthly'), t('planMonthlyPaymentHint'), null],
        ['yearly', t('planYearly'), t('planYearlyPaymentHint'), t('planSaveFifteen')],
        ['three-year', t('planThreeYears'), t('planThreeYearPaymentHint'), t('planBestValue')],
      ] as const).map(([cycle, label, hint, badge]) => {
        const selected = value === cycle
        return (
        <button
          key={cycle}
          type="button"
          onClick={() => onChange(cycle)}
          aria-pressed={selected}
          className={`relative flex min-h-24 items-start gap-3 rounded-2xl border-2 p-4 text-left transition ${
            selected
              ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'border-border bg-card text-foreground hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-500/5'
          }`}
        >
          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            selected ? 'border-white bg-white text-blue-600' : 'border-muted-foreground/40 text-transparent'
          }`}>
            <Check size={12} strokeWidth={3} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold">{label}</span>
              {badge && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                  {badge}
                </span>
              )}
            </span>
            <span className={`mt-1 block text-xs font-medium leading-relaxed ${
              selected ? 'text-blue-100' : 'text-muted-foreground'
            }`}>
              {hint}
            </span>
          </span>
        </button>
        )
      })}
    </div>
  )
}
