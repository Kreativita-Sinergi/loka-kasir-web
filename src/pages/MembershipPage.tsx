import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Store, CheckCircle2, AlertTriangle, Clock, XCircle,
  PlusCircle, RefreshCw, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import { getMyOutlets, activateOutletSubscription } from '@/api/outlets'
import { formatDate, getErrorMessage } from '@/lib/utils'
import type { Outlet, OutletSubscriptionStatus } from '@/types'

// ─── Pricing constants ────────────────────────────────────────────────────────
const PRICE_PER_OUTLET_MONTHLY = 150_000
const PRICE_PER_OUTLET_YEARLY  = 1_500_000 // ~Rp 125k/bulan (hemat ≈17%)

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type PlanType = 'monthly' | 'yearly'

interface OutletStatus {
  color: string
  bg: string
  icon: React.ReactNode
  label: string
}

function getOutletStatus(outlet: Outlet): OutletStatus {
  const sub = outlet.subscription_status
  const isExpired = sub === 'expired'
  const isInactive = sub === 'inactive'
  const isTrial = sub === 'trial'
  const isActive = sub === 'active'

  if (isActive) return {
    color: 'text-green-700', bg: 'bg-green-50 border-green-200',
    icon: <CheckCircle2 size={14} className="text-green-600" />,
    label: 'Aktif',
  }
  if (isTrial) return {
    color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200',
    icon: <Clock size={14} className="text-blue-600" />,
    label: 'Trial',
  }
  if (isExpired) return {
    color: 'text-red-700', bg: 'bg-red-50 border-red-200',
    icon: <XCircle size={14} className="text-red-600" />,
    label: 'Kedaluwarsa',
  }
  if (isInactive) return {
    color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200',
    icon: <XCircle size={14} className="text-gray-400" />,
    label: 'Tidak Aktif',
  }
  return {
    color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200',
    icon: <XCircle size={14} className="text-gray-400" />,
    label: sub,
  }
}

function needsRenewal(outlet: Outlet) {
  return outlet.subscription_status === 'expired' || outlet.subscription_status === 'inactive'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MembershipPage() {
  const qc = useQueryClient()

  const [selectedOutlet, setSelectedOutlet]   = useState<Outlet | null>(null)
  const [selectedPlan, setSelectedPlan]       = useState<PlanType>('monthly')
  const [confirmModal, setConfirmModal]       = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['my-outlets'],
    queryFn: () => getMyOutlets(),
  })

  const outlets: Outlet[] = data?.data?.data ?? []
  const activeCount  = outlets.filter((o) => o.subscription_status === 'active' || o.subscription_status === 'trial').length
  const expiredCount = outlets.filter((o) => needsRenewal(o)).length

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

  const openConfirm = (outlet: Outlet, plan: PlanType) => {
    setSelectedOutlet(outlet)
    setSelectedPlan(plan)
    setConfirmModal(true)
  }

  const monthlyTotal = outlets.length * PRICE_PER_OUTLET_MONTHLY
  const yearlyTotal  = outlets.length * PRICE_PER_OUTLET_YEARLY

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Langganan" subtitle="Kelola langganan per-outlet bisnis Anda" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── Summary banner ─────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Ringkasan Langganan</p>
              {isLoading ? (
                <div className="h-8 w-40 bg-white/20 rounded animate-pulse mt-2" />
              ) : (
                <h2 className="text-3xl font-bold mt-1">
                  {outlets.length} Outlet
                </h2>
              )}
              <div className="flex flex-wrap gap-3 mt-4">
                <div className="px-3 py-1.5 bg-white/15 rounded-xl text-center">
                  <p className="text-white font-bold text-base leading-none">{activeCount}</p>
                  <p className="text-blue-200 text-xs mt-0.5">Aktif</p>
                </div>
                <div className="px-3 py-1.5 bg-white/15 rounded-xl text-center">
                  <p className="text-white font-bold text-base leading-none">{expiredCount}</p>
                  <p className="text-blue-200 text-xs mt-0.5">Perlu Diperbarui</p>
                </div>
              </div>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Store size={24} />
            </div>
          </div>
        </div>

        {/* ── Expired alert ──────────────────────────────────────────────── */}
        {expiredCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">
                {expiredCount} outlet perlu diperpanjang
              </p>
              <p className="text-sm text-red-600 mt-0.5">
                Outlet yang kedaluwarsa tidak dapat menerima transaksi baru.
                Perpanjang sekarang agar operasional tidak terganggu.
              </p>
            </div>
          </div>
        )}

        {/* ── Pricing info ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-1">Harga Langganan</h3>
          <p className="text-sm text-gray-500 mb-4">Biaya dihitung per outlet, bukan per bisnis.</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                plan: 'monthly' as const,
                label: 'Bulanan',
                price: formatRupiah(PRICE_PER_OUTLET_MONTHLY),
                sub: '/outlet/bulan',
                badge: null,
                total: formatRupiah(monthlyTotal),
              },
              {
                plan: 'yearly' as const,
                label: 'Tahunan',
                price: formatRupiah(PRICE_PER_OUTLET_YEARLY),
                sub: '/outlet/tahun',
                badge: 'Hemat ±17%',
                total: formatRupiah(yearlyTotal),
              },
            ].map((p) => (
              <div key={p.plan} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-800">{p.label}</span>
                  {p.badge && (
                    <span className="text-xs font-semibold bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                      {p.badge}
                    </span>
                  )}
                </div>
                <p className="text-xl font-bold text-gray-900">{p.price}</p>
                <p className="text-xs text-gray-400">{p.sub}</p>
                {outlets.length > 0 && (
                  <p className="text-xs text-blue-600 font-medium mt-2">
                    {outlets.length} outlet = {p.total}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Outlet list ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Outlet &amp; Status Langganan</h3>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : outlets.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Store size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Belum ada outlet terdaftar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {outlets.map((outlet) => {
                const status = getOutletStatus(outlet)
                return (
                  <div
                    key={outlet.id}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 ${status.bg}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                        <Store size={15} className="text-gray-500" />
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
                            onClick={() => openConfirm(outlet, 'monthly')}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1"
                          >
                            <RefreshCw size={11} /> Bulanan
                          </button>
                          <button
                            onClick={() => openConfirm(outlet, 'yearly')}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1"
                          >
                            Tahunan
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => openConfirm(outlet, 'monthly')}
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
            Perpanjangan diterapkan per-outlet. Menambah outlet baru akan menambah biaya
            langganan sesuai paket yang dipilih untuk outlet tersebut.
          </p>
        </div>
      </div>

      {/* ── Confirm modal ──────────────────────────────────────────────────── */}
      <Modal
        open={confirmModal}
        onClose={() => { setConfirmModal(false); setSelectedOutlet(null) }}
        title="Konfirmasi Langganan"
        size="sm"
      >
        {selectedOutlet && (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Aktifkan langganan <span className="font-semibold text-gray-900">{selectedPlan === 'monthly' ? 'Bulanan' : 'Tahunan'}</span> untuk outlet:
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
