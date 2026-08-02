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
    <div className="bg-card rounded-2xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Tren Pendapatan</p>
          <p className="text-xs text-muted-foreground mt-0.5">Pendapatan dan jumlah transaksi per periode</p>
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {(['weekly', 'monthly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                period === p ? 'bg-card text-blue-600 dark:text-blue-400 shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p === 'weekly' ? 'Mingguan' : 'Bulanan'}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="h-52 bg-muted rounded-xl animate-pulse" />
        ) : trends.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">Belum Ada Data</div>
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
                    name === 'revenue' ? 'Pendapatan' : 'Transaksi',
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
