import { Outlet, useLocation } from 'react-router-dom'
import { MessageCircle, AtSign, X } from 'lucide-react'
import Sidebar from './Sidebar'
import CommandPalette from './CommandPalette'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useUIStore } from '@/store/uiStore'
import { useEffect, useState } from 'react'
import { WHATSAPP_CONTACT_URL, INSTAGRAM_CONTACT_URL } from '@/lib/constants'

export default function MainLayout() {
  const { mobileSidebarOpen, closeMobileSidebar } = useUIStore()
  const location = useLocation()

  useEffect(() => {
    closeMobileSidebar()
  }, [location.pathname, closeMobileSidebar])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Command palette global (Cmd/Ctrl+K) */}
      <CommandPalette />

      {/* Desktop Sidebar — always visible on md+ */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar — shadcn Sheet drawer */}
      <Sheet open={mobileSidebarOpen} onOpenChange={(open) => !open && closeMobileSidebar()}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar onClose={closeMobileSidebar} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden capitalize-data min-w-0">
        <AppUpdateBanner />
        <Outlet />
      </div>
    </div>
  )
}

// ─── Info: minta aplikasi ke tim Loka Kasir ──────────────────────────────────
// Banner global (semua halaman dashboard) yang mengarahkan pengguna menghubungi
// tim Loka Kasir untuk meminta aplikasinya. Bisa ditutup; pilihan disimpan di localStorage.
const APP_REQUEST_BANNER_KEY = 'app_request_banner_dismissed'

function AppUpdateBanner() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(APP_REQUEST_BANNER_KEY) === '1')
  if (dismissed) return null

  const close = () => {
    localStorage.setItem(APP_REQUEST_BANNER_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="flex items-center gap-3 border-b border-primary/20 bg-primary-subtle px-4 py-2 text-sm">
      <MessageCircle size={18} className="shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-foreground">
        <span className="font-semibold">Butuh aplikasi Loka Kasir?</span>{' '}
        <span className="text-muted-foreground">
          Hubungi tim kami terlebih dahulu via WhatsApp atau Instagram untuk meminta aplikasinya.
        </span>
      </p>
      <a
        href={WHATSAPP_CONTACT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
      >
        <MessageCircle size={14} /> WhatsApp
      </a>
      <a
        href={INSTAGRAM_CONTACT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex shrink-0 items-center gap-1 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
      >
        <AtSign size={14} /> Instagram
      </a>
      <button
        onClick={close}
        title="Tutup"
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted"
      >
        <X size={16} />
      </button>
    </div>
  )
}
