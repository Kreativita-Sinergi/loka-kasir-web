import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, ShoppingCart, DollarSign, Percent, PackageX, MinusCircle, Activity, Settings, AlertCircle } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import { getProfitabilityReport } from '@/api/profitability'
import { getBusinessOpex } from '@/api/businessOpex'
import { formatCurrency } from '@/lib/utils'
import type { ProductProfitability, BusinessOpex } from '@/types'

// ── Period selector ────────────────────────────────────────────────────────

const PERIODS = [
  { key: '7d', label: '7 Hari' },
  { key: '30d', label: '30 Hari' },
  { key: '90d', label: '90 Hari' },
] as const

type PeriodKey = (typeof PERIODS)[number]['key']

// ── Margin badge ───────────────────────────────────────────────────────────

function MarginBadge({ margin }: { margin: number }) {
  if (margin >= 30) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400">
        {margin.toFixed(1)}%
      </span>
    )
  }
  if (margin >= 15) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400">
        {margin.toFixed(1)}%
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400">
      {margin.toFixed(1)}%
    </span>
  )
}

// ── Loading skeletons ──────────────────────────────────────────────────────

function SkeletonStatCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl p-5 border border-border bg-card animate-pulse">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1 mr-4">
              <div className="h-3 bg-muted rounded w-24" />
              <div className="h-8 bg-muted rounded w-32" />
            </div>
            <div className="w-10 h-10 bg-muted rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

function SkeletonTableRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-muted rounded w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ── Product row ────────────────────────────────────────────────────────────

function ProductRow({ product }: { product: ProductProfitability }) {
  if (!product.has_bom) {
    return (
      <tr className="hover:bg-muted transition-colors">
        <td className="px-4 py-3 text-sm font-medium text-foreground">{product.product_name}</td>
        <td className="px-4 py-3 text-sm text-muted-foreground text-center">{product.units_sold}</td>
        <td className="px-4 py-3 text-sm text-muted-foreground text-right">{formatCurrency(product.revenue)}</td>
        <td colSpan={4} className="px-4 py-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400">
            <PackageX size={11} />
            Belum ada BOM
          </span>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-muted transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-foreground">{product.product_name}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground text-center">{product.units_sold}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground text-right">{formatCurrency(product.revenue)}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground text-right">{formatCurrency(product.total_cogs)}</td>
      <td className={`px-4 py-3 text-sm font-semibold text-right ${product.gross_profit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {formatCurrency(product.gross_profit)}
      </td>
      <td className="px-4 py-3 text-center">
        <MarginBadge margin={product.gross_margin} />
      </td>
      <td className="px-4 py-3 text-center">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400">
          BOM Aktif
        </span>
      </td>
    </tr>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProfitabilityPage() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<PeriodKey>('30d')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['profitability-report', period],
    queryFn: () => getProfitabilityReport(period),
    select: (res) => res.data.data,
  })

  const { data: opex } = useQuery({
    queryKey: ['business-opex'],
    queryFn: getBusinessOpex,
    select: (res) => res.data.data as BusinessOpex | undefined,
  })

  const netProfit = (data?.gross_profit ?? 0) - (opex?.monthly_fixed_costs ?? 0)
  const netMargin = data?.total_revenue ? (netProfit / data.total_revenue) * 100 : 0

  const products = data?.products ?? []

  return (
    <>
      <Header title="Laporan Profitabilitas HPP" />

      <div className="p-6 space-y-6">
        {/* Period selector */}
        <div className="flex gap-2 bg-muted p-1 rounded-xl w-fit">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition ${
                period === p.key ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Error state */}
        {isError && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
            Gagal memuat laporan. Pastikan koneksi internet Anda dan coba lagi.
          </div>
        )}

        {/* Stat cards */}
        {isLoading ? (
          <SkeletonStatCards />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard
              title="Total Revenue"
              value={formatCurrency(data?.total_revenue ?? 0)}
              icon={<DollarSign size={18} />}
              color="blue"
              loading={isLoading}
            />
            <StatCard
              title="Total COGS"
              value={formatCurrency(data?.total_cogs ?? 0)}
              icon={<ShoppingCart size={18} />}
              color="orange"
              loading={isLoading}
            />
            <StatCard
              title="Gross Profit"
              value={formatCurrency(data?.gross_profit ?? 0)}
              icon={<TrendingUp size={18} />}
              color="green"
              loading={isLoading}
            />
            <StatCard
              title="Gross Margin"
              value={`${(data?.gross_margin ?? 0).toFixed(1)}%`}
              icon={<Percent size={18} />}
              color="purple"
              loading={isLoading}
            />
            <StatCard
              title="Net Profit"
              value={formatCurrency(netProfit)}
              icon={<MinusCircle size={18} />}
              color={netProfit >= 0 ? 'green' : 'red'}
              loading={isLoading}
            />
            <StatCard
              title="Net Margin"
              value={`${netMargin.toFixed(1)}%`}
              icon={<Activity size={18} />}
              color={netMargin >= 0 ? 'green' : 'red'}
              loading={isLoading}
            />
          </div>
        )}

        {/* Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Detail Profitabilitas per Produk</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Diurutkan berdasarkan gross profit tertinggi</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-4 py-3 font-semibold">Produk</th>
                  <th className="px-4 py-3 font-semibold text-center">Terjual</th>
                  <th className="px-4 py-3 font-semibold text-right">Revenue</th>
                  <th className="px-4 py-3 font-semibold text-right">Total COGS</th>
                  <th className="px-4 py-3 font-semibold text-right">Gross Profit</th>
                  <th className="px-4 py-3 font-semibold text-center">Margin</th>
                  <th className="px-4 py-3 font-semibold text-center">Status BOM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && <SkeletonTableRows />}
                {!isLoading && products.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <TrendingUp size={40} className="text-muted-foreground" />
                        <p className="text-sm font-medium text-muted-foreground">Belum ada data penjualan</p>
                        <p className="text-xs text-muted-foreground">
                          Data profitabilitas akan muncul setelah ada transaksi tercatat.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && products.map((product) => (
                  <ProductRow key={product.product_id} product={product} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Opex breakdown info card */}
        {opex ? (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Rincian Biaya Operasional (Opex)</h2>
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Biaya Tetap Bulanan</p>
                <p className="text-base font-semibold text-foreground">
                  {formatCurrency(opex.monthly_fixed_costs)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Target Volume Penjualan</p>
                <p className="text-base font-semibold text-foreground">
                  {opex.target_sales_volume.toLocaleString('id-ID')} unit
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Overhead per Item</p>
                <p className="text-base font-semibold text-foreground">
                  {formatCurrency(opex.overhead_per_item)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Default Margin</p>
                <p className="text-base font-semibold text-foreground">
                  {opex.default_margin}%
                </p>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate('/settings/finance')}
            className="w-full flex items-center gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl px-5 py-4 text-left hover:bg-amber-100 dark:bg-amber-500/15 transition group"
          >
            <AlertCircle size={18} className="text-amber-500 dark:text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">OPEX belum dikonfigurasi</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Net Profit dan saran harga tidak akurat tanpa data biaya operasional. Klik untuk mengaturnya.
              </p>
            </div>
            <Settings size={15} className="text-amber-400 group-hover:text-amber-600 dark:text-amber-400 shrink-0 transition" />
          </button>
        )}
      </div>
    </>
  )
}
