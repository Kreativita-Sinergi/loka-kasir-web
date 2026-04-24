import { Store, Crown, Check, Minus, Star } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRICE_LITE_MONTHLY = 39_000
const PRICE_LITE_YEARLY  = 399_000
const PRICE_PRO_MONTHLY  = 89_000
const PRICE_PRO_YEARLY   = 890_000

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(amount)
}

// ─── Types ────────────────────────────────────────────────────────────────────

type BillingCycle = 'monthly' | 'yearly'

interface PlanFeature {
  label: string
  included: boolean
}

// ─── Feature lists ────────────────────────────────────────────────────────────

const LITE_FEATURES: PlanFeature[] = [
  { label: 'Maksimal 1 Outlet',                           included: true  },
  { label: 'Fitur Kasir (POS) Standar',                   included: true  },
  { label: 'Laporan Transaksi (30 Hari Terakhir)',         included: true  },
  { label: 'Manajemen Inventori Kompleks',                included: false },
  { label: 'Fitur Shift Kasir',                           included: false },
  { label: 'E-Receipt & Notifikasi WhatsApp',             included: false },
]

const PRO_FEATURES: PlanFeature[] = [
  { label: 'Manajemen Multi-Outlet (Harga × jumlah outlet)', included: true },
  { label: 'Fitur Kasir (POS) Lengkap',                      included: true },
  { label: 'Laporan Keuangan Lengkap (Tanpa Batas Waktu)',    included: true },
  { label: 'Manajemen Inventori & Stok Varian',              included: true },
  { label: 'Sistem Shift Kasir',                             included: true },
  { label: 'Gratis E-Receipt & Notifikasi via WhatsApp',     included: true },
]

// ─── LitePlanCard ─────────────────────────────────────────────────────────────

interface LitePlanCardProps {
  billingCycle: BillingCycle
  isCurrent: boolean
  isLoading: boolean
  onUpgrade: () => void
}

export function LitePlanCard({ billingCycle, isCurrent, isLoading, onUpgrade }: LitePlanCardProps) {
  const price = billingCycle === 'yearly' ? PRICE_LITE_YEARLY : PRICE_LITE_MONTHLY
  const suffix = billingCycle === 'yearly' ? '/thn' : '/bln'

  return (
    <div className="relative rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
            <Store size={14} className="text-gray-500" />
          </div>
          <span className="font-bold text-base text-gray-700">Lite</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {formatRupiah(price)}
          <span className="text-sm font-normal text-gray-400 ml-0.5">{suffix}</span>
        </p>
        <p className="text-xs text-gray-400 mt-0.5">Untuk 1 bisnis</p>
      </div>

      {/* Features */}
      <div className="space-y-2.5 flex-1">
        {LITE_FEATURES.map((f) => (
          <div key={f.label} className={`flex items-start gap-2.5 text-sm ${f.included ? 'text-gray-700' : 'text-gray-350'}`}>
            <span className={`shrink-0 mt-0.5 ${f.included ? 'text-green-500' : 'text-gray-300'}`}>
              {f.included ? <Check size={14} /> : <Minus size={14} />}
            </span>
            <span className={f.included ? '' : 'text-gray-300 line-through'}>{f.label}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onUpgrade}
        disabled={isCurrent || isLoading}
        className={`mt-auto w-full py-2.5 text-sm font-semibold rounded-xl transition ${
          isCurrent
            ? 'bg-gray-100 text-gray-400 cursor-default'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
      >
        {isLoading ? 'Memproses...' : isCurrent ? 'Paket Aktif' : 'Pilih Lite'}
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
  const basePrice  = billingCycle === 'yearly' ? PRICE_PRO_YEARLY  : PRICE_PRO_MONTHLY
  const totalPrice = basePrice * Math.max(outletCount, 1)
  const suffix     = billingCycle === 'yearly' ? '/thn' : '/bln'

  return (
    <div className="relative rounded-2xl p-5 flex flex-col gap-4
      bg-gradient-to-br from-blue-600 to-indigo-700 text-white
      shadow-2xl shadow-blue-500/30
      ring-2 ring-blue-400 ring-offset-2">

      {/* Badge */}
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1
        px-3 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full shadow-md whitespace-nowrap">
        <Star size={10} className="fill-amber-900" />
        Rekomendasi Utama
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
            {formatRupiah(basePrice)}
          </p>
          <span className="text-blue-200 text-sm">/outlet{suffix}</span>
        </div>
        <p className="text-blue-200 text-xs mt-0.5">Harga dikalikan jumlah outlet aktif</p>
      </div>

      {/* Outlet multiplier display */}
      <div className="bg-white/15 rounded-xl px-4 py-3 border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store size={14} className="text-blue-200 shrink-0" />
            <span className="text-sm text-blue-100">Jumlah Outlet Anda saat ini</span>
          </div>
          <span className="font-bold text-white text-sm">{Math.max(outletCount, 1)} outlet</span>
        </div>
        <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between">
          <span className="text-blue-200 text-xs">Total estimasi</span>
          <span className="font-bold text-white">
            {formatRupiah(totalPrice)}{suffix}
          </span>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-2.5 flex-1">
        {PRO_FEATURES.map((f) => (
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
            : 'bg-white text-blue-700 hover:bg-blue-50 shadow-sm'
        }`}
      >
        {isLoading ? 'Memproses...' : isCurrent ? 'Paket Aktif' : 'Pilih Pro'}
      </button>
    </div>
  )
}
