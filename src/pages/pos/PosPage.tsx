import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Wifi, WifiOff, RefreshCw, AlertTriangle, Maximize, Minimize, LogOut, HelpCircle, ShoppingCart, X, Smartphone } from 'lucide-react'
import { APK_DOWNLOAD_URL } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { useCoachmark } from '@/hooks/useCoachmark'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/input'
import { cn, formatCurrency } from '@/lib/utils'
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
  //
  // Selain itu, SINKRONKAN terminal sesi dengan terminal shift aktif yang
  // sebenarnya. Header X-Terminal-Id dipakai backend untuk mencari shift open;
  // bila terminal sesi (mis. tebakan saat buka, atau shift dibuka di app/
  // perangkat lain dengan terminal berbeda) ≠ terminal shift, transaksi ditolak
  // "NO_ACTIVE_SHIFT". Mengoreksinya di sini mencegah error itu saat bayar.
  useEffect(() => {
    if (!sessionCashierId) return
    let cancelled = false
    void getActiveShiftForCashier(sessionCashierId)
      .then((res) => {
        if (cancelled) return
        const shift = res.data.data
        // Backend balas `data: {}` (bukan null) saat tak ada shift → cek `id`.
        if (!shift || !shift.id) {
          endShift()
          return
        }
        const realTerminalId = shift.terminal?.id ?? null
        if (realTerminalId && realTerminalId !== usePosSessionStore.getState().terminalId) {
          usePosSessionStore.getState().setTerminal(realTerminalId)
        }
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
  const [cartSheetOpen, setCartSheetOpen] = useState(false)
  const [holdOpen, setHoldOpen] = useState(false)
  const [holdName, setHoldName] = useState('')
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
        kasbonDebt: info.kasbonDebt ?? 0,
        offline: info.result.offline,
        businessName: user?.business.business_name ?? 'Loka Kasir',
        queueNumber: info.result.queueNumber ?? null,
        customerName:
          info.result.customerName ??
          usePosSessionStore.getState().customer?.name ??
          usePosSessionStore.getState().customerName ??
          null,
        logoUrl: user?.business.image ?? null,
        createdAt: Date.now(),
      })
    }
    usePosSessionStore.getState().resetAfterSale()
    void sync()
  }

  // Tahan pesanan: minta nama pembeli dulu (samakan dgn aplikasi) agar mudah
  // dikenali saat di-recall.
  const handleHold = () => {
    if (cartItems.length === 0) return
    setHoldName(usePosSessionStore.getState().customerName ?? '')
    setHoldOpen(true)
  }

  const confirmHold = () => {
    if (cartItems.length === 0) {
      setHoldOpen(false)
      return
    }
    const name = holdName.trim()
    hold({
      label: name || `Order ${heldOrders.length + 1}`,
      items: [...cartItems],
      customerName: name || usePosSessionStore.getState().customerName,
      orderTypeId: orderTypeId ?? visibleOrderTypes[0]?.id ?? 1,
      tableId: usePosSessionStore.getState().tableId,
      notes: null,
    })
    clearCart()
    setHoldOpen(false)
    setHoldName('')
    toast.success(`Pesanan${name ? ` (${name})` : ''} ditahan`)
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
      enableTour
    >
      <div className="flex h-full flex-col">
        <AppRecommendationBanner />

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_400px]">
          {/* Catalog — padding bawah ekstra di mobile agar baris terakhir tidak
              tertutup bilah keranjang mengambang. */}
          <div className="overflow-hidden border-r border-border p-4 pb-24 lg:pb-4" data-tour="pos-catalog">
            <ProductCatalog
              products={products}
              categories={categories}
              loading={loading}
              onPick={setPickedProduct}
            />
          </div>
          {/* Cart — panel tetap di layar besar */}
          <div className="hidden h-full overflow-hidden bg-card lg:block" data-tour="pos-cart">
            <CartPanel
              orderTypes={visibleOrderTypes}
              heldCount={heldOrders.length}
              onCheckout={handleCheckout}
              onHold={handleHold}
              onShowHeld={() => setHeldOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* ── Mobile: bilah keranjang mengambang ─────────────────────────────
          Di layar < lg panel cart disembunyikan, jadi sediakan akses keranjang
          (dan tombol Bayar di dalam sheet) lewat bilah bawah ini. Selalu tampil
          agar jalur pembayaran jelas; saat kosong tetap bisa dibuka. */}
      {!cartSheetOpen && (
        <button
          onClick={() => setCartSheetOpen(true)}
          className={
            'fixed inset-x-3 bottom-3 z-30 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-lg lg:hidden ' +
            (cartItems.length > 0
              ? 'bg-primary text-primary-foreground'
              : 'border border-border bg-card text-muted-foreground')
          }
        >
          <span className="flex items-center gap-2 font-medium">
            <span className="relative">
              <ShoppingCart size={20} />
              {cartItems.length > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-primary">
                  {computeTotals(cartItems).itemCount}
                </span>
              )}
            </span>
            {cartItems.length > 0 ? 'Lihat Keranjang & Bayar' : 'Keranjang kosong'}
          </span>
          {cartItems.length > 0 && (
            <span className="font-bold">{formatCurrency(computeTotals(cartItems).total)}</span>
          )}
        </button>
      )}

      {/* Mobile: bottom-sheet keranjang */}
      {cartSheetOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setCartSheetOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-2xl bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="font-semibold">Keranjang</span>
              <Button variant="ghost" size="icon" onClick={() => setCartSheetOpen(false)}>
                <X size={18} />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <CartPanel
                orderTypes={visibleOrderTypes}
                heldCount={heldOrders.length}
                onCheckout={() => { setCartSheetOpen(false); handleCheckout() }}
                onHold={() => { setCartSheetOpen(false); handleHold() }}
                onShowHeld={() => { setCartSheetOpen(false); setHeldOpen(true) }}
              />
            </div>
          </div>
        </div>
      )}

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

      {/* Tahan pesanan — minta nama pembeli (samakan dgn aplikasi). */}
      <Modal open={holdOpen} onClose={() => setHoldOpen(false)} title="Tahan Pesanan" size="sm">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Masukkan nama pembeli agar mudah dikenali saat dipanggil kembali.
          </p>
          <Input
            autoFocus
            value={holdName}
            onChange={(e) => setHoldName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmHold()
            }}
            placeholder="Nama pembeli…"
          />
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setHoldOpen(false)}>
              Batal
            </Button>
            <Button className="flex-1" onClick={confirmHold}>
              Tahan
            </Button>
          </div>
        </div>
      </Modal>
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
  enableTour = false,
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
  /** Tur hanya aktif saat POS penuh (shift sudah dibuka), bukan di gerbang shift. */
  enableTour?: boolean
}) {
  // autoStart digate agar tutorial tidak muncul menimpa modal "Buka Shift".
  const { available: tourAvailable, start: startTutorial } = useCoachmark({ autoStart: enableTour })
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
          <Button variant="outline" size="sm" disabled={syncing || !online} onClick={() => { onSync(); onRefreshCatalog?.() }} data-tour="pos-sync">
            <RefreshCw size={14} className={cn(syncing && 'animate-spin')} /> <span className="hidden sm:inline">Sync</span>
          </Button>
          {onCloseShift && (
            <Button variant="outline" size="sm" onClick={onCloseShift} data-tour="pos-closeshift">
              <LogOut size={14} /> <span className="hidden sm:inline">Tutup Shift</span>
            </Button>
          )}
          {enableTour && tourAvailable && (
            <Button variant="ghost" size="icon" onClick={startTutorial} title="Tutorial halaman ini" data-tour="help-button">
              <HelpCircle size={16} />
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

// ─── Anjuran pakai aplikasi HP untuk kasir ───────────────────────────────────
// Web POS tetap didukung penuh (offline-first), tapi aplikasi Android memberi
// pengalaman terbaik untuk kasir: lebih andal saat offline, cetak struk ke
// printer Bluetooth, dan buka laci kas. Banner ini hanya ANJURAN — bisa ditutup
// dan tidak menghalangi transaksi.
const APP_TIP_KEY = 'pos_app_tip_dismissed'

function AppRecommendationBanner() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(APP_TIP_KEY) === '1')
  if (dismissed) return null

  const close = () => {
    localStorage.setItem(APP_TIP_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="flex items-center gap-3 border-b border-primary/20 bg-primary-subtle px-4 py-2 text-sm">
      <Smartphone size={18} className="shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-foreground">
        Untuk kasir yang lebih cepat &amp; andal —{' '}
        <span className="text-muted-foreground">cetak struk, laci kas, dan tetap jalan saat offline</span> —
        gunakan <span className="font-semibold">aplikasi HP Loka Kasir</span>.
      </p>
      <a
        href={APK_DOWNLOAD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
      >
        Download Aplikasi
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
