import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Wifi, WifiOff, RefreshCw, AlertTriangle, Maximize, Minimize, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Modal from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { requestPersistentStorage } from '@/lib/storage'
import { useWakeLock } from '@/pages/pos/useWakeLock'
import { availableServiceTypes } from '@/pages/pos/orderArchetype'
import { useAuthStore } from '@/store/authStore'
import { useOutletStore } from '@/store/outletStore'
import { useCartStore, computeTotals } from '@/store/cartStore'
import { usePosSessionStore } from '@/store/posSessionStore'
import { useHeldOrdersStore } from '@/store/heldOrdersStore'
import { getActiveShiftForCashier } from '@/api/pos'
import { useCatalog } from '@/pages/pos/useCatalog'
import { usePendingSync } from '@/pages/pos/usePendingSync'
import ProductCatalog from '@/pages/pos/components/ProductCatalog'
import CartPanel from '@/pages/pos/components/CartPanel'
import AddToCartModal from '@/pages/pos/components/AddToCartModal'
import PaymentModal, { type PaymentSuccessInfo } from '@/pages/pos/components/PaymentModal'
import ReceiptModal, { type SaleSnapshot } from '@/pages/pos/components/ReceiptModal'
import HeldOrdersDrawer from '@/pages/pos/components/HeldOrdersDrawer'
import PendingDrawer from '@/pages/pos/components/PendingDrawer'
import CloseShiftModal from '@/pages/pos/components/CloseShiftModal'
import ShiftGate from '@/pages/pos/components/ShiftGate'
import type { Product } from '@/types'

export default function PosPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const outlet = useOutletStore((s) => s.selected)

  const { products, categories, paymentMethods, orderTypes, loading, syncing, refresh } =
    useCatalog(outlet?.id ?? null)
  const { online, pendingCount, conflictCount, syncing: flushing, sync } = usePendingSync(outlet?.id ?? null)

  // Cart + session
  const cartItems = useCartStore((s) => s.items)
  const addOrIncrement = useCartStore((s) => s.addOrIncrement)
  const replaceAll = useCartStore((s) => s.replaceAll)
  const clearCart = useCartStore((s) => s.clear)
  const orderTypeId = usePosSessionStore((s) => s.orderTypeId)
  const setOrderType = usePosSessionStore((s) => s.setOrderType)
  const setCustomerName = usePosSessionStore((s) => s.setCustomerName)
  const setTable = usePosSessionStore((s) => s.setTable)
  const heldOrders = useHeldOrdersStore((s) => s.orders)
  const hold = useHeldOrdersStore((s) => s.hold)

  // Active shift gate — sesi shift dibuka untuk kasir terpilih (lihat ShiftGate),
  // bukan untuk user JWT. Disimpan di posSessionStore.
  const sessionCashierId = usePosSessionStore((s) => s.cashierId)
  const sessionShiftId = usePosSessionStore((s) => s.shiftId)
  const startShift = usePosSessionStore((s) => s.startShift)
  const endShift = usePosSessionStore((s) => s.endShift)
  const hasActiveShift = !!sessionCashierId

  // Verifikasi sesi tersimpan masih valid (shift bisa saja sudah ditutup di
  // perangkat lain) — kalau tidak, paksa balik ke layar buka shift.
  useEffect(() => {
    if (!sessionCashierId) return
    let cancelled = false
    void getActiveShiftForCashier(sessionCashierId)
      .then((res) => {
        if (!cancelled && !res.data.data) endShift()
      })
      .catch(() => { /* offline: pertahankan sesi */ })
    return () => { cancelled = true }
  }, [sessionCashierId, endShift])

  // Tipe order mengikuti arketipe bisnis (sama persis dengan app) — mis. retail
  // hanya Take Away, F&B Dine In + Take Away, dan Delivery hanya untuk bisnis
  // berarketipe delivery. Jadi opsi "Delivery" tidak muncul kecuali memang relevan.
  const archetype = user?.business?.business_type?.order_archetype
  const allowedTypeIds = useMemo(() => availableServiceTypes(archetype), [archetype])
  const visibleOrderTypes = useMemo(
    () => orderTypes.filter((ot) => allowedTypeIds.includes(ot.id)),
    [orderTypes, allowedTypeIds],
  )

  // Default order type — reset bila pilihan tersimpan tak lagi tersedia (mis.
  // sebelumnya Delivery, sekarang difilter).
  useEffect(() => {
    if (visibleOrderTypes.length === 0) return
    const valid = orderTypeId != null && visibleOrderTypes.some((ot) => ot.id === orderTypeId)
    if (!valid) setOrderType(visibleOrderTypes[0].id)
  }, [orderTypeId, visibleOrderTypes, setOrderType])

  // Minta persistent storage agar antrian offline tidak dihapus browser.
  useEffect(() => {
    void requestPersistentStorage()
  }, [])

  // Jaga layar tetap menyala selama kasir terbuka.
  useWakeLock(true)

  // Cegah kasir menutup tab saat masih ada transaksi belum tersync.
  useEffect(() => {
    if (pendingCount === 0 && conflictCount === 0) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [pendingCount, conflictCount])

  // Modal state
  const [pickedProduct, setPickedProduct] = useState<Product | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [heldOpen, setHeldOpen] = useState(false)
  const [pendingDrawerOpen, setPendingDrawerOpen] = useState(false)
  const [closeShiftOpen, setCloseShiftOpen] = useState(false)
  const [sale, setSale] = useState<SaleSnapshot | null>(null)
  const [checkoutSnapshot, setCheckoutSnapshot] = useState<{ items: typeof cartItems; total: number } | null>(null)

  const handleCheckout = () => {
    if (cartItems.length === 0) return
    if (!orderTypeId) {
      toast.error('Pilih tipe order')
      return
    }
    setCheckoutSnapshot({ items: [...cartItems], total: computeTotals(cartItems).total })
    setPaymentOpen(true)
  }

  const handlePaymentSuccess = (info: PaymentSuccessInfo) => {
    const snap = checkoutSnapshot
    setPaymentOpen(false)
    if (snap) {
      setSale({
        items: snap.items,
        totals: computeTotals(snap.items),
        methodName: info.methodName,
        amountReceived: info.amountReceived,
        change: info.change,
        offline: info.result.offline,
        businessName: user?.business.business_name ?? 'Loka Kasir',
        createdAt: Date.now(),
      })
    }
    usePosSessionStore.getState().resetAfterSale()
    void sync()
  }

  const handleHold = () => {
    if (cartItems.length === 0) return
    hold({
      label: usePosSessionStore.getState().customerName || `Order ${heldOrders.length + 1}`,
      items: [...cartItems],
      customerName: usePosSessionStore.getState().customerName,
      orderTypeId: orderTypeId ?? visibleOrderTypes[0]?.id ?? 1,
      tableId: usePosSessionStore.getState().tableId,
      notes: null,
    })
    clearCart()
    toast.success('Pesanan ditahan')
  }

  // Shift gate — ShiftGate sendiri yang memilih outlet (lalu menyetel
  // outletStore) & membuka/melanjutkan shift. Jadi selama belum ada shift aktif
  // ATAU outlet belum terpilih, tampilkan gerbang ini (bukan dead-end), lengkap
  // dengan tombol kembali via PosShell.
  if (!hasActiveShift || !outlet) {
    return (
      <PosShell
        online={online}
        onBack={() => navigate('/')}
        pendingCount={pendingCount}
        conflictCount={conflictCount}
        syncing={flushing}
        onSync={sync}
      >
        {/* Buka shift tampil sebagai popup modal (mirip bottom-sheet di
            aplikasi mobile), dengan latar POS yang ter-dim. */}
        <Modal
          open
          onClose={() => navigate('/')}
          title="Buka Shift"
          size="sm"
        >
          <ShiftGate embedded onOpened={(s) => startShift(s)} />
        </Modal>
      </PosShell>
    )
  }

  return (
    <PosShell
      online={online}
      onBack={() => navigate('/')}
      pendingCount={pendingCount}
      conflictCount={conflictCount}
      syncing={flushing || syncing}
      onSync={sync}
      onRefreshCatalog={refresh}
      onOpenPending={() => setPendingDrawerOpen(true)}
      onCloseShift={() => setCloseShiftOpen(true)}
    >
      <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_400px]">
        {/* Catalog */}
        <div className="overflow-hidden border-r border-border p-4">
          <ProductCatalog
            products={products}
            categories={categories}
            loading={loading}
            onPick={setPickedProduct}
          />
        </div>
        {/* Cart */}
        <div className="hidden h-full overflow-hidden bg-card lg:block">
          <CartPanel
            orderTypes={visibleOrderTypes}
            heldCount={heldOrders.length}
            onCheckout={handleCheckout}
            onHold={handleHold}
            onShowHeld={() => setHeldOpen(true)}
          />
        </div>
      </div>

      <AddToCartModal product={pickedProduct} onClose={() => setPickedProduct(null)} onAdd={addOrIncrement} />

      <PaymentModal
        open={paymentOpen}
        total={checkoutSnapshot?.total ?? computeTotals(cartItems).total}
        paymentMethods={paymentMethods}
        allowKasbon
        onClose={() => setPaymentOpen(false)}
        onSuccess={handlePaymentSuccess}
      />

      <ReceiptModal sale={sale} onClose={() => setSale(null)} />

      <HeldOrdersDrawer
        open={heldOpen}
        onClose={() => setHeldOpen(false)}
        onRecall={(order) => {
          replaceAll(order.items)
          setOrderType(order.orderTypeId)
          setCustomerName(order.customerName)
          setTable(order.tableId)
        }}
      />

      <PendingDrawer
        open={pendingDrawerOpen}
        onClose={() => setPendingDrawerOpen(false)}
        onSync={sync}
        online={online}
      />

      <CloseShiftModal
        open={closeShiftOpen}
        shiftId={sessionShiftId}
        cashierId={sessionCashierId}
        pendingCount={pendingCount}
        onClose={() => setCloseShiftOpen(false)}
        onClosed={() => {
          setCloseShiftOpen(false)
          endShift() // bersihkan sesi → balik ke layar buka shift
        }}
      />
    </PosShell>
  )
}

// ─── Shell with top bar (online status, sync, back) ──────────────────────────
function PosShell({
  children,
  online,
  onBack,
  pendingCount,
  conflictCount,
  syncing,
  onSync,
  onRefreshCatalog,
  onOpenPending,
  onCloseShift,
}: {
  children: React.ReactNode
  online: boolean
  onBack: () => void
  pendingCount: number
  conflictCount: number
  syncing: boolean
  onSync: () => void
  onRefreshCatalog?: () => void
  onOpenPending?: () => void
  onCloseShift?: () => void
}) {
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement)
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        setIsFullscreen(false)
      } else {
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
      }
    } catch {
      /* diblokir browser — abaikan */
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft size={18} />
          </Button>
          <span className="font-semibold">Kasir</span>
        </div>
        <div className="flex items-center gap-2">
          {conflictCount > 0 && (
            <button
              onClick={onOpenPending}
              className="flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/20"
            >
              <AlertTriangle size={13} /> {conflictCount} gagal
            </button>
          )}
          {pendingCount > 0 && (
            <button
              onClick={onOpenPending}
              className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
            >
              {pendingCount} antre
            </button>
          )}
          <span
            className={cn(
              'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
              online ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
            )}
          >
            {online ? <Wifi size={13} /> : <WifiOff size={13} />}
            {online ? 'Online' : 'Offline'}
          </span>
          <Button variant="outline" size="sm" disabled={syncing || !online} onClick={() => { onSync(); onRefreshCatalog?.() }}>
            <RefreshCw size={14} className={cn(syncing && 'animate-spin')} /> Sync
          </Button>
          {onCloseShift && (
            <Button variant="outline" size="sm" onClick={onCloseShift}>
              <LogOut size={14} /> Tutup Shift
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} title={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}>
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
