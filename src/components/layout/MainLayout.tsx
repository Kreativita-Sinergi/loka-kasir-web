import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import CommandPalette from './CommandPalette'
import MobileNavigation from './MobileNavigation'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useUIStore } from '@/store/uiStore'
import { useEffect } from 'react'
import { t } from '@/lib/i18n'
import { SubscriptionLockedBanner, SubscriptionPaywall } from '@/components/membership/SubscriptionLock'

export default function MainLayout() {
  const { mobileSidebarOpen, closeMobileSidebar } = useUIStore()
  const location = useLocation()

  useEffect(() => {
    closeMobileSidebar()
  }, [location.pathname, closeMobileSidebar])

  return (
    <div className="app-shell flex h-dvh min-h-0 overflow-hidden bg-background">
      <a href="#main-content" className="skip-link">{t('skipToContent')}</a>
      {/* Command palette global (Cmd/Ctrl+K) */}
      <CommandPalette />
      {/* Modal perpanjangan yang dibuka penolakan 402 SUBSCRIPTION_EXPIRED */}
      <SubscriptionPaywall />

      {/* Desktop Sidebar — always visible on md+ */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar — shadcn Sheet drawer */}
      <Sheet open={mobileSidebarOpen} onOpenChange={(open) => !open && closeMobileSidebar()}>
        <SheetContent side="left" className="p-0 w-[min(20rem,calc(100vw-2rem))]" hideClose aria-describedby={undefined}>
          <SheetTitle className="sr-only">Menu Loka Kasir</SheetTitle>
          <Sidebar onClose={closeMobileSidebar} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main id="main-content" tabIndex={-1} className="app-main flex-1 flex flex-col overflow-hidden min-h-0 min-w-0">
        {/* Langganan berakhir: mode lihat saja + ajakan perpanjang. */}
        <SubscriptionLockedBanner />
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden"><Outlet /></div>
        <MobileNavigation />
      </main>
    </div>
  )
}
