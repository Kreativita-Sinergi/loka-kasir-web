import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Store, CheckCircle2, AlertTriangle, Clock, XCircle,
  PlusCircle, RefreshCw, ChevronRight, Zap, Crown,
  MessageCircle, BarChart2, Package, ShoppingCart, Check, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import { getMyOutlets, activateOutletSubscription } from '@/api/outlets'
import { getActiveMembership, upgradeMembership } from '@/api/membership'
import { formatDate, getErrorMessage } from '@/lib/utils'
import { deriveStatus } from '@/store/subscriptionStore'
import type { Outlet, OutletSubscriptionStatus, Membership } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRICE_LITE_MONTHLY = 39_000
const PRICE_PRO_MONTHLY  = 89_000
// Per-outlet subscription (model terpisah dari tier bisnis)
const PRICE_PER_OUTLET_MONTHLY = 150_000
const PRICE_PER_OUTLET_YEARLY  = 1_500_000

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(amount)
}

// ─── Feature matrix ───────────────────────────────────────────────────────────

interface Feature {
  label: string
  icon: React.ReactNode
  lite: boolean
  pro: boolean
  highlight?: boolean
}

const FEATURES: Feature[] = [
  { label: 'POS & Kasir',                    icon: <ShoppingCart size={14} />, lite: true,  pro: true  },
  { label: 'Manajemen Produk & Stok',        icon: <Package size={14} />,      lite: true,  pro: true  },
  { label: 'Laporan Penjualan',              icon: <BarChart2 size={14} />,    lite: true,  pro: true  },
  { label: 'Multiple Outlet',               icon: <Store size={14} />,        lite: true,  pro: true  },
  { label: 'Kirim Struk via WhatsApp',       icon: <MessageCircle size={14} />, lite: false, pro: true, highlight: true },
  { label: 'Notifikasi Laporan via WhatsApp',icon: <MessageCircle size={14} />, lite: false, pro: true, highlight: true },
]

// ─── Outlet helpers ───────────────────────────────────────────────────────────

type PlanType = 'monthly' | 'yearly'

function getOutletStatus(outlet: Outlet) {
  const sub = outlet.subscription_status
  if (sub === 'active')   return { color: 'text-green-700', bg: 'bg-green-50 border-green-200',  icon: <CheckCircle2 size={14} className="text-green-600" />,  label: 'Aktif' }
  if (sub === 'trial')    return { color: 'text-blue-700',  bg: 'bg-blue-50 border-blue-200',    icon: <Clock size={14} className="text-blue-600" />,          label: 'Trial' }
  if (sub === 'expired')  return { color: 'text-red-700',   bg: 'bg-red-50 border-red-200',      icon: <XCircle size={14} className="text-red-600" />,         label: 'Kedaluwarsa' }
  return                         { color: 'text-gray-600',  bg: 'bg-gray-50 border-gray-200',    icon: <XCircle size={14} className="text-gray-400" />,        label: sub }
}

function needsRenewal(outlet: Outlet) {
  return outlet.subscription_status === 'expired' || outlet.subscription_status === 'inactive'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

  // LITE or EXPIRED
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

// ─── Plan Card ────────────────────────────────────────────────────────────────

interface PlanCardProps {
  name: string
  price: number
  isPro?: boolean
  isCurrent?: boolean
  onUpgrade: () => void
  isLoading?: boolean
}

function PlanCard({ name, price, isPro = false, isCurrent = false, onUpgrade, isLoading }: PlanCardProps) {
  return (
    <div className={`relative rounded-2xl border p-5 flex flex-col gap-4 ${
      isPro
        ? 'border-blue-500 bg-gradient-to-b from-blue-50 to-white shadow-md'
        : 'border-gray-200 bg-white'
    }`}>
      {isPro && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full shadow-sm">
          REKOMENDASI
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-1">
          {isPro
            ? <Crown size={16} className="text-blue-600" />
            : <Store size={16} className="text-gray-500" />
          }
          <span className={`font-bold text-base ${isPro ? 'text-blue-700' : 'text-gray-700'}`}>{name}</span>
        </div>
        <p className={`text-2xl font-bold ${isPro ? 'text-blue-700' : 'text-gray-900'}`}>
          {formatRupiah(price)}
          <span className="text-sm font-normal text-gray-400">/bln</span>
        </p>
      </div>

      <div className="space-y-2">
        {FEATURES.map((f) => {
          const available = isPro ? f.pro : f.lite
          return (
            <div key={f.label} className={`flex items-center gap-2.5 text-sm ${
              available
                ? f.highlight && isPro ? 'text-blue-700 font-medium' : 'text-gray-700'
                : 'text-gray-300 line-through'
            }`}>
              <span className={`shrink-0 ${available ? (f.highlight && isPro ? 'text-blue-500' : 'text-green-500') : 'text-gray-300'}`}>
                {available ? <Check size={14} /> : <X size={14} />}
              </span>
              <span className="flex items-center gap-1.5">
                {f.icon}
                {f.label}
              </span>
            </div>
          )
        })}
      </div>

      <button
        onClick={onUpgrade}
        disabled={isCurrent || isLoading}
        className={`mt-auto w-full py-2.5 text-sm font-semibold rounded-xl transition ${
          isCurrent
            ? 'bg-gray-100 text-gray-400 cursor-default'
            : isPro
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
      >
        {isLoading ? 'Memproses...' : isCurrent ? 'Paket Aktif' : `Pilih ${name}`}
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MembershipPage() {
  const qc = useQueryClient()

  // Outlet-level subscription state
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null)
  const [selectedPlan, setSelectedPlan]     = useState<PlanType>('monthly')
  const [confirmModal, setConfirmModal]     = useState(false)

  // Business-level tier upgrade state
  const [upgradeTarget, setUpgradeTarget] = useState<'lite' | 'pro' | null>(null)

  const { data: outletData, isLoading: outletLoading } = useQuery({
    queryKey: ['my-outlets'],
    queryFn: () => getMyOutlets(),
  })

  const { data: membershipData, isLoading: membershipLoading } = useQuery({
    queryKey: ['membership'],
    queryFn: () => getActiveMembership(),
  })

  const outlets: Outlet[]   = outletData?.data?.data ?? []
  const membership: Membership | null = membershipData?.data?.data ?? null

  const currentTier = membership?.tier ?? 'lite'
  const activeCount  = outlets.filter((o) => o.subscription_status === 'active' || o.subscription_status === 'trial').length
  const expiredCount = outlets.filter((o) => needsRenewal(o)).length

  // ── Outlet subscription activation ────────────────────────────────────────
  const activateMut = useMutation({
    mutationFn: ({ outletId, plan }: { outletId: string; plan: PlanType }) =>
      activateOutletSubscription(outletId, {
        status: 'active' as OutletSubscriptionStatus,
        duration_months: plan === 'monthly' ? 1 : 12,
      }),
    onSuccess: () => {
      toast.success('Langganan outlet berhasil diaktifkan!')
      qc.invalidateQueries({ queryKey: ['my-outlets'] })
      setConfirmModal(false)
      setSelectedOutlet(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  // ── Business tier upgrade ──────────────────────────────────────────────────
  const upgradeMut = useMutation({
    mutationFn: (type: 'lite' | 'pro') => upgradeMembership(type),
    onSuccess: (_, type) => {
      toast.success(`Berhasil upgrade ke Paket ${type === 'pro' ? 'Pro' : 'Lite'}!`)
      qc.invalidateQueries({ queryKey: ['membership'] })
      setUpgradeTarget(null)
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
            Satu harga untuk seluruh bisnis Anda, bukan per outlet.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <PlanCard
              name="Lite"
              price={PRICE_LITE_MONTHLY}
              isCurrent={currentTier === 'lite'}
              isLoading={upgradeTarget === 'lite' && upgradeMut.isPending}
              onUpgrade={() => {
                setUpgradeTarget('lite')
                upgradeMut.mutate('lite')
              }}
            />
            <PlanCard
              name="Pro"
              price={PRICE_PRO_MONTHLY}
              isPro
              isCurrent={currentTier === 'pro'}
              isLoading={upgradeTarget === 'pro' && upgradeMut.isPending}
              onUpgrade={() => {
                setUpgradeTarget('pro')
                upgradeMut.mutate('pro')
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
          <h3 className="font-semibold text-gray-900 mb-1">Langganan Outlet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Biaya terpisah per outlet — {formatRupiah(PRICE_PER_OUTLET_MONTHLY)}/outlet/bulan.
          </p>

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

          {expiredCount > 0 && (
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
              {outlets.map((outlet) => {
                const status = getOutletStatus(outlet)
                return (
                  <div
                    key={outlet.id}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 ${status.bg}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                        <Store size={13} className="text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{outlet.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {status.icon}
                          <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                          {outlet.subscription_end_date && !needsRenewal(outlet) && (
                            <span className="text-xs text-gray-400">
                              · s/d {formatDate(outlet.subscription_end_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-3">
                      {needsRenewal(outlet) ? (
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
          <p className="text-sm text-amber-700 font-medium">Catatan</p>
          <p className="text-sm text-amber-600 mt-1">
            Paket Lite/Pro berlaku untuk seluruh bisnis. Langganan per-outlet di atas adalah
            biaya terpisah untuk mengaktifkan outlet di sistem POS.
          </p>
        </div>
      </div>

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
                onClick={() => activateMut.mutate({ outletId: selectedOutlet.id, plan: selectedPlan })}
                disabled={activateMut.isPending}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
              >
                {activateMut.isPending ? 'Memproses...' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
