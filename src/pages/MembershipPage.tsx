import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Store, CheckCircle2, AlertTriangle, Clock, XCircle,
  PlusCircle, RefreshCw, ChevronRight,
  Lock, Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import PaymentOrderModal from '@/components/ui/PaymentOrderModal'
import CurrentPlanBanner from '@/components/membership/CurrentPlanBanner'
import BillingToggle from '@/components/membership/BillingToggle'
import type { BillingCycle } from '@/components/membership/BillingToggle'
import { ProPlanCard } from '@/components/membership/PlanCard'
import { getMyOutlets, createOutlet, deleteOutlet } from '@/api/outlets'
import { getActiveMembership } from '@/api/membership'
import { createPaymentOrder } from '@/api/payment'
import { formatDate, getErrorMessage } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Outlet, Membership, PaymentOrder } from '@/types'
import { useSubscriptionPrices } from '@/hooks/useSubscriptionPrices'
import { t } from '@/lib/i18n'

// ─── Constants ────────────────────────────────────────────────────────────────

// Harga TIDAK lagi ditanam di sini. Angka rupiah yang dipaku membuat pemilik
// izinya di Osaka melihat harga rupiah untuk paket yang sebenarnya ditagih yen
// — dan setiap perubahan harga menuntut rilis ulang dasbor. Semuanya kini
// dibaca dari /subscription-prices lewat useSubscriptionPrices, sumber yang
// sama dengan kartu paket, aplikasi kasir, dan halaman pemasaran.

type PlanType     = 'monthly' | 'yearly'

// ─── Outlet helpers ───────────────────────────────────────────────────────────

function getOutletStatus(outlet: Outlet) {
  const sub = outlet.subscription_status
  if (sub === 'active')  return { color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20',  icon: <CheckCircle2 size={14} className="text-green-600 dark:text-green-400" />,  label: t('statusActive') }
  if (sub === 'trial')   return { color: 'text-blue-700 dark:text-blue-400',  bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',    icon: <Clock size={14} className="text-blue-600 dark:text-blue-400" />,          label: t('statusTrial') }
  if (sub === 'expired') return { color: 'text-red-700 dark:text-red-400',   bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',      icon: <XCircle size={14} className="text-red-600 dark:text-red-400" />,         label: t('statusExpired') }
  return                        { color: 'text-muted-foreground',  bg: 'bg-muted border-border',    icon: <XCircle size={14} className="text-muted-foreground" />,        label: sub }
}

function needsRenewal(outlet: Outlet) {
  return outlet.subscription_status === 'expired' || outlet.subscription_status === 'inactive'
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MembershipPage() {
  // Harga per negara, dibaca dari server — bukan konstanta rupiah.
  const prices = useSubscriptionPrices()
  const qc = useQueryClient()
  const businessId = useAuthStore((s) => s.user?.business?.id ?? '')
  const userEmail  = useAuthStore((s) => s.user?.email ?? '')

  // Business-tier billing cycle toggle. Tahunan lebih dulu: harganya jauh lebih
  // hemat per bulan, jadi itulah yang paling masuk akal ditawarkan duluan.
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly')

  // Outlet-level subscription state (confirm before creating order)
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null)
  const [selectedPlan, setSelectedPlan]     = useState<PlanType>('yearly')
  const [confirmModal, setConfirmModal]     = useState(false)

  // Payment order modal
  const [paymentOrder, setPaymentOrder]       = useState<PaymentOrder | null>(null)
  const [paymentOrderOpen, setPaymentOrderOpen] = useState(false)
  const [paymentTitle, setPaymentTitle]       = useState(t('payCompletePayment'))

  // Business-level tier upgrade state (for loading indicator)
  const [upgradeTarget, setUpgradeTarget] = useState<'pro' | null>(null)

  // Tambah outlet baru (Pro only)
  const [addOutletOpen, setAddOutletOpen]         = useState(false)
  const [newOutletName, setNewOutletName]         = useState('')
  const [newOutletBilling, setNewOutletBilling]   = useState<PlanType>('yearly')
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

  const currentTier  = membership?.tier ?? 'free'
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
        setPaymentTitle(t('memUpgradeToPlan', { plan: 'Pro' }))
      } else {
        setPaymentTitle(t('memActivateOutletSub'))
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
      <Header title={t('navMembership')} subtitle={t('memPageSubtitle')} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

        {/* ── Current plan status ────────────────────────────────────────── */}
        {membershipLoading
          ? <div className="h-28 bg-muted rounded-2xl animate-pulse" />
          : <CurrentPlanBanner membership={membership} />
        }

        {/* ── Plan comparison ────────────────────────────────────────────── */}
        <div className="mx-auto w-full max-w-5xl">
          <div className="text-center">
            <h3 className="font-semibold text-foreground mb-1">{t('memPickPlan')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('memOnePriceBody')}
            </p>
          </div>

          {/* Billing cycle toggle */}
          <div className="mb-6">
            <BillingToggle value={billingCycle} onChange={setBillingCycle} />
          </div>

          {/* Pricing cards */}
          <div className="pt-2">
            <ProPlanCard
              billingCycle={billingCycle}
              isCurrent={membership?.type === (
                billingCycle === 'three-year'
                  ? 'pro-3year'
                  : billingCycle === 'yearly'
                    ? 'pro-yearly'
                    : 'pro'
              )}
              isLoading={upgradeTarget === 'pro' && createOrderMut.isPending}
              onUpgrade={() => {
                setUpgradeTarget('pro')
                createOrderMut.mutate({
                  business_id: businessId,
                  type: 'membership_upgrade',
                  plan: billingCycle === 'three-year'
                    ? 'pro-3year'
                    : billingCycle === 'yearly'
                      ? 'pro-yearly'
                      : 'pro',
                  email: userEmail,
                })
              }}
            />
          </div>
        </div>


        {/* ── Outlet subscription section ────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-foreground">{t('memOutletSubscription')}</h3>
            {currentTier === 'pro' && (
              <button
                onClick={() => setAddOutletOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
              >
                <Plus size={13} />
                {t('outletAdd')}
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t('memOutletSeparateFee')}
            <span className="font-semibold text-foreground">
              {t('memAddonPerOutletMonth', { price: prices.displayOf('outlet') })}
            </span>{t('memPricingTail')}
          </p>

          {/* Paket Pro diperlukan untuk mengelola outlet tambahan. */}
          {currentTier !== 'pro' && (
            <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/15 rounded-lg flex items-center justify-center shrink-0">
                <Lock size={15} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-900">
                  {t('memActivationNeedsPro')}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-0.5">
                  {t('memProOutletBody', { price: prices.displayOf('outlet') })}
                </p>
              </div>
            </div>
          )}

          {/* Summary pill row */}
          <div className="flex gap-3 mb-4">
            <div className="px-4 py-2.5 bg-card border border-border rounded-xl text-center">
              <p className="font-bold text-foreground text-lg leading-none">{outlets.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('memTotalOutlets')}</p>
            </div>
            <div className="px-4 py-2.5 bg-green-50 dark:bg-green-500/10 border border-green-100 rounded-xl text-center">
              <p className="font-bold text-green-700 dark:text-green-400 text-lg leading-none">{activeCount}</p>
              <p className="text-xs text-green-500 dark:text-green-400 mt-0.5">{t('statusActive')}</p>
            </div>
            {expiredCount > 0 && (
              <div className="px-4 py-2.5 bg-red-50 dark:bg-red-500/10 border border-red-100 rounded-xl text-center">
                <p className="font-bold text-red-600 dark:text-red-400 text-lg leading-none">{expiredCount}</p>
                <p className="text-xs text-red-400 mt-0.5">{t('memNeedsRenewal')}</p>
              </div>
            )}
          </div>

          {expiredCount > 0 && currentTier === 'pro' && (
            <div className="mb-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">
                {t('memExpiredOutlets', { count: expiredCount })}
              </p>
            </div>
          )}

          {outletLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : outlets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-card border border-border rounded-2xl">
              <Store size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">{t('memNoOutletsRegistered')}</p>
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
                      isFirstOutlet ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20' :
                      canActivate ? status.bg : 'bg-muted border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 bg-card rounded-lg flex items-center justify-center shadow-sm shrink-0">
                        <Store size={13} className={canActivate || isFirstOutlet ? 'text-muted-foreground' : 'text-muted-foreground'} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-sm truncate text-foreground">{outlet.name}</p>
                          {isFirstOutlet && (
                            <span className="shrink-0 text-xs bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 font-semibold px-1.5 py-0.5 rounded-full">
                              {t('memIncludedInPlan')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isFirstOutlet ? (
                            <>
                              {status.icon}
                              <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                              {outlet.subscription_end_date && (
                                <span className="text-xs text-muted-foreground">
                                  · s/d {formatDate(outlet.subscription_end_date)}
                                </span>
                              )}
                            </>
                          ) : canActivate ? (
                            <>
                              {status.icon}
                              <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                              {outlet.subscription_end_date && !needsRenewal(outlet) && (
                                <span className="text-xs text-muted-foreground">
                                  · s/d {formatDate(outlet.subscription_end_date)}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <Lock size={11} className="text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{t('memNeedsProPlan')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-3">
                      {isFirstOutlet ? (
                        // Outlet pertama: diperpanjang otomatis saat membership diperbarui.
                        <div className="px-3 py-1.5 bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 text-xs font-medium rounded-lg cursor-default select-none">
                          {t('statusAutomatic')}
                        </div>
                      ) : canActivate ? (
                        needsRenewal(outlet) ? (
                          <>
                            <button
                              onClick={() => openOutletConfirm(outlet, 'monthly')}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1"
                            >
                              <RefreshCw size={11} /> {t('planMonthly')}
                            </button>
                            <button
                              onClick={() => openOutletConfirm(outlet, 'yearly')}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition"
                            >
                              {t('planYearly')}
                            </button>
                          </>
                        ) : (
                          <button
                            /* "Perpanjang" tidak menyebut periode, jadi ia
                               memakai default yang sama dengan sisa layar:
                               tahunan. Nominalnya tetap dikonfirmasi di modal
                               sebelum order dibuat. */
                            onClick={() => openOutletConfirm(outlet, 'yearly')}
                            className="px-3 py-1.5 border border-border text-muted-foreground hover:bg-card text-xs font-medium rounded-lg transition flex items-center gap-1"
                          >
                            <PlusCircle size={11} /> {t('actionRenew')}
                          </button>
                        )
                      ) : (
                        <div className="px-3 py-1.5 bg-muted text-muted-foreground text-xs font-medium rounded-lg flex items-center gap-1 cursor-default select-none">
                          <Lock size={11} /> {t('memUpgradePro')}
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
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 rounded-2xl p-4">
          <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">{t('memHowPricingWorks')}</p>
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
            {t('memPricingExplainer', {
              price: prices.displayOf('pro'),
              included: t('memFirstOutletFree'),
              addon: prices.displayOf('outlet'),
            })}
          </p>
        </div>
      </div>

      {/* ── Payment Order Modal ───────────────────────────────────────────── */}
      <PaymentOrderModal
        open={paymentOrderOpen}
        order={paymentOrder}
        title={paymentTitle}
        onClose={() => {
          // Rollback: hapus outlet yang baru dibuat jika modal ditutup tanpa pembayaran selesai
          if (pendingNewOutletId) {
            deleteOutletMut.mutate(pendingNewOutletId)
          }
          setPaymentOrderOpen(false)
          setPaymentOrder(null)
          setPendingNewOutletId(null)
        }}
        invalidateKeys={[['membership'], ['my-outlets']]}
        onPaymentFailed={() => {
          if (pendingNewOutletId) {
            deleteOutletMut.mutate(pendingNewOutletId)
            setPendingNewOutletId(null)
          }
        }}
      />

      {/* ── Add Outlet Modal ─────────────────────────────────────────────── */}
      <Modal
        open={addOutletOpen}
        onClose={() => { setAddOutletOpen(false); setNewOutletName(''); setNewOutletBilling('yearly') }}
        title={t('memAddNewOutlet')}
        size="sm"
      >
        <div className="space-y-4">
          {/* Nama outlet */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('outletName')} <span className="text-red-400">*</span>
            </label>
            <input
              value={newOutletName}
              onChange={(e) => setNewOutletName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newOutletName.trim()) createOutletMut.mutate()
              }}
              placeholder={t('memOutletNameExample')}
              autoFocus
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Pilihan siklus billing */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('memBillingCycle')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['monthly', 'yearly'] as PlanType[]).map((cycle) => {
                const price  = prices.displayOf(cycle === 'yearly' ? 'outlet-yearly' : 'outlet')
                const suffix = cycle === 'yearly' ? t('perYearSuffix') : t('perMonthSuffix')
                const label  = cycle === 'yearly' ? t('planYearly') : t('planMonthly')
                const saving = cycle === 'yearly' ? t('memSavePercent') : null
                const active = newOutletBilling === cycle
                return (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => setNewOutletBilling(cycle)}
                    className={`relative flex flex-col items-start px-4 py-3 rounded-xl border-2 transition text-left ${
                      active
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                        : 'border-border bg-card hover:border-border'
                    }`}
                  >
                    {saving && (
                      <span className="absolute -top-2.5 right-3 text-[10px] bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 font-bold px-2 py-0.5 rounded-full">
                        {saving}
                      </span>
                    )}
                    <span className={`text-sm font-semibold ${active ? 'text-blue-700 dark:text-blue-400' : 'text-foreground'}`}>
                      {label}
                    </span>
                    <span className={`text-xs mt-0.5 ${active ? 'text-blue-500 dark:text-blue-400' : 'text-muted-foreground'}`}>
                      {price}{suffix}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Ringkasan biaya */}
          <div className="bg-muted rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('memTotalPayable')}</span>
            <span className="text-sm font-bold text-foreground">
              {prices.displayOf(newOutletBilling === 'yearly' ? 'outlet-yearly' : 'outlet')}
              <span className="text-xs font-normal text-muted-foreground ml-0.5">
                /{newOutletBilling === 'yearly' ? 'tahun' : 'bulan'}
              </span>
            </span>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { setAddOutletOpen(false); setNewOutletName(''); setNewOutletBilling('yearly') }}
              className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted transition"
            >
              {t('actionCancel')}
            </button>
            <button
              onClick={() => createOutletMut.mutate()}
              disabled={!newOutletName.trim() || createOutletMut.isPending}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {createOutletMut.isPending ? 'Membuat...' : t('memContinueToPayment')}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Outlet confirm modal ───────────────────────────────────────────── */}
      <Modal
        open={confirmModal}
        onClose={() => { setConfirmModal(false); setSelectedOutlet(null) }}
        title={t('memConfirmSubscription')}
        size="sm"
      >
        {selectedOutlet && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Aktifkan langganan{' '}
              <span className="font-semibold text-foreground">
                {selectedPlan === 'monthly' ? t('planMonthly') : t('planYearly')}
              </span>{' '}
              {t('memForOutlet')}
            </p>
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-4 flex items-center gap-3">
              <Store size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-sm">{selectedOutlet.name}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                  {selectedPlan === 'monthly'
                    ? t('memOutletPerMonth', { price: prices.displayOf('outlet') })
                    : t('memOutletPerYear', { price: prices.displayOf('outlet-yearly') })}
                </p>
              </div>
              <ChevronRight size={16} className="text-blue-400 ml-auto shrink-0" />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmModal(false); setSelectedOutlet(null) }}
                className="flex-1 py-2.5 border border-border text-muted-foreground text-sm font-medium rounded-xl hover:bg-muted transition"
              >
                {t('actionCancel')}
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
                {createOrderMut.isPending ? 'Memproses...' : t('memContinueToPayment')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
