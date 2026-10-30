import { useLocation, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { usePermissions, PERMS } from '@/hooks/usePermissions'
import { useSubscriptionStatus } from '@/hooks/useSubscription'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { t } from '@/lib/i18n'

/** Halaman Langganan & Pembayaran hanya untuk pemegang settings.view (rute
 * /membership); yang lain diarahkan meminta pemilik memperpanjang. */
function useCanRenew() {
  const { can } = usePermissions()
  return can(PERMS.SETTINGS_VIEW)
}

/**
 * Pita tetap di atas konten saat langganan berakhir: usaha terkunci dalam mode
 * lihat saja. Semua halaman tetap bisa dibuka; penulisan ditolak server.
 */
export function SubscriptionLockedBanner() {
  const status = useSubscriptionStatus()
  const canRenew = useCanRenew()
  const navigate = useNavigate()
  const onBillingPage = useLocation().pathname.startsWith('/membership')

  if (status !== 'EXPIRED') return null

  return (
    <div role="status" className="flex shrink-0 items-center gap-3 border-b border-destructive/20 bg-destructive-subtle px-4 py-2 lg:px-6">
      <Lock size={15} className="shrink-0 text-destructive" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-semibold text-destructive">{t('subLockedTitle')}</span>
        <span className="hidden text-muted-foreground sm:inline"> · {t('subLockedBody')}</span>
      </p>
      {onBillingPage ? null : canRenew ? (
        <Button size="sm" onClick={() => navigate('/membership')} className="shrink-0">
          {t('actionRenew')}
        </Button>
      ) : (
        <span className="shrink-0 text-xs font-semibold text-destructive">{t('subLockedAskOwner')}</span>
      )}
    </div>
  )
}

/**
 * Modal yang dibuka sekali oleh penolakan 402 SUBSCRIPTION_EXPIRED (lihat
 * lib/axios) — beberapa penolakan bersamaan hanya membuka satu modal.
 */
export function SubscriptionPaywall() {
  const open = useSubscriptionStore((s) => s.paywallOpen)
  const close = useSubscriptionStore((s) => s.closePaywall)
  const canRenew = useCanRenew()
  const navigate = useNavigate()

  return (
    <Modal open={open} onClose={close} title={t('subPaywallTitle')} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive-subtle">
            <Lock size={18} className="text-destructive" aria-hidden="true" />
          </div>
          <p className="text-sm text-muted-foreground">
            {canRenew ? t('subPaywallBody') : t('subPaywallStaffBody')}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={close} className="flex-1">
            {t('actionClose')}
          </Button>
          {canRenew && (
            <Button onClick={() => { close(); navigate('/membership') }} className="flex-1">
              {t('actionRenew')}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
