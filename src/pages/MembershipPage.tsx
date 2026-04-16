import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Store, CheckCircle2, AlertTriangle, Clock, XCircle,
  PlusCircle, RefreshCw, ChevronRight, Zap, Crown,
  MessageCircle, Check, Star, Minus, Lock, Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import PaymentOrderModal from '@/components/ui/PaymentOrderModal'
import { getMyOutlets, createOutlet, deleteOutlet } from '@/api/outlets'
import { getActiveMembership } from '@/api/membership'
import { createPaymentOrder } from '@/api/payment'
import { formatDate, getErrorMessage } from '@/lib/utils'
import { deriveStatus } from '@/store/subscriptionStore'
import { useAuthStore } from '@/store/authStore'
import type { Outlet, Membership, PaymentOrder } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRICE_LITE_MONTHLY       = 39_000
const PRICE_LITE_YEARLY        = 399_000
const PRICE_PRO_MONTHLY        = 89_000
const PRICE_PRO_YEARLY         = 890_000
const PRICE_PER_OUTLET_MONTHLY = 49_000
const PRICE_PER_OUTLET_YEARLY  = 490_000

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(amount)
}

// ─── Types ────────────────────────────────────────────────────────────────────

type BillingCycle = 'monthly' | 'yearly'
type PlanType     = 'monthly' | 'yearly'

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

// ─── Outlet helpers ───────────────────────────────────────────────────────────

function getOutletStatus(outlet: Outlet) {
  const sub = outlet.subscription_status
  if (sub === 'active')  return { color: 'text-green-700', bg: 'bg-green-50 border-green-200',  icon: <CheckCircle2 size={14} className="text-green-600" />,  label: 'Aktif' }
  if (sub === 'trial')   return { color: 'text-blue-700',  bg: 'bg-blue-50 border-blue-200',    icon: <Clock size={14} className="text-blue-600" />,          label: 'Trial' }
  if (sub === 'expired') return { color: 'text-red-700',   bg: 'bg-red-50 border-red-200',      icon: <XCircle size={14} className="text-red-600" />,         label: 'Kedaluwarsa' }
  return                        { color: 'text-gray-600',  bg: 'bg-gray-50 border-gray-200',    icon: <XCircle size={14} className="text-gray-400" />,        label: sub }
}

function needsRenewal(outlet: Outlet) {
  return outlet.subscription_status === 'expired' || outlet.subscription_status === 'inactive'
}

// ─── BillingToggle ────────────────────────────────────────────────────────────

function BillingToggle({ value, onChange }: { value: BillingCycle; onChange: (v: BillingCycle) => void }) {
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

// ─── CurrentPlanBanner ────────────────────────────────────────────────────────

function CurrentPlanBanner({ membership }: { membership: Membership | null | undefined }) {
  const status = deriveStatus(membership)
  const tier   = membership?.tier ?? 'lite'
  const days   = membership?.days_remaining ?? 0

  if (status === 'TRIAL') {
    return (
      <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-amber-200" />
              <span className="text-amber-100 text-sm font-semibold uppercase tracking-wide">Free Trial</span>
            </div>
            <p className="text-2xl font-bold">
              {days > 0 ? `${days} hari tersisa` : 'Berakhir hari ini'}
            </p>
            <p className="text-amber-100 text-sm mt-1">
              Kamu menikmati semua fitur <strong>PRO</strong> secara gratis.
              Pilih paket sebelum trial berakhir agar fitur tetap aktif.
            </p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Zap size={20} />
          </div>
        </div>
      </div>
    )
  }

  if (tier === 'pro') {
    return (
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown size={16} className="text-blue-200" />
              <span className="text-blue-100 text-sm font-semibold uppercase tracking-wide">Paket Pro</span>
            </div>
            <p className="text-2xl font-bold">Aktif</p>
            <p className="text-blue-100 text-sm mt-1">
              {membership?.end_date ? `Berlaku s/d ${formatDate(membership.end_date)}` : 'Semua fitur Pro tersedia.'}
            </p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Crown size={20} />
          </div>
        </div>
      </div>
    )
  }

  const isExpired = status === 'EXPIRED'
  return (
    <div className={`rounded-2xl p-5 shadow-sm border ${isExpired ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isExpired
              ? <XCircle size={16} className="text-red-500" />
              : <CheckCircle2 size={16} className="text-gray-400" />
            }
            <span className={`text-sm font-semibold uppercase tracking-wide ${isExpired ? 'text-red-600' : 'text-gray-500'}`}>
              {isExpired ? 'Langganan Kadaluarsa' : 'Paket Lite'}
            </span>
          </div>
          <p className={`text-lg font-bold ${isExpired ? 'text-red-700' : 'text-gray-800'}`}>
            {isExpired ? 'Akses terbatas' : 'Fitur dasar aktif'}
          </p>
          <p className={`text-sm mt-1 ${isExpired ? 'text-red-500' : 'text-gray-500'}`}>
            {isExpired
              ? 'Langganan kamu telah berakhir. Pilih paket untuk melanjutkan.'
              : 'Upgrade ke Pro untuk kirim struk & laporan via WhatsApp.'
            }
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── LitePlanCard ─────────────────────────────────────────────────────────────

interface LitePlanCardProps {
  billingCycle: BillingCycle
  isCurrent: boolean
  isLoading: boolean
  onUpgrade: () => void
}

function LitePlanCard({ billingCycle, isCurrent, isLoading, onUpgrade }: LitePlanCardProps) {
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

function ProPlanCard({ billingCycle, outletCount, isCurrent, isLoading, onUpgrade }: ProPlanCardProps) {
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MembershipPage() {
  const qc = useQueryClient()
  const businessId = useAuthStore((s) => s.user?.business?.id ?? '')
  const userEmail  = useAuthStore((s) => s.user?.email ?? '')

  // Business-tier billing cycle toggle
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')

  // Outlet-level subscription state (confirm before creating order)
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null)
  const [selectedPlan, setSelectedPlan]     = useState<PlanType>('monthly')
  const [confirmModal, setConfirmModal]     = useState(false)

  // Payment order modal
  const [paymentOrder, setPaymentOrder]       = useState<PaymentOrder | null>(null)
  const [paymentOrderOpen, setPaymentOrderOpen] = useState(false)
  const [paymentTitle, setPaymentTitle]       = useState('Selesaikan Pembayaran')

  // Business-level tier upgrade state (for loading indicator)
  const [upgradeTarget, setUpgradeTarget] = useState<'lite' | 'pro' | null>(null)

  // Tambah outlet baru (Pro only)
  const [addOutletOpen, setAddOutletOpen]         = useState(false)
  const [newOutletName, setNewOutletName]         = useState('')
  const [newOutletBilling, setNewOutletBilling]   = useState<PlanType>('monthly')
  // ID outlet yang baru dibuat dan sedang menunggu konfirmasi pembayaran.
  // Jika pembayaran gagal/dibatalkan, outlet ini akan dihapus secara otomatis.
  const [pendingNewOutletId, setPendingNewOutletId] = useState<string | null>(null)

  const deleteOutletMut = useMutation({
    mutationFn: (id: string) => deleteOutlet(id),
    onSettled: () => qc.invalidateQueries({ queryKey: ['my-outlets'] }),
  })

  const createOutletMut = useMutation({
    mutationFn: () => createOutlet({
      business_id: businessId,
      name: newOutletName.trim(),
      is_active: true,
    }),
    onSuccess: (res) => {
      // Jangan invalidate my-outlets dulu — outlet ini belum lunas.
      // List akan di-refresh setelah pembayaran berhasil (via invalidateKeys)
      // atau setelah outlet dihapus jika pembayaran gagal.
      setAddOutletOpen(false)
      setNewOutletName('')
      const newOutlet = res.data.data
      setPendingNewOutletId(newOutlet.id)
      openOutletConfirm(newOutlet, newOutletBilling)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { data: outletData, isLoading: outletLoading } = useQuery({
    queryKey: ['my-outlets'],
    queryFn: () => getMyOutlets(),
  })

  const { data: membershipData, isLoading: membershipLoading } = useQuery({
    queryKey: ['membership'],
    queryFn: () => getActiveMembership(),
  })

  const outlets: Outlet[]              = outletData?.data?.data ?? []
  const membership: Membership | null  = membershipData?.data?.data ?? null

  // Outlet pertama (created_at paling awal) selalu gratis — include dalam semua paket.
  // Hanya outlet ke-2+ yang butuh add-on berbayar.
  const sortedOutlets  = [...outlets].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const firstOutletId  = sortedOutlets[0]?.id ?? null
  const addOnOutlets   = sortedOutlets.slice(1)

  const currentTier  = membership?.tier ?? 'lite'
  const activeCount  = outlets.filter((o) => o.subscription_status === 'active' || o.subscription_status === 'trial').length
  // Hanya hitung expired untuk outlet add-on (ke-2+), bukan outlet pertama.
  const expiredCount = addOnOutlets.filter((o) => needsRenewal(o)).length

  // ── Buat payment order (dipakai untuk membership & outlet add-on) ──────────
  const createOrderMut = useMutation({
    mutationFn: createPaymentOrder,
    onSuccess: (res, vars) => {
      setPaymentOrder(res.data.data)
      setPaymentOrderOpen(true)
      // Tutup modal konfirmasi outlet jika ada
      setConfirmModal(false)
      setSelectedOutlet(null)
      setUpgradeTarget(null)
      // Tentukan judul modal berdasarkan tipe
      if (vars.type === 'membership_upgrade') {
        const planLabel = vars.plan?.includes('pro') ? 'Pro' : 'Lite'
        setPaymentTitle(`Upgrade ke Paket ${planLabel}`)
      } else {
        setPaymentTitle('Aktifkan Langganan Outlet')
      }
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
      setUpgradeTarget(null)
    },
  })

  const openOutletConfirm = (outlet: Outlet, plan: PlanType) => {
    setSelectedOutlet(outlet)
    setSelectedPlan(plan)
    setConfirmModal(true)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Langganan" subtitle="Kelola paket dan langganan bisnis Anda" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── Current plan status ────────────────────────────────────────── */}
        {membershipLoading
          ? <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          : <CurrentPlanBanner membership={membership} />
        }

        {/* ── Plan comparison ────────────────────────────────────────────── */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">Pilih Paket</h3>
          <p className="text-sm text-gray-500 mb-4">
            Satu harga untuk seluruh bisnis Anda. Paket Pro dihitung berdasarkan jumlah outlet.
          </p>

          {/* Billing cycle toggle */}
          <div className="mb-6">
            <BillingToggle value={billingCycle} onChange={setBillingCycle} />
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <LitePlanCard
              billingCycle={billingCycle}
              isCurrent={currentTier === 'lite'}
              isLoading={upgradeTarget === 'lite' && createOrderMut.isPending}
              onUpgrade={() => {
                setUpgradeTarget('lite')
                createOrderMut.mutate({
                  business_id: businessId,
                  type: 'membership_upgrade',
                  plan: billingCycle === 'yearly' ? 'lite-yearly' : 'lite',
                  email: userEmail,
                })
              }}
            />
            <ProPlanCard
              billingCycle={billingCycle}
              outletCount={outlets.length}
              isCurrent={currentTier === 'pro'}
              isLoading={upgradeTarget === 'pro' && createOrderMut.isPending}
              onUpgrade={() => {
                setUpgradeTarget('pro')
                createOrderMut.mutate({
                  business_id: businessId,
                  type: 'membership_upgrade',
                  plan: billingCycle === 'yearly' ? 'pro-yearly' : 'pro',
                  email: userEmail,
                })
              }}
            />
          </div>
        </div>

        {/* ── WA upsell highlight ────────────────────────────────────────── */}
        {currentTier !== 'pro' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
            <MessageCircle size={20} className="text-blue-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800">
                Kirim Struk & Laporan via WhatsApp — eksklusif Paket Pro
              </p>
              <p className="text-sm text-blue-600 mt-0.5">
                Setelah transaksi selesai, kirim struk digital langsung ke WhatsApp pelanggan.
                Buat pengalaman belanja lebih profesional dan berkesan.
              </p>
            </div>
          </div>
        )}

        {/* ── Outlet subscription section ────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900">Langganan Outlet</h3>
            {currentTier === 'pro' && (
              <button
                onClick={() => setAddOutletOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
              >
                <Plus size={13} />
                Tambah Outlet
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Biaya terpisah per outlet —{' '}
            <span className="font-semibold text-gray-700">{formatRupiah(PRICE_PER_OUTLET_MONTHLY)}/outlet/bulan</span>.
            Makin banyak cabang, makin hemat per outletnya.
          </p>

          {/* Pro gate banner untuk Lite users */}
          {currentTier !== 'pro' && (
            <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <Lock size={15} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-900">
                  Aktivasi outlet memerlukan Paket Pro
                </p>
                <p className="text-sm text-blue-700 mt-0.5">
                  Dengan Paket Pro, cabang berikutnya hanya {formatRupiah(PRICE_PER_OUTLET_MONTHLY)}/bulan —
                  jauh lebih murah dari mulai ulang di aplikasi lain.
                </p>
              </div>
            </div>
          )}

          {/* Summary pill row */}
          <div className="flex gap-3 mb-4">
            <div className="px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-center">
              <p className="font-bold text-gray-900 text-lg leading-none">{outlets.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Total Outlet</p>
            </div>
            <div className="px-4 py-2.5 bg-green-50 border border-green-100 rounded-xl text-center">
              <p className="font-bold text-green-700 text-lg leading-none">{activeCount}</p>
              <p className="text-xs text-green-500 mt-0.5">Aktif</p>
            </div>
            {expiredCount > 0 && (
              <div className="px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-center">
                <p className="font-bold text-red-600 text-lg leading-none">{expiredCount}</p>
                <p className="text-xs text-red-400 mt-0.5">Perlu Diperbarui</p>
              </div>
            )}
          </div>

          {expiredCount > 0 && currentTier === 'pro' && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">
                {expiredCount} outlet kedaluwarsa — tidak bisa menerima transaksi baru.
              </p>
            </div>
          )}

          {outletLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : outlets.length === 0 ? (
            <div className="text-center py-8 text-gray-400 bg-white border border-gray-100 rounded-2xl">
              <Store size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Belum ada outlet terdaftar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedOutlets.map((outlet) => {
                const status         = getOutletStatus(outlet)
                const isPro          = currentTier === 'pro'
                const canActivate    = isPro
                const isFirstOutlet  = outlet.id === firstOutletId
                return (
                  <div
                    key={outlet.id}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                      isFirstOutlet ? 'bg-green-50 border-green-200' :
                      canActivate ? status.bg : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                        <Store size={13} className={canActivate || isFirstOutlet ? 'text-gray-500' : 'text-gray-300'} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-sm truncate text-gray-900">{outlet.name}</p>
                          {isFirstOutlet && (
                            <span className="shrink-0 text-xs bg-green-100 text-green-700 font-semibold px-1.5 py-0.5 rounded-full">
                              Termasuk Paket
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isFirstOutlet ? (
                            <>
                              {status.icon}
                              <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                              {outlet.subscription_end_date && (
                                <span className="text-xs text-gray-400">
                                  · s/d {formatDate(outlet.subscription_end_date)}
                                </span>
                              )}
                            </>
                          ) : canActivate ? (
                            <>
                              {status.icon}
                              <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                              {outlet.subscription_end_date && !needsRenewal(outlet) && (
                                <span className="text-xs text-gray-400">
                                  · s/d {formatDate(outlet.subscription_end_date)}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <Lock size={11} className="text-gray-300" />
                              <span className="text-xs text-gray-400">Perlu Paket Pro</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-3">
                      {isFirstOutlet ? (
                        // Outlet pertama: diperpanjang otomatis saat membership diperbarui.
                        <div className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-lg cursor-default select-none">
                          Otomatis
                        </div>
                      ) : canActivate ? (
                        needsRenewal(outlet) ? (
                          <>
                            <button
                              onClick={() => openOutletConfirm(outlet, 'monthly')}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1"
                            >
                              <RefreshCw size={11} /> Bulanan
                            </button>
                            <button
                              onClick={() => openOutletConfirm(outlet, 'yearly')}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition"
                            >
                              Tahunan
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openOutletConfirm(outlet, 'monthly')}
                            className="px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-white text-xs font-medium rounded-lg transition flex items-center gap-1"
                          >
                            <PlusCircle size={11} /> Perpanjang
                          </button>
                        )
                      ) : (
                        <div className="px-3 py-1.5 bg-gray-100 text-gray-400 text-xs font-medium rounded-lg flex items-center gap-1 cursor-default select-none">
                          <Lock size={11} /> Upgrade Pro
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Info note ──────────────────────────────────────────────────── */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-sm text-amber-700 font-medium">Cara kerja harga</p>
          <p className="text-sm text-amber-600 mt-1">
            Paket Pro ({formatRupiah(PRICE_PRO_MONTHLY)}/bln) berlaku untuk seluruh bisnis dan
            sudah <span className="font-semibold">include 1 outlet pertama gratis</span> — diperpanjang
            otomatis setiap kali membership diperbarui. Outlet ke-2 dan seterusnya diaktifkan
            secara terpisah dengan biaya add-on{' '}
            <span className="font-semibold">{formatRupiah(PRICE_PER_OUTLET_MONTHLY)}/outlet/bulan</span>.
          </p>
        </div>
      </div>

      {/* ── Payment Order Modal ───────────────────────────────────────────── */}
      <PaymentOrderModal
        open={paymentOrderOpen}
        order={paymentOrder}
        title={paymentTitle}
        onClose={() => { setPaymentOrderOpen(false); setPaymentOrder(null); setPendingNewOutletId(null) }}
        invalidateKeys={[['membership'], ['my-outlets']]}
        onPaymentFailed={() => {
          // Rollback: hapus outlet yang baru dibuat jika pembayaran tidak selesai
          if (pendingNewOutletId) {
            deleteOutletMut.mutate(pendingNewOutletId)
            setPendingNewOutletId(null)
          }
        }}
      />

      {/* ── Add Outlet Modal ─────────────────────────────────────────────── */}
      <Modal
        open={addOutletOpen}
        onClose={() => { setAddOutletOpen(false); setNewOutletName(''); setNewOutletBilling('monthly') }}
        title="Tambah Outlet Baru"
        size="sm"
      >
        <div className="space-y-4">
          {/* Nama outlet */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Outlet <span className="text-red-400">*</span>
            </label>
            <input
              value={newOutletName}
              onChange={(e) => setNewOutletName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newOutletName.trim()) createOutletMut.mutate()
              }}
              placeholder="Contoh: Cabang Menteng"
              autoFocus
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Pilihan siklus billing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Siklus Langganan
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['monthly', 'yearly'] as PlanType[]).map((cycle) => {
                const price  = cycle === 'yearly' ? PRICE_PER_OUTLET_YEARLY : PRICE_PER_OUTLET_MONTHLY
                const suffix = cycle === 'yearly' ? '/tahun' : '/bulan'
                const label  = cycle === 'yearly' ? 'Tahunan' : 'Bulanan'
                const saving = cycle === 'yearly' ? 'Hemat ~17%' : null
                const active = newOutletBilling === cycle
                return (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => setNewOutletBilling(cycle)}
                    className={`relative flex flex-col items-start px-4 py-3 rounded-xl border-2 transition text-left ${
                      active
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {saving && (
                      <span className="absolute -top-2.5 right-3 text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                        {saving}
                      </span>
                    )}
                    <span className={`text-sm font-semibold ${active ? 'text-blue-700' : 'text-gray-700'}`}>
                      {label}
                    </span>
                    <span className={`text-xs mt-0.5 ${active ? 'text-blue-500' : 'text-gray-400'}`}>
                      {formatRupiah(price)}{suffix}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Ringkasan biaya */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">Total yang akan dibayarkan</span>
            <span className="text-sm font-bold text-gray-900">
              {formatRupiah(newOutletBilling === 'yearly' ? PRICE_PER_OUTLET_YEARLY : PRICE_PER_OUTLET_MONTHLY)}
              <span className="text-xs font-normal text-gray-400 ml-0.5">
                /{newOutletBilling === 'yearly' ? 'tahun' : 'bulan'}
              </span>
            </span>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { setAddOutletOpen(false); setNewOutletName(''); setNewOutletBilling('monthly') }}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              onClick={() => createOutletMut.mutate()}
              disabled={!newOutletName.trim() || createOutletMut.isPending}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {createOutletMut.isPending ? 'Membuat...' : 'Lanjut ke Pembayaran →'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Outlet confirm modal ───────────────────────────────────────────── */}
      <Modal
        open={confirmModal}
        onClose={() => { setConfirmModal(false); setSelectedOutlet(null) }}
        title="Konfirmasi Langganan Outlet"
        size="sm"
      >
        {selectedOutlet && (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Aktifkan langganan{' '}
              <span className="font-semibold text-gray-900">
                {selectedPlan === 'monthly' ? 'Bulanan' : 'Tahunan'}
              </span>{' '}
              untuk outlet:
            </p>
            <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
              <Store size={18} className="text-blue-600 shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 text-sm">{selectedOutlet.name}</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  {selectedPlan === 'monthly'
                    ? `${formatRupiah(PRICE_PER_OUTLET_MONTHLY)} / bulan · +30 hari`
                    : `${formatRupiah(PRICE_PER_OUTLET_YEARLY)} / tahun · +365 hari`}
                </p>
              </div>
              <ChevronRight size={16} className="text-blue-400 ml-auto shrink-0" />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmModal(false); setSelectedOutlet(null) }}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={() => createOrderMut.mutate({
                  business_id: businessId,
                  type: 'outlet_addon',
                  reference_id: selectedOutlet.id,
                  plan: selectedPlan,
                  email: userEmail,
                })}
                disabled={createOrderMut.isPending}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
              >
                {createOrderMut.isPending ? 'Memproses...' : 'Lanjut ke Pembayaran'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
