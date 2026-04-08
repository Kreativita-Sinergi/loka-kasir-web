import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Info, CheckCircle } from 'lucide-react'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import { getRevenueTrend, getProductPerformance, getPeakHours, getInsights } from '@/api/analytics'
import { useOutletStore } from '@/store/outletStore'
import { formatCurrency } from '@/lib/utils'
import type { ProductPerformance, PeakHour, InsightItem } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function GrowthBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-gray-400 text-xs">—</span>
  if (pct > 0) return (
    <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
      <TrendingUp size={12} /> +{pct.toFixed(1)}%
    </span>
  )
  if (pct < 0) return (
    <span className="flex items-center gap-1 text-red-500 text-xs font-semibold">
      <TrendingDown size={12} /> {pct.toFixed(1)}%
    </span>
  )
  return <span className="flex items-center gap-1 text-gray-400 text-xs"><Minus size={12} /> 0%</span>
}

function InsightCard({ item }: { item: InsightItem }) {
  const map = {
    warning: { icon: <AlertTriangle size={14} />, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    success: { icon: <CheckCircle size={14} />,  bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-100' },
    info:    { icon: <Info size={14} />,         bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-100' },
  }
  const s = map[item.type] ?? map.info
  return (
    <div className={`flex gap-3 p-3 rounded-xl border ${s.bg} ${s.border}`}>
      <div className={`shrink-0 mt-0.5 ${s.text}`}>{s.icon}</div>
      <div className="min-w-0">
        <p className={`text-xs font-semibold ${s.text}`}>{item.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.description}</p>
        {item.metric !== undefined && (
          <p className={`text-sm font-bold mt-1 ${s.text}`}>{item.metric}</p>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { selected: selectedOutlet } = useOutletStore()
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly')

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['revenue-trend', period],
    queryFn: () => getRevenueTrend(period),
  })

  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ['product-performance'],
    queryFn: () => getProductPerformance({ limit: 10 }),
  })

  const { data: peakData, isLoading: peakLoading } = useQuery({
    queryKey: ['peak-hours'],
    queryFn: () => getPeakHours(),
  })

  const { data: insightsData } = useQuery({
    queryKey: ['insights'],
    queryFn: () => getInsights(),
  })

  const trends       = trendData?.data?.data ?? []
  const products     = productData?.data?.data ?? []
  const peakHours    = peakData?.data?.data ?? []
  const insights     = insightsData?.data?.data?.insights ?? []

  // ── Product table columns ──
  const productColumns = [
    {
      key: 'product_name',
      label: 'Produk',
      render: (row: ProductPerformance) => (
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900">{row.product_name}</p>
          {row.is_slow_moving && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-red-50 text-red-500 rounded-full">
              Slow-moving
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'total_sold',
      label: 'Terjual',
      render: (row: ProductPerformance) => (
        <span className="text-sm text-gray-700">{row.total_sold} pcs</span>
      ),
    },
    {
      key: 'total_revenue',
      label: 'Pendapatan',
      render: (row: ProductPerformance) => (
        <span className="text-sm font-semibold text-gray-900">{formatCurrency(row.total_revenue)}</span>
      ),
    },
    {
      key: 'growth',
      label: 'Tren',
      render: (row: ProductPerformance) => <GrowthBadge pct={row.growth_percentage} />,
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Laporan Umum"
        subtitle={selectedOutlet ? `Performa ${selectedOutlet.name}` : 'Performa Semua Outlet'}
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Insights */}
        {insights.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Insights Bisnis</p>
              <p className="text-xs text-gray-400 mt-0.5">Rekomendasi otomatis berdasarkan data transaksi</p>
            </div>
            <div className="p-4 grid grid-cols-1 xl:grid-cols-3 gap-3">
              {insights.map((item: InsightItem, i: number) => (
                <InsightCard key={i} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Revenue Trend */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Tren Pendapatan</p>
              <p className="text-xs text-gray-400 mt-0.5">Pendapatan dan jumlah order per periode</p>
            </div>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              {(['weekly', 'monthly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    period === p ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {p === 'weekly' ? 'Mingguan' : 'Bulanan'}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            {trendLoading ? (
              <div className="h-52 bg-gray-50 rounded-xl animate-pulse" />
            ) : trends.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Belum Ada Data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trends} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any, name: any) => [
                        name === 'revenue' ? formatCurrency(v) : v,
                        name === 'revenue' ? 'Pendapatan' : 'Order',
                      ]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} name="revenue" />
                  <Line type="monotone" dataKey="orders"  stroke="#10b981" strokeWidth={2} dot={false} name="orders" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Product Performance */}
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Performa Produk</p>
              <p className="text-xs text-gray-400 mt-0.5">Top 10 produk berdasarkan pendapatan</p>
            </div>
            <DataTable
              columns={productColumns as never[]}
              data={products as never[]}
              loading={productLoading}
              emptyMessage="Belum Ada Data Produk"
            />
          </div>

          {/* Peak Hours */}
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Jam Ramai</p>
              <p className="text-xs text-gray-400 mt-0.5">Distribusi order berdasarkan jam</p>
            </div>
            <div className="p-4">
              {peakLoading ? (
                <div className="h-52 bg-gray-50 rounded-xl animate-pulse" />
              ) : peakHours.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Belum Ada Data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={peakHours} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `${String(v).padStart(2, '0')}:00`}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any, name: any) => [
                        name === 'revenue' ? formatCurrency(v) : v,
                        name === 'revenue' ? 'Pendapatan' : 'Order',
                      ]}
                      labelFormatter={(l) => `${String(l).padStart(2, '0')}:00`}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar
                      dataKey="order_count"
                      name="order_count"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      // Darker fill for peak hours
                      className="transition"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {/* Peak hour summary */}
              {!peakLoading && peakHours.length > 0 && (() => {
                const peak = peakHours.reduce((a: PeakHour, b: PeakHour) =>
                  a.order_count >= b.order_count ? a : b
                )
                return (
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    Jam tersibuk:{' '}
                    <span className="font-semibold text-blue-600">
                      {String(peak.hour).padStart(2, '0')}:00 – {String(peak.hour + 1).padStart(2, '0')}:00
                    </span>
                    {' '}({peak.order_count} order · {formatCurrency(peak.revenue)})
                  </p>
                )
              })()}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
