import {
  Smartphone, Monitor, BarChart2, Settings, Users,
  ShoppingBag, Printer, Clock, Package, Zap,
  Sparkles, Building2, Tag, CreditCard, Layers,
  ArrowRight, ChevronDown, ChevronUp, ShieldCheck,
  GitBranch, Terminal, Fingerprint, Store,
} from 'lucide-react'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import { cn } from '@/lib/utils'

interface Feature {
  icon: React.ReactNode
  title: string
  description: string
  comingSoon?: boolean
}

const appFeatures: Feature[] = [
  { icon: <ShoppingBag size={16} />, title: 'Buat Order', description: 'Proses pesanan dengan cepat dari kasir — produk, varian, bundle, modifikasi' },
  { icon: <CreditCard size={16} />, title: 'Pembayaran', description: 'Tunai, QRIS, kartu, transfer bank — semua metode dalam satu layar' },
  { icon: <Printer size={16} />, title: 'Cetak Struk', description: 'Cetak otomatis ke printer thermal Bluetooth atau USB' },
  { icon: <Clock size={16} />, title: 'Shift Kasir', description: 'Buka/tutup shift, input kas awal, laporan per sesi shift' },
  { icon: <ShieldCheck size={16} />, title: 'Login PIN', description: 'Setiap kasir login dengan PIN 4-digit — tidak perlu email/password setiap hari' },
  { icon: <Terminal size={16} />, title: 'Terminal Terikat', description: 'Satu perangkat → satu terminal → data shift terisolasi per kasir' },
]

const appScreenshots = [
  {
    title: 'Layar Transaksi (Grid)',
    img: '/screenshots/app-order-grid.png',
    desc: 'Antarmuka kasir yang bersih dengan dukungan Grid view untuk identifikasi produk cepat.',
  },
  {
    title: 'Layar Transaksi (List)',
    img: '/screenshots/app-order-list.png',
    desc: 'Tampilan list untuk melihat SKU dan detail stok produk secara langsung saat transaksi.',
  },
  {
    title: 'Riwayat Transaksi',
    img: '/screenshots/app-history.png',
    desc: 'Pantau semua transaksi harian, status pembayaran, dan kelola refund langsung dari perangkat.',
  },
  {
    title: 'Manajemen Shift',
    img: '/screenshots/app-shift-summary.png',
    desc: 'Laporan ringkasan kas yang akurat di setiap akhir sesi untuk transparansi keuangan.',
  },
  {
    title: 'Pengaturan Perangkat',
    img: '/screenshots/app-settings.png',
    desc: 'Pusat konfigurasi printer thermal, laci uang, dan sinkronisasi data dari server.',
  },
]

const webFeatures: Feature[] = [
  { icon: <Package size={16} />, title: 'Manajemen Produk', description: 'Kelola produk, varian, harga, stok, diskon, dan bundle secara massal' },
  { icon: <BarChart2 size={16} />, title: 'Laporan & Analitik', description: 'Tren pendapatan, produk terlaris, jam ramai, dan laporan keuangan per shift' },
  { icon: <Tag size={16} />, title: 'Promo & Diskon', description: 'Atur diskon, promo, aturan harga — berlaku otomatis di App Kasir' },
  { icon: <Users size={16} />, title: 'Manajemen Karyawan', description: 'Tambah, edit, atur role dan jadwal shift per karyawan' },
  { icon: <ShieldCheck size={16} />, title: 'Hak Akses (RBAC)', description: 'Owner atur role: kasir hanya bisa transaksi, gudang hanya stok, koki hanya KDS' },
  { icon: <GitBranch size={16} />, title: 'Multi Outlet', description: 'Kelola banyak cabang dari satu akun — filter data per outlet' },
  { icon: <Settings size={16} />, title: 'Setting Bisnis', description: 'Konfigurasi metode pembayaran, tipe order, meja, terminal' },
]

const levelUpFeatures: Feature[] = [
  {
    icon: <Sparkles size={16} />,
    title: 'Smart Insights',
    description: '"Produk ini jarang laku" · "Jam 7–9 paling ramai" · "Margin turun minggu ini"',
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

// ─── App Flow Steps ───────────────────────────────────────────────────────────

interface FlowStep {
  step: number
  actor: 'owner' | 'kasir'
  where: 'web' | 'app'
  title: string
  description: string
}

const ownerSetupFlow: FlowStep[] = [
  {
    step: 1, actor: 'owner', where: 'web',
    title: 'Daftar & Login Web Admin',
    description: 'Owner daftar via email+password. Set nama bisnis, tipe usaha (FNB/Retail/Jasa).',
  },
  {
    step: 2, actor: 'owner', where: 'web',
    title: 'Buat Outlet',
    description: 'Buat minimal 1 outlet (lokasi toko). Setiap outlet punya stok & data sendiri.',
  },
  {
    step: 3, actor: 'owner', where: 'web',
    title: 'Tambah Karyawan & Atur Role',
    description: 'Buat akun karyawan (Kasir, Koki, Gudang). Atur role → otomatis mengunci fitur yang tidak relevan.',
  },
  {
    step: 4, actor: 'owner', where: 'web',
    title: 'Input Produk & Stok',
    description: 'Tambah produk, varian, harga, kategori, diskon. Stok akan muncul otomatis di App Kasir.',
  },
  {
    step: 5, actor: 'owner', where: 'app',
    title: 'Bind Terminal di App Kasir',
    description: 'Owner login di tablet/HP kasir → pilih outlet → pilih terminal → sistem terikat ke perangkat ini.',
  },
  {
    step: 6, actor: 'kasir', where: 'app',
    title: 'Kasir Login PIN & Buka Shift',
    description: 'Setiap hari kasir login dengan PIN 4-digit → input kas awal → shift terbuka → siap transaksi.',
  },
]

const dailyFlow: FlowStep[] = [
  {
    step: 1, actor: 'kasir', where: 'app',
    title: 'Login PIN Harian',
    description: 'Kasir masukkan PIN 4-digit. Jika shift belum ada, langsung diminta buka shift & input kas awal.',
  },
  {
    step: 2, actor: 'kasir', where: 'app',
    title: 'Proses Order',
    description: 'Pilih produk → tambah ke keranjang → pilih tipe order (makan di tempat/bawa pulang/delivery).',
  },
  {
    step: 3, actor: 'kasir', where: 'app',
    title: 'Pembayaran & Struk',
    description: 'Pilih metode bayar → input nominal → cetak struk otomatis. Stok berkurang real-time.',
  },
  {
    step: 4, actor: 'kasir', where: 'app',
    title: 'Kunci Kasir (Ganti Shift)',
    description: 'Tap "Kunci Kasir" → layar PIN muncul. Kasir berikutnya login PIN tanpa perlu setup ulang.',
  },
  {
    step: 5, actor: 'kasir', where: 'app',
    title: 'Tutup Shift',
    description: 'Akhir shift: tutup shift → hitung kas akhir → laporan shift tersimpan & bisa dilihat di Web Admin.',
  },
  {
    step: 6, actor: 'owner', where: 'web',
    title: 'Pantau Laporan di Web',
    description: 'Owner buka Web Admin → dashboard → laporan keuangan per shift → analitik tren → tidak perlu di toko.',
  },
]

// ─── FAQ ─────────────────────────────────────────────────────────────────────

interface FaqItem {
  q: string
  a: string
}

const faqs: FaqItem[] = [
  {
    q: 'Apa bedanya App Kasir dan Web Admin?',
    a: 'App Kasir adalah alat operasional harian untuk kasir di toko — proses order, bayar, cetak struk, buka/tutup shift. Web Admin adalah pusat kendali untuk pemilik bisnis — pantau laporan, atur produk & harga, kelola karyawan, analitik. Keduanya terhubung real-time.',
  },
  {
    q: 'Apakah kasir perlu login ulang setiap hari?',
    a: 'Tidak. Perangkat terikat ke terminal secara permanen. Kasir hanya perlu memasukkan PIN 4-digit setiap kali membuka sesi. PIN berbeda per karyawan — owner tidak perlu terlibat sama sekali untuk operasi harian.',
  },
  {
    q: 'Apa itu "Terminal" dan kenapa perlu di-bind?',
    a: 'Terminal adalah identitas perangkat kasir (tablet/HP). Proses bind menghubungkan perangkat fisik ke satu terminal di sistem — memastikan data shift, stok, dan struk terikat ke lokasi yang benar. Satu perangkat = satu terminal.',
  },
  {
    q: 'Bagaimana kalau ada 2 kasir yang bergantian di 1 perangkat?',
    a: 'Gunakan fitur "Kunci Kasir" — layar kembali ke PIN. Kasir berikutnya login dengan PIN-nya sendiri dan shift baru terbuka secara otomatis. Data setiap kasir terpisah per sesi shift.',
  },
  {
    q: 'Apakah stok bisa dikelola per outlet?',
    a: 'Ya. Setiap outlet memiliki stok sendiri. Stok otomatis berkurang setiap transaksi di outlet tersebut. Untuk memindahkan stok antar outlet, gunakan fitur Transfer Stok di menu Inventori.',
  },
  {
    q: 'Siapa saja yang bisa akses Web Admin?',
    a: 'Owner dan Manager bisa mengakses semua fitur termasuk laporan keuangan dan RBAC. Kasir/Koki/Gudang login via App, bukan Web Admin. Kasir dengan akses web hanya bisa lihat dashboard dan transaksi.',
  },
  {
    q: 'Apakah bisa multi-outlet dari satu akun?',
    a: 'Ya. Satu akun Owner bisa mengelola banyak outlet. Di Web Admin ada filter outlet — tampilkan data outlet tertentu atau semua outlet sekaligus. Masing-masing outlet punya terminal, stok, dan shift sendiri.',
  },
  {
    q: 'Apa yang terjadi kalau koneksi internet terputus saat transaksi?',
    a: 'App Kasir menyimpan data sesi lokal. Transaksi yang sudah diproses tetap tersimpan. Saat koneksi kembali, data akan disinkronkan ke server. Laporan di Web Admin akan diperbarui otomatis.',
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function ScreenshotCard({ screenshot }: { screenshot: (typeof appScreenshots)[0] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden group">
      <div className="aspect-[16/10] bg-gray-50 overflow-hidden relative">
        <img
          src={screenshot.img}
          alt={screenshot.title}
          className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="p-4">
        <p className="font-semibold text-gray-900 text-xs mb-1">{screenshot.title}</p>
        <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">{screenshot.desc}</p>
      </div>
    </div>
  )
}

function FlowCard({ step }: { step: FlowStep }) {
  const isWeb = step.where === 'web'
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
          isWeb ? 'bg-blue-600 text-white' : 'bg-gray-900 text-white',
        )}>
          {step.step}
        </div>
        <div className="w-px flex-1 bg-gray-100 mt-1" />
      </div>
      <div className="pb-5 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn(
            'text-[10px] font-semibold px-2 py-0.5 rounded-full',
            isWeb ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600',
          )}>
            {isWeb ? <span className="flex items-center gap-1"><Monitor size={10} /> Web Admin</span>
                   : <span className="flex items-center gap-1"><Smartphone size={10} /> App Kasir</span>}
          </span>
          <span className="text-[10px] text-gray-400">
            {step.actor === 'owner' ? 'Owner / Manager' : 'Kasir'}
          </span>
        </div>
        <p className="text-sm font-semibold text-gray-900">{step.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.description}</p>
      </div>
    </div>
  )
}

function FaqAccordion({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left bg-white hover:bg-gray-50 transition"
      >
        <p className="text-sm font-medium text-gray-900 flex-1">{item.q}</p>
        {open ? <ChevronUp size={14} className="shrink-0 text-gray-400" /> : <ChevronDown size={14} className="shrink-0 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-600 leading-relaxed pt-3">{item.a}</p>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Platform" subtitle="Ekosistem Loka Kasir untuk pemilik bisnis" />
      <div className="flex-1 overflow-y-auto p-6 space-y-8">

        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-2">
              Ekosistem Loka Kasir
            </p>
            <h1 className="text-2xl font-bold mb-3">Web Admin bukan optional</h1>
            <p className="text-blue-100 text-sm leading-relaxed">
              App Kasir adalah <span className="font-semibold text-white">tangan</span> — memproses transaksi harian.
              Web Admin adalah <span className="font-semibold text-white">otak</span> — menganalisis, mengelola, dan
              mengembangkan bisnis. Keduanya terhubung real-time dan saling melengkapi.
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
            <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
              <Fingerprint size={14} />
              <span className="text-xs font-medium">PIN Login = Kunci</span>
            </div>
            <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
              <Store size={14} />
              <span className="text-xs font-medium">Multi Outlet = Skalabel</span>
            </div>
          </div>
        </div>

        {/* App vs Web Features */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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

        {/* App Flow: Setup Awal */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center">
                <ArrowRight size={16} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Alur Setup Awal</p>
                <p className="text-xs text-gray-400">Dari daftar hingga siap transaksi pertama</p>
              </div>
            </div>
            <div className="p-5">
              {ownerSetupFlow.map((s) => (
                <FlowCard key={s.step} step={s} />
              ))}
            </div>
          </div>

          {/* App Flow: Operasi Harian */}
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500 rounded-xl flex items-center justify-center">
                <Clock size={16} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Alur Operasi Harian</p>
                <p className="text-xs text-gray-400">Rutinitas kasir setiap hari kerja</p>
              </div>
            </div>
            <div className="p-5">
              {dailyFlow.map((s) => (
                <FlowCard key={s.step} step={s} />
              ))}
            </div>
          </div>
        </div>

        {/* App Screenshots */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
              <Smartphone size={16} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Preview App Kasir</p>
              <p className="text-xs text-gray-400">Tampilan antarmuka nyata dari aplikasi kasir</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {appScreenshots.map((s) => (
              <ScreenshotCard key={s.title} screenshot={s} />
            ))}
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

        {/* FAQ */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
              <span className="text-blue-600 text-sm font-bold">?</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Pertanyaan Umum (Q&A)</p>
              <p className="text-xs text-gray-400">Hal yang sering ditanyakan pemilik bisnis</p>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {faqs.map((item, i) => (
              <FaqAccordion key={i} item={item} />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
