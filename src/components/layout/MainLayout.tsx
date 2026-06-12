import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useUIStore } from '@/store/uiStore'
import { useEffect } from 'react'

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
        <Outlet />
      </div>
    </div>
  )
}
