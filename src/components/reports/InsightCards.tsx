import { TrendingUp, TrendingDown, Minus, AlertTriangle, Info, CheckCircle } from 'lucide-react'
import type { InsightItem } from '@/types'

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

interface InsightCardsProps {
  insights: InsightItem[]
}

export { GrowthBadge }

export default function InsightCards({ insights }: InsightCardsProps) {
  if (insights.length === 0) return null

  return (
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
  )
}
