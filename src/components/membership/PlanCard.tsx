import { Store, Crown, Check, Minus, Star } from 'lucide-react'
import { useSubscriptionPrices } from '@/hooks/useSubscriptionPrices'
import { formatMoneyIn, minorToMajor } from '@/lib/money'
import { t } from '@/lib/i18n'

// Harga tidak lagi ditanam di sini. Dulu empat konstanta rupiah hidup di berkas
// ini, empat lagi di MembershipPage, dan keduanya harus diubah bersamaan setiap
// kali harga berubah — sementara tidak satu pun bisa menampilkan yen atau ringgit.
// Sekarang keduanya membaca /subscription-prices lewat useSubscriptionPrices.

// ─── Types ────────────────────────────────────────────────────────────────────

type BillingCycle = 'monthly' | 'yearly'

interface PlanFeature {
  label: string
  included: boolean
}

// ─── Feature lists ────────────────────────────────────────────────────────────

// Fungsi, bukan konstanta: isinya memanggil t(), dan konstanta modul
// dievaluasi sekali saat berkas dimuat — bahasanya akan terkunci pada yang
// kebetulan aktif saat itu dan tidak ikut berubah saat pengguna menggantinya.
const liteFeatures = (): PlanFeature[] => [
  { label: t('planFeatOneOutlet'),                                included: true  },
  { label: t('planFeatRegisterApp'), included: true },
  { label: t('planFeatCustomerStaff'),                  included: true  },
  { label: t('planFeatTxReports'),             included: true  },
  { label: t('planFeatAdvStock'), included: false },
  { label: t('planFeatAnalytics'),            included: false },
]

// Fungsi, bukan konstanta: isinya memanggil t(), dan konstanta modul
// dievaluasi sekali saat berkas dimuat — bahasanya akan terkunci pada yang
// kebetulan aktif saat itu dan tidak ikut berubah saat pengguna menggantinya.
const proFeatures = (): PlanFeature[] => [
  { label: t('planFeatMultiOutlet'),       included: true },
  { label: t('planFeatAllLitePlus'),     included: true },
  { label: t('planFeatAdvStockPro'), included: true },
  { label: t('planFeatFullAnalytics'),      included: true },
  { label: t('planFeatCostAndLoyalty'), included: true },
  { label: t('planFeatFreeDigitalReceipt'),                              included: true },
]

// ─── LitePlanCard ─────────────────────────────────────────────────────────────

interface LitePlanCardProps {
  billingCycle: BillingCycle
  isCurrent: boolean
  isLoading: boolean
  onUpgrade: () => void
}

export function LitePlanCard({ billingCycle, isCurrent, isLoading, onUpgrade }: LitePlanCardProps) {
  const prices = useSubscriptionPrices()
  const plan = billingCycle === 'yearly' ? 'lite-yearly' : 'lite'
  const price = prices.displayOf(plan)
  const suffix = billingCycle === 'yearly' ? '/thn' : '/bln'

  return (
    <div className="relative rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 bg-muted rounded-lg flex items-center justify-center">
            <Store size={14} className="text-muted-foreground" />
          </div>
          <span className="font-bold text-base text-foreground">Lite</span>
        </div>
        <p className="text-2xl font-bold text-foreground">
          {price}
          <span className="text-sm font-normal text-muted-foreground ml-0.5">{suffix}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{t('planForOneBusiness')}</p>
      </div>

      {/* Features */}
      <div className="space-y-2.5 flex-1">
        {liteFeatures().map((f) => (
          <div key={f.label} className={`flex items-start gap-2.5 text-sm ${f.included ? 'text-foreground' : 'text-muted-foreground'}`}>
            <span className={`shrink-0 mt-0.5 ${f.included ? 'text-green-500 dark:text-green-400' : 'text-muted-foreground'}`}>
              {f.included ? <Check size={14} /> : <Minus size={14} />}
            </span>
            <span className={f.included ? '' : 'text-muted-foreground line-through'}>{f.label}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onUpgrade}
        disabled={isCurrent || isLoading}
        className={`mt-auto w-full py-2.5 text-sm font-semibold rounded-xl transition ${
          isCurrent
            ? 'bg-muted text-muted-foreground cursor-default'
            : 'bg-muted hover:bg-muted text-foreground'
        }`}
      >
        {isLoading ? 'Memproses...' : isCurrent ? t('planActive') : t('planChooseLite')}
      </button>
    </div>
  )
}

// ─── ProPlanCard ──────────────────────────────────────────────────────────────

interface ProPlanCardProps {
  billingCycle: BillingCycle
  outletCount: number
  isCurrent: boolean
  isLoading: boolean
  onUpgrade: () => void
}

export function ProPlanCard({ billingCycle, outletCount, isCurrent, isLoading, onUpgrade }: ProPlanCardProps) {
  const prices = useSubscriptionPrices()
  const plan = billingCycle === 'yearly' ? 'pro-yearly' : 'pro'
  const price = prices.priceOf(plan)
  const suffix = billingCycle === 'yearly' ? '/thn' : '/bln'

  // Perkalian dilakukan pada satuan TERKECIL, bukan pada nilai tampil, supaya
  // tidak ada pembulatan yang menumpuk: 3 × ¥1.480 harus tepat ¥4.440.
  const basePrice = price ? formatMoneyIn(minorToMajor(price.display_amount, price.display_currency), price.display_currency) : ''
  const totalPrice = price
    ? formatMoneyIn(
        minorToMajor(price.display_amount * Math.max(outletCount, 1), price.display_currency),
        price.display_currency,
      )
    : ''

  return (
    <div className="relative rounded-2xl p-5 flex flex-col gap-4
      bg-gradient-to-br from-blue-600 to-indigo-700 text-white
      shadow-2xl shadow-blue-500/30
      ring-2 ring-blue-400 ring-offset-2">

      {/* Badge */}
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1
        px-3 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full shadow-md whitespace-nowrap">
        <Star size={10} className="fill-amber-900" />
        {t('planRecommended')}
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            <Crown size={14} className="text-white" />
          </div>
          <span className="font-bold text-base text-white">Pro</span>
        </div>
        <div className="flex items-baseline gap-1 flex-wrap">
          <p className="text-2xl font-bold">
            {basePrice}
          </p>
          <span className="text-blue-200 text-sm">/outlet{suffix}</span>
        </div>
        <p className="text-blue-200 text-xs mt-0.5">{t('planPriceTimesOutlets')}</p>
      </div>

      {/* Outlet multiplier display */}
      <div className="bg-white/15 rounded-xl px-4 py-3 border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store size={14} className="text-blue-200 shrink-0" />
            <span className="text-sm text-blue-100">{t('planYourOutletCount')}</span>
          </div>
          <span className="font-bold text-white text-sm">{Math.max(outletCount, 1)} outlet</span>
        </div>
        <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between">
          <span className="text-blue-200 text-xs">{t('planEstimatedTotal')}</span>
          <span className="font-bold text-white">
            {totalPrice}{suffix}
          </span>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-2.5 flex-1">
        {proFeatures().map((f) => (
          <div key={f.label} className="flex items-start gap-2.5 text-sm text-white">
            <span className="shrink-0 mt-0.5 text-blue-200">
              <Check size={14} />
            </span>
            <span>{f.label}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onUpgrade}
        disabled={isCurrent || isLoading}
        className={`mt-auto w-full py-2.5 text-sm font-bold rounded-xl transition ${
          isCurrent
            ? 'bg-white/20 text-white/60 cursor-default'
            : 'bg-card text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-500/10 shadow-sm'
        }`}
      >
        {isLoading ? 'Memproses...' : isCurrent ? t('planActive') : t('planChoosePro')}
      </button>
    </div>
  )
}
