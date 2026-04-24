import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { PeakHour } from '@/types'

interface PeakHoursChartProps {
  peakHours: PeakHour[]
  loading: boolean
}

export default function PeakHoursChart({ peakHours, loading }: PeakHoursChartProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">Jam Ramai</p>
        <p className="text-xs text-gray-400 mt-0.5">Distribusi order berdasarkan jam</p>
      </div>
      <div className="p-4">
        {loading ? (
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
                className="transition"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        {/* Peak hour summary */}
        {!loading && peakHours.length > 0 && (() => {
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
  )
}
