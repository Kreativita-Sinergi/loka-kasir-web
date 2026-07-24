import { Outlet, useLocation } from 'react-router-dom'
import { Download, MessageCircle, X } from 'lucide-react'
import Sidebar from './Sidebar'
import CommandPalette from './CommandPalette'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useUIStore } from '@/store/uiStore'
import { useEffect, useState } from 'react'
import { APP_DOWNLOAD_URL, WHATSAPP_CONTACT_URL } from '@/lib/constants'

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

// ─── Info: download aplikasi Loka Kasir ──────────────────────────────────────
// Banner global (semua halaman dashboard) berisi tautan unduh APK Android.
// Bisa ditutup; pilihan disimpan di localStorage.
// Catatan: key sengaja berbeda dari banner lama ('app_request_banner_dismissed')
// agar pengguna yang sudah menutup banner "minta via WhatsApp" tetap melihat
// pesan barunya sekali.
const APP_REQUEST_BANNER_KEY = 'app_download_banner_dismissed'

function AppUpdateBanner() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(APP_REQUEST_BANNER_KEY) === '1')
  if (dismissed) return null

  const close = () => {
    localStorage.setItem(APP_REQUEST_BANNER_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="flex items-center gap-3 border-b border-primary/20 bg-primary-subtle px-4 py-2 text-sm">
      <Download size={18} className="shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-foreground">
        <span className="font-semibold">Butuh aplikasi Loka Kasir?</span>{' '}
        <span className="text-muted-foreground">
          Download langsung aplikasinya (APK Android) — tidak perlu minta ke admin lagi.
        </span>
      </p>
      <a
        href={APP_DOWNLOAD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
      >
        <Download size={14} /> Download APK
      </a>
      <a
        href={WHATSAPP_CONTACT_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Butuh bantuan pemasangan?"
        className="flex shrink-0 items-center gap-1 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
      >
        <MessageCircle size={14} /> Bantuan
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
