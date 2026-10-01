import { useQuery } from '@tanstack/react-query'
import { Bell, CheckCircle2, Clock3, CreditCard, PackageSearch, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getShifts } from '@/api/shifts'
import { getUnreadCount } from '@/api/notifications'
import { formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'
import type { HomeData } from '@/types'

interface Props {
  home?: HomeData
  outletId?: string
}

export default function ActionCenterCard({ home, outletId }: Props) {
  const { data: shiftData } = useQuery({
    queryKey: ['dashboard-open-shifts', outletId],
    queryFn: () => getShifts({ status: 'open', limit: 20, outlet_id: outletId }),
    retry: false,
  })
  const { data: unreadData } = useQuery({
    queryKey: ['notification-unread-count'],
    queryFn: getUnreadCount,
    retry: false,
  })

  const lowStock = home?.low_stock?.length ?? 0
  const kasbon = home?.kasbon
  const openShifts = shiftData?.data?.data?.results?.filter((shift) => shift.status === 'open').length ?? 0
  const unread = unreadData?.data?.data?.count ?? 0

  const actions = [
    lowStock > 0 && {
      icon: PackageSearch,
      label: t('dashLowStockProducts', { count: lowStock }),
      href: '/inventory/current-stock',
      tone: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10',
    },
    (kasbon?.outstanding_count ?? 0) > 0 && {
      icon: CreditCard,
      label: t('dashKasbonOutstanding', {
        count: kasbon!.outstanding_count,
        amount: formatCurrency(kasbon!.outstanding_total),
      }),
      href: '/kasbon',
      tone: 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/10',
    },
    openShifts > 0 && {
      icon: Clock3,
      label: t('dashOpenShifts', { count: openShifts }),
      href: '/shifts',
      tone: 'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-500/10',
    },
    unread > 0 && {
      icon: Bell,
      label: t('dashUnreadNotifications', { count: unread }),
      href: '/notifications',
      tone: 'text-violet-700 bg-violet-50 dark:text-violet-300 dark:bg-violet-500/10',
    },
  ].filter(Boolean) as Array<{ icon: typeof Bell; label: string; href: string; tone: string }>

  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-semibold text-foreground">{t('dashActionTitle')}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{t('dashActionSubtitle')}</p>
      </div>
      {actions.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-4 text-sm text-muted-foreground">
          <CheckCircle2 size={18} className="shrink-0 text-success" />
          {t('dashActionAllClear')}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 divide-border">
          {actions.map(({ icon: Icon, label, href, tone }) => (
            <Link key={href} to={href} className="flex min-w-0 items-center gap-3 px-5 py-4 text-sm transition-colors hover:bg-muted/50">
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon size={16} /></span>
              <span className="min-w-0 flex-1 font-medium">{label}</span>
              <ChevronRight size={15} className="shrink-0 opacity-60" />
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
