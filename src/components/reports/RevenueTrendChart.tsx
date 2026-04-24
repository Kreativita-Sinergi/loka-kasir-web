import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { RevenueTrend } from '@/types'

interface RevenueTrendChartProps {
  trends: RevenueTrend[]
  loading: boolean
  period: 'weekly' | 'monthly'
  setPeriod: (p: 'weekly' | 'monthly') => void
}

export default function RevenueTrendChart({ trends, loading, period, setPeriod }: RevenueTrendChartProps) {
  return (
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
        {loading ? (
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
  )
}
