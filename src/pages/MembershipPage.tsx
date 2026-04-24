import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Store, CheckCircle2, AlertTriangle, Clock, XCircle,
  PlusCircle, RefreshCw, ChevronRight,
  MessageCircle, Lock, Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import PaymentOrderModal from '@/components/ui/PaymentOrderModal'
import CurrentPlanBanner from '@/components/membership/CurrentPlanBanner'
import BillingToggle from '@/components/membership/BillingToggle'
import { LitePlanCard, ProPlanCard } from '@/components/membership/PlanCard'
import { getMyOutlets, createOutlet, deleteOutlet } from '@/api/outlets'
import { getActiveMembership } from '@/api/membership'
import { createPaymentOrder } from '@/api/payment'
import { formatDate, getErrorMessage } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Outlet, Membership, PaymentOrder } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRICE_PRO_MONTHLY        = 89_000
const PRICE_PER_OUTLET_MONTHLY = 49_000
const PRICE_PER_OUTLET_YEARLY  = 490_000

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(amount)
}

type BillingCycle = 'monthly' | 'yearly'
type PlanType     = 'monthly' | 'yearly'

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
