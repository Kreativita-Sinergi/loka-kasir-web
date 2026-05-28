import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { X, FlaskConical } from 'lucide-react'
import Sidebar from './Sidebar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useUIStore } from '@/store/uiStore'
import { useEffect } from 'react'

const BANNER_KEY = 'close_testing_banner_dismissed'

function CloseTestingBanner() {
  const [visible, setVisible] = useState(() => localStorage.getItem(BANNER_KEY) !== '1')

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem(BANNER_KEY, '1')
    setVisible(false)
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-primary text-primary-foreground text-sm shrink-0">
      <FlaskConical size={15} className="shrink-0 opacity-80" />
      <p className="flex-1">
        <span className="font-semibold">Close Testing — </span>
        Pastikan email yang Anda gunakan untuk mendaftar sama dengan email Google di perangkat Android Anda, agar kami bisa menambahkan Anda ke daftar tester. Setelah ditambahkan, unduh aplikasinya di{' '}
        <a
          href="https://play.google.com/store/apps/details?id=com.loka.kasir"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 font-semibold hover:opacity-80 transition"
        >
          Google Play
        </a>
        .
      </p>
      <button
        onClick={dismiss}
        className="shrink-0 p-0.5 hover:opacity-70 transition"
        aria-label="Tutup"
      >
        <X size={15} />
      </button>
    </div>
  )
}

export default function MainLayout() {
  const { mobileSidebarOpen, closeMobileSidebar } = useUIStore()
  const location = useLocation()

  useEffect(() => {
    closeMobileSidebar()
  }, [location.pathname, closeMobileSidebar])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
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
        <CloseTestingBanner />
        <Outlet />
      </div>
    </div>
  )
}
