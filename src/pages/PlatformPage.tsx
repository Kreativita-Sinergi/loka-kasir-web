import {
  Smartphone, Monitor, BarChart2, Settings, Users,
  ShoppingBag, Printer, Clock, Package, Zap,
  Sparkles, Building2, Tag, CreditCard, Layers,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { cn } from '@/lib/utils'

interface Feature {
  icon: React.ReactNode
  title: string
  description: string
  comingSoon?: boolean
}

const appFeatures: Feature[] = [
  { icon: <ShoppingBag size={16} />, title: 'Create Order', description: 'Proses pesanan dengan cepat langsung dari kasir' },
  { icon: <CreditCard size={16} />, title: 'Payment', description: 'Terima berbagai metode pembayaran' },
  { icon: <Printer size={16} />, title: 'Print Struk', description: 'Cetak struk otomatis ke printer kasir' },
  { icon: <Clock size={16} />, title: 'Shift Kasir', description: 'Kelola shift dan laporan per kasir' },
]

const webFeatures: Feature[] = [
  { icon: <Package size={16} />, title: 'Product Management', description: 'Kelola produk, harga, dan stok secara massal' },
  { icon: <BarChart2 size={16} />, title: 'Analytics & Laporan', description: 'Pantau performa bisnis secara real-time' },
  { icon: <Tag size={16} />, title: 'Promo & Pricing Rules', description: 'Atur diskon, promo, dan aturan harga fleksibel' },
  { icon: <Users size={16} />, title: 'User & Role', description: 'Kelola karyawan dan hak akses tim' },
  { icon: <Settings size={16} />, title: 'Setting Bisnis', description: 'Konfigurasi bisnis dan preferensi sistem' },
]

const levelUpFeatures: Feature[] = [
  {
    icon: <Sparkles size={16} />,
    title: 'Smart Insights',
    description: '"Produk ini jarang laku" · "Jam 7-9 paling ramai" · "Margin turun minggu ini"',
    comingSoon: true,
  },
  {
    icon: <Zap size={16} />,
    title: 'Automation',
    description: 'Auto promo di jam tertentu · Auto diskon untuk slow-moving items',
    comingSoon: true,
  },
  {
    icon: <Building2 size={16} />,
    title: 'Multi Outlet Control',
    description: 'Monitor semua cabang dari satu dashboard · Bandingkan performa antar outlet',
    comingSoon: true,
  },
]

function FeatureCard({ feature, iconClass }: { feature: Feature; iconClass: string }) {
  return (
    <div className="flex gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
      <div className={cn('shrink-0 mt-0.5', iconClass)}>{feature.icon}</div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">{feature.title}</p>
          {feature.comingSoon && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-full">
              Segera
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{feature.description}</p>
      </div>
    </div>
  )
}

export default function PlatformPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Platform" subtitle="Ekosistem Loka Kasir untuk pemilik bisnis" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-2">
              Ekosistem Loka Kasir
            </p>
            <h1 className="text-2xl font-bold mb-3">Web Admin bukan optional</h1>
            <p className="text-blue-100 text-sm leading-relaxed">
              Kasir adalah <span className="font-semibold text-white">tangan</span> — memproses
              transaksi harian. Web Admin adalah <span className="font-semibold text-white">otak</span>
              {' '}— menganalisis, mengelola, dan mengembangkan bisnis. Keduanya saling melengkapi
              untuk bisnis yang lebih efisien dan profitable.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
              <Smartphone size={14} />
              <span className="text-xs font-medium">App Kasir = Tangan</span>
            </div>
            <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
              <Monitor size={14} />
              <span className="text-xs font-medium">Web Admin = Otak</span>
            </div>
          </div>
        </div>

        {/* App vs Web */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* App Kasir */}
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center">
                <Smartphone size={16} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">App Kasir</p>
                <p className="text-xs text-gray-400">Operasional harian di point-of-sale</p>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {appFeatures.map((f) => (
                <FeatureCard key={f.title} feature={f} iconClass="text-gray-500" />
              ))}
            </div>
          </div>

          {/* Web Admin */}
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                <Monitor size={16} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Web Admin</p>
                <p className="text-xs text-gray-400">Untuk pemilik bisnis — tanpa download app</p>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {webFeatures.map((f) => (
                <FeatureCard key={f.title} feature={f} iconClass="text-blue-600" />
              ))}
            </div>
          </div>
        </div>

        {/* Level Up */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center">
              <Layers size={16} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Level Up — Beda dari Kompetitor</p>
              <p className="text-xs text-gray-400">Fitur canggih yang sedang dikembangkan</p>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 xl:grid-cols-3 gap-3">
            {levelUpFeatures.map((f) => (
              <FeatureCard key={f.title} feature={f} iconClass="text-amber-500" />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
