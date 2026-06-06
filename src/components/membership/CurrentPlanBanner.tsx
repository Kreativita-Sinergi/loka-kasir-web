import { Zap, Crown, XCircle, CheckCircle2, Gift } from 'lucide-react'
import { deriveStatus } from '@/store/subscriptionStore'
import { formatDate } from '@/lib/utils'
import type { Membership } from '@/types'

interface CurrentPlanBannerProps {
  membership: Membership | null | undefined
}

export default function CurrentPlanBanner({ membership }: CurrentPlanBannerProps) {
  const status = deriveStatus(membership)
  const tier   = membership?.tier ?? 'free'
  const days   = membership?.days_remaining ?? 0

  if (status === 'TRIAL') {
    return (
      <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-amber-200" />
              <span className="text-amber-100 text-sm font-semibold uppercase tracking-wide">Free Trial</span>
            </div>
            <p className="text-2xl font-bold">
              {days > 0 ? `${days} hari tersisa` : 'Berakhir hari ini'}
            </p>
            <p className="text-amber-100 text-sm mt-1">
              Kamu menikmati semua fitur <strong>PRO</strong> secara gratis.
              Pilih paket sebelum trial berakhir agar fitur tetap aktif.
            </p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Zap size={20} />
          </div>
        </div>
      </div>
    )
  }

  if (tier === 'pro') {
    return (
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown size={16} className="text-blue-200" />
              <span className="text-blue-100 text-sm font-semibold uppercase tracking-wide">Paket Pro</span>
            </div>
            <p className="text-2xl font-bold">Aktif</p>
            <p className="text-blue-100 text-sm mt-1">
              {membership?.end_date ? `Berlaku s/d ${formatDate(membership.end_date)}` : 'Semua fitur Pro tersedia.'}
            </p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Crown size={20} />
          </div>
        </div>
      </div>
    )
  }

  if (status === 'FREE') {
    return (
      <div className="bg-muted border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Gift size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground text-sm font-semibold uppercase tracking-wide">Paket Gratis</span>
            </div>
            <p className="text-lg font-bold text-foreground">500 transaksi/bulan</p>
            <p className="text-muted-foreground text-sm mt-1">
              Maks. 30 produk & 5 kategori. Upgrade ke Lite atau Pro untuk fitur lengkap.
            </p>
          </div>
          <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center shrink-0">
            <Gift size={20} className="text-muted-foreground" />
          </div>
        </div>
      </div>
    )
  }

  const isExpired = status === 'EXPIRED'
  return (
    <div className={`rounded-2xl p-5 shadow-sm border ${isExpired ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' : 'bg-muted border-border'}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isExpired
              ? <XCircle size={16} className="text-red-500 dark:text-red-400" />
              : <CheckCircle2 size={16} className="text-muted-foreground" />
            }
            <span className={`text-sm font-semibold uppercase tracking-wide ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
              {isExpired ? 'Langganan Kadaluarsa' : tier === 'lite' ? 'Paket Lite' : 'Paket'}
            </span>
          </div>
          <p className={`text-lg font-bold ${isExpired ? 'text-red-700 dark:text-red-400' : 'text-foreground'}`}>
            {isExpired ? 'Akses terbatas' : 'Fitur dasar aktif'}
          </p>
          <p className={`text-sm mt-1 ${isExpired ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground'}`}>
            {isExpired
              ? 'Langganan kamu telah berakhir. Pilih paket untuk melanjutkan.'
              : 'Upgrade ke Pro untuk kirim struk & laporan via WhatsApp.'
            }
          </p>
        </div>
      </div>
    </div>
  )
}
