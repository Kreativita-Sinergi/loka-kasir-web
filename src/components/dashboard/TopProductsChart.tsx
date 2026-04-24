import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { TopProduct } from '@/types'

interface TopProductsChartProps {
  products: TopProduct[]
  loading: boolean
}

export default function TopProductsChart({ products, loading }: TopProductsChartProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Produk Terlaris</h2>
      </div>
      {loading ? (
        <div className="p-5 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="px-5 py-8 text-center text-gray-400 text-sm">Belum Ada Data</div>
      ) : (
        <div className="p-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={products} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="product_name"
                tick={{ fontSize: 11 }}
                width={90}
                tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + '…' : v}
              />
              <Tooltip
                formatter={(v) => [v, 'Order']}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="order_count" fill="#3b82f6" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
