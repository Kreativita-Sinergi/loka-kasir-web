import { useNavigate } from 'react-router-dom'
import { Crown, Zap, Lock } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'

interface Props {
  children: React.ReactNode
  /** 'pro' = butuh Pro/Trial | 'lite' = butuh Lite/Pro/Trial */
  require: 'pro' | 'lite'
  /** Nama fitur untuk ditampilkan di prompt */
  feature?: string
}

const CONFIG = {
  pro: {
    icon: <Crown size={32} className="text-amber-500" />,
    badge: 'Pro',
    badgeClass: 'bg-amber-100 text-amber-700 border border-amber-200',
    title: 'Fitur Eksklusif Pro',
    desc: 'HPP, Bahan Baku, Transfer Stok, Absensi, Smart Pricing, Profitabilitas, Loyalty, dan Laporan Analitik tersedia khusus untuk pengguna paket Pro.',
    cta: 'Upgrade ke Pro',
  },
  lite: {
    icon: <Zap size={32} className="text-blue-500" />,
    badge: 'Lite+',
    badgeClass: 'bg-blue-100 text-blue-700 border border-blue-200',
    title: 'Fitur Lite & Pro',
    desc: 'Manajemen pelanggan, manajemen meja, dan laporan keuangan tersedia mulai paket Lite.',
    cta: 'Upgrade ke Lite',
  },
}

export default function PlanGate({ children, require, feature }: Props) {
  const { isPro, isLite } = usePermissions()
  const navigate = useNavigate()

  const hasAccess = require === 'pro' ? isPro : isLite
  if (hasAccess) return <>{children}</>

  const cfg = CONFIG[require]

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="max-w-sm space-y-5">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
            {cfg.icon}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badgeClass}`}>
              {cfg.badge}
            </span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            {feature ? `${feature} — ` : ''}{cfg.title}
          </h2>
          <p className="text-sm text-gray-500">{cfg.desc}</p>
        </div>

        <button
          onClick={() => navigate('/membership')}
          className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold py-3 rounded-xl transition"
        >
          <Lock size={14} />
          {cfg.cta}
        </button>

        <p className="text-xs text-gray-400">
          Trial 14 hari gratis tersedia untuk fitur Pro
        </p>
      </div>
    </div>
  )
}
