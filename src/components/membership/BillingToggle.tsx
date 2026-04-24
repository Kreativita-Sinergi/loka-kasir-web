type BillingCycle = 'monthly' | 'yearly'

interface BillingToggleProps {
  value: BillingCycle
  onChange: (v: BillingCycle) => void
}

export default function BillingToggle({ value, onChange }: BillingToggleProps) {
  const isYearly = value === 'yearly'
  return (
    <div className="flex items-center justify-center gap-3">
      <span className={`text-sm font-medium transition-colors ${!isYearly ? 'text-gray-900' : 'text-gray-400'}`}>
        Bulanan
      </span>
      <button
        onClick={() => onChange(isYearly ? 'monthly' : 'yearly')}
        aria-label="Toggle billing cycle"
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${isYearly ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${isYearly ? 'translate-x-6' : 'translate-x-0'}`}
        />
      </button>
      <div className="flex items-center gap-1.5">
        <span className={`text-sm font-medium transition-colors ${isYearly ? 'text-gray-900' : 'text-gray-400'}`}>
          Tahunan
        </span>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
          Hemat ~15%
        </span>
      </div>
    </div>
  )
}
