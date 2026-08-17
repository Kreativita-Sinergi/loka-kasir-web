import {
  Smartphone, Monitor, BarChart2, Settings, Users,
  ShoppingBag, Printer, Clock, Package, Zap,
  Sparkles, Building2, Tag, CreditCard, Layers,
  ArrowRight, ChevronDown, ChevronUp, ShieldCheck,
  GitBranch, Terminal, Fingerprint, Store,
  UserCheck, Wifi, ChefHat,
} from 'lucide-react'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import { cn } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface Feature {
  icon: React.ReactNode
  title: string
  description: string
  comingSoon?: boolean
}

// Fungsi, bukan konstanta: isinya memanggil t(), dan konstanta modul
// dievaluasi sekali saat berkas dimuat — bahasanya akan terkunci pada yang
// kebetulan aktif saat itu dan tidak ikut berubah saat pengguna menggantinya.
const appFeatures = (): Feature[] => [
  { icon: <ShoppingBag size={16} />, title: t('pfAppFeatOrder'), description: t('pfAppFeatOrderDesc') },
  { icon: <CreditCard size={16} />, title: t('pfAppFeatPayment'), description: t('pfAppFeatPaymentDesc') },
  { icon: <Printer size={16} />, title: t('pfAppFeatPrint'), description: t('pfAppFeatPrintDesc') },
  { icon: <Clock size={16} />, title: t('pfAppFeatShift'), description: t('pfAppFeatShiftDesc') },
  { icon: <UserCheck size={16} />, title: t('pfAppFeatAttendance'), description: t('pfAppFeatAttendanceDesc') },
  { icon: <ChefHat size={16} />, title: t('pfAppFeatKds'), description: t('pfAppFeatKdsDesc') },
  { icon: <ShieldCheck size={16} />, title: t('pfAppFeatPin'), description: t('pfAppFeatPinDesc') },
  { icon: <Wifi size={16} />, title: t('pfAppFeatOffline'), description: t('pfAppFeatOfflineDesc') },
  { icon: <Terminal size={16} />, title: t('pfAppFeatTerminal'), description: t('pfAppFeatTerminalDesc') },
]

// Fungsi, bukan konstanta: isinya memanggil t(), dan konstanta modul
// dievaluasi sekali saat berkas dimuat — bahasanya akan terkunci pada yang
// kebetulan aktif saat itu dan tidak ikut berubah saat pengguna menggantinya.
const appScreenshots = () => [
  {
    title: t('pfShotGrid'),
    img: '/screenshots/app-order-grid.png',
    desc: t('pfShotGridDesc'),
  },
  {
    title: t('pfShotList'),
    img: '/screenshots/app-order-list.png',
    desc: t('pfShotListDesc'),
  },
  {
    title: t('navTransactions'),
    img: '/screenshots/app-history.png',
    desc: t('pfShotHistoryDesc'),
  },
  {
    title: t('pfShotShift'),
    img: '/screenshots/app-shift-summary.png',
    desc: t('pfShotShiftDesc'),
  },
  {
    title: t('pfShotDevice'),
    img: '/screenshots/app-settings.png',
    desc: t('pfShotDeviceDesc'),
  },
]

// Fungsi, bukan konstanta: isinya memanggil t(), dan konstanta modul
// dievaluasi sekali saat berkas dimuat — bahasanya akan terkunci pada yang
// kebetulan aktif saat itu dan tidak ikut berubah saat pengguna menggantinya.
const webFeatures = (): Feature[] => [
  { icon: <Package size={16} />, title: t('pfWebFeatProduct'), description: t('pfWebFeatProductDesc') },
  { icon: <BarChart2 size={16} />, title: t('pfWebFeatReports'), description: t('pfWebFeatReportsDesc') },
  { icon: <Sparkles size={16} />, title: t('pfWebFeatInsights'), description: t('pfWebFeatInsightsDesc') },
  { icon: <Tag size={16} />, title: t('pfWebFeatPromo'), description: t('pfWebFeatPromoDesc') },
  { icon: <Users size={16} />, title: t('pfWebFeatStaff'), description: t('pfWebFeatStaffDesc') },
  { icon: <ShieldCheck size={16} />, title: t('pfWebFeatRbac'), description: t('pfWebFeatRbacDesc') },
  { icon: <GitBranch size={16} />, title: t('pfWebFeatMultiOutlet'), description: t('pfWebFeatMultiOutletDesc') },
  { icon: <Settings size={16} />, title: t('pfWebFeatOutletSettings'), description: t('pfWebFeatOutletSettingsDesc') },
]

// Fungsi, bukan konstanta: isinya memanggil t(), dan konstanta modul
// dievaluasi sekali saat berkas dimuat — bahasanya akan terkunci pada yang
// kebetulan aktif saat itu dan tidak ikut berubah saat pengguna menggantinya.
const levelUpFeatures = (): Feature[] => [
  {
    icon: <Sparkles size={16} />,
    title: t('pfWebFeatInsights'),
    description: t('pfLevelInsightsDesc'),
  },
  {
    icon: <Building2 size={16} />,
    title: t('pfLevelMultiOutlet'),
    description: t('pfLevelMultiOutletDesc'),
  },
  {
    icon: <Zap size={16} />,
    title: t('pfAutomationTitle'),
    description: t('pfAutomationDesc'),
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

// Fungsi, bukan konstanta: isinya memanggil t(), dan konstanta modul
// dievaluasi sekali saat berkas dimuat — bahasanya akan terkunci pada yang
// kebetulan aktif saat itu dan tidak ikut berubah saat pengguna menggantinya.
const ownerSetupFlow = (): FlowStep[] => [
  {
    step: 1, actor: 'owner', where: 'web',
    title: t('pfSetup1'),
    description: t('pfSetup1Desc'),
  },
  {
    step: 2, actor: 'owner', where: 'web',
    title: t('outletCreate'),
    description: t('pfSetup2Desc'),
  },
  {
    step: 3, actor: 'owner', where: 'web',
    title: t('pfSetup3'),
    description: t('pfSetup3Desc'),
  },
  {
    step: 4, actor: 'owner', where: 'web',
    title: t('pfSetup4'),
    description: t('pfSetup4Desc'),
  },
  {
    step: 5, actor: 'owner', where: 'app',
    title: t('pfSetup5'),
    description: t('pfSetup5Desc'),
  },
  {
    step: 6, actor: 'kasir', where: 'app',
    title: t('pfSetup6'),
    description: t('pfSetup6Desc'),
  },
]

// Fungsi, bukan konstanta: isinya memanggil t(), dan konstanta modul
// dievaluasi sekali saat berkas dimuat — bahasanya akan terkunci pada yang
// kebetulan aktif saat itu dan tidak ikut berubah saat pengguna menggantinya.
const dailyFlow = (): FlowStep[] => [
  {
    step: 1, actor: 'kasir', where: 'app',
    title: t('pfDaily1'),
    description: t('pfDaily1Desc'),
  },
  {
    step: 2, actor: 'kasir', where: 'app',
    title: t('pfDaily2'),
    description: t('pfDaily2Desc'),
  },
  {
    step: 3, actor: 'kasir', where: 'app',
    title: t('pfDaily3'),
    description: t('pfDaily3Desc'),
  },
  {
    step: 4, actor: 'kasir', where: 'app',
    title: t('pfDaily4'),
    description: t('pfDaily4Desc'),
  },
  {
    step: 5, actor: 'kasir', where: 'app',
    title: t('pfDaily5'),
    description: t('pfDaily5Desc'),
  },
  {
    step: 6, actor: 'owner', where: 'web',
    title: t('pfDaily6'),
    description: t('pfDaily6Desc'),
  },
]

// ─── FAQ ─────────────────────────────────────────────────────────────────────

interface FaqItem {
  q: string
  a: string
}

// Fungsi, bukan konstanta: isinya memanggil t(), dan konstanta modul
// dievaluasi sekali saat berkas dimuat — bahasanya akan terkunci pada yang
// kebetulan aktif saat itu dan tidak ikut berubah saat pengguna menggantinya.
const faqs = (): FaqItem[] => [
  {
    q: t('pfFaq1Q'),
    a: t('pfFaq1A'),
  },
  {
    q: t('pfFaq2Q'),
    a: t('pfFaq2A'),
  },
  {
    q: t('pfFaq3Q'),
    a: t('pfFaq3A'),
  },
  {
    q: t('pfFaq4Q'),
    a: t('pfFaq4A'),
  },
  {
    q: t('pfFaq5Q'),
    a: t('pfFaq5A'),
  },
  {
    q: t('pfFaq6Q'),
    a: t('pfFaq6A'),
  },
  {
    q: t('pfFaq7Q'),
    a: t('pfFaq7A'),
  },
  {
    q: t('pfFaq8Q'),
    a: t('pfFaq8A'),
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeatureCard({ feature, iconClass }: { feature: Feature; iconClass: string }) {
  return (
    <div className="flex gap-3 p-3 rounded-xl border border-border bg-muted">
      <div className={cn('shrink-0 mt-0.5', iconClass)}>{feature.icon}</div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground">{feature.title}</p>
          {feature.comingSoon && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-full">
              {t('statusComingSoon')}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{feature.description}</p>
      </div>
    </div>
  )
}

function ScreenshotCard({ screenshot }: { screenshot: ReturnType<typeof appScreenshots>[0] }) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden group">
      <div className="aspect-[16/10] bg-muted overflow-hidden relative">
        <img
          src={screenshot.img}
          alt={screenshot.title}
          className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="p-4">
        <p className="font-semibold text-foreground text-xs mb-1">{screenshot.title}</p>
        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{screenshot.desc}</p>
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
        <div className="w-px flex-1 bg-muted mt-1" />
      </div>
      <div className="pb-5 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn(
            'text-[10px] font-semibold px-2 py-0.5 rounded-full',
            isWeb ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground',
          )}>
            {isWeb ? <span className="flex items-center gap-1"><Monitor size={10} /> {t('pfWebAdmin')}</span>
                   : <span className="flex items-center gap-1"><Smartphone size={10} /> {t('pfRegisterApp')}</span>}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {step.actor === 'owner' ? t('pfOwnerManager') : 'Kasir'}
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground">{step.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
      </div>
    </div>
  )
}

function FaqAccordion({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left bg-card hover:bg-muted transition"
      >
        <p className="text-sm font-medium text-foreground flex-1">{item.q}</p>
        {open ? <ChevronUp size={14} className="shrink-0 text-muted-foreground" /> : <ChevronDown size={14} className="shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 bg-muted border-t border-border">
          <p className="text-xs text-muted-foreground leading-relaxed pt-3">{item.a}</p>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('navPlatform')} subtitle={t('pfPageSubtitle')} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">

        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-2">
              {t('pfEcosystemLabel')}
            </p>
            <h1 className="text-2xl font-bold mb-3">{t('pfWebNotOptional')}</h1>
            <p className="text-blue-100 text-sm leading-relaxed">
              {t('pfHandsBrainBody')}
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
              <Smartphone size={14} />
              <span className="text-xs font-medium">{t('pfAppIsHands')}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
              <Monitor size={14} />
              <span className="text-xs font-medium">{t('pfWebIsBrain')}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
              <Fingerprint size={14} />
              <span className="text-xs font-medium">{t('pfPinPerCashier')}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
              <Store size={14} />
              <span className="text-xs font-medium">{t('pfWebFeatMultiOutlet')}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
              <Sparkles size={14} />
              <span className="text-xs font-medium">{t('pfWebFeatInsights')}</span>
            </div>
          </div>
        </div>

        {/* App vs Web Features */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center">
                <Smartphone size={16} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{t('pfRegisterApp')}</p>
                <p className="text-xs text-muted-foreground">{t('pfAppDailyOps')}</p>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {appFeatures().map((f) => (
                <FeatureCard key={f.title} feature={f} iconClass="text-muted-foreground" />
              ))}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                <Monitor size={16} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{t('pfWebAdmin')}</p>
                <p className="text-xs text-muted-foreground">{t('pfWebForOwners')}</p>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {webFeatures().map((f) => (
                <FeatureCard key={f.title} feature={f} iconClass="text-blue-600 dark:text-blue-400" />
              ))}
            </div>
          </div>
        </div>

        {/* App Flow: Setup Awal */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center">
                <ArrowRight size={16} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{t('pfSetupFlow')}</p>
                <p className="text-xs text-muted-foreground">{t('pfSetupFlowDesc')}</p>
              </div>
            </div>
            <div className="p-5">
              {ownerSetupFlow().map((s) => (
                <FlowCard key={s.step} step={s} />
              ))}
            </div>
          </div>

          {/* App Flow: Operasi Harian */}
          <div className="bg-card rounded-2xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500 rounded-xl flex items-center justify-center">
                <Clock size={16} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{t('pfDailyFlow')}</p>
                <p className="text-xs text-muted-foreground">{t('pfDailyFlowDesc')}</p>
              </div>
            </div>
            <div className="p-5">
              {dailyFlow().map((s) => (
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
              <p className="font-semibold text-foreground text-sm">{t('pfAppPreview')}</p>
              <p className="text-xs text-muted-foreground">{t('pfAppPreviewDesc')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {appScreenshots().map((s) => (
              <ScreenshotCard key={s.title} screenshot={s} />
            ))}
          </div>
        </div>

        {/* Level Up */}
        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center">
              <Layers size={16} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{t('pfLevelUp')}</p>
              <p className="text-xs text-muted-foreground">{t('pfLevelUpDesc')}</p>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 xl:grid-cols-3 gap-3">
            {levelUpFeatures().map((f) => (
              <FeatureCard key={f.title} feature={f} iconClass="text-amber-500 dark:text-amber-400" />
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">?</span>
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{t('pfFaqTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('pfFaqDesc')}</p>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {faqs().map((item, i) => (
              <FaqAccordion key={i} item={item} />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
