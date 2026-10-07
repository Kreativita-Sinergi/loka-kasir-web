import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Minus, Plus, Search, ShoppingCart, X, CheckCircle2, Clock, QrCode, XCircle, ReceiptText, ChevronRight } from 'lucide-react'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'
import {
  getPublicMenu,
  createPublicOrder,
  getStoreMenu,
  createStoreOrder,
  payPickupOrder,
  claimPickupPayment,
  PICKUP_EXPIRED_REASON,
  NO_SHOW_REASON,
  COUNTER_UNCONFIRMED_REASON,
  type PickupPayment,
  getPublicOrderStatus,
  getPublicRental,
  type PublicMenu,
  type PublicOrderResult,
  type SelfOrderItem,
} from '@/api/public'
import type { PriceTier, Product, ProductVariant } from '@/types'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { displayedText as titleCase } from '@/lib/textCase'
import { loadOrders, saveOrder, loadContact, saveContact, type SavedPublicOrder } from '@/lib/publicOrderHistory'
import { orderItemsFromCart, lineTotal, lineUnitPrice } from '@/lib/publicCart'
import RentalCard from './RentalCard'

interface CartLine {
  key: string
  name: string
  unitPrice: number
  /** Harga katalog tanpa add-on — dasar harga grosir. */
  basePrice: number
  tiers?: PriceTier[]
  qty: number
  payload: SelfOrderItem
  /** Produk asal baris ini — penanda jumlah di kartu menu ikut varian. */
  productId: string
}

/** Pencarian longgar: huruf besar-kecil dan spasi berlebih diabaikan. */
const normalize = (v: string) => v.toLowerCase().replace(/\s+/g, ' ').trim()

/** Inisial untuk produk tanpa foto — lebih mudah dikenali daripada kotak abu. */
const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')

/** Nama kategori dari server bisa huruf kecil semua ("makanan"). */

/** "table" = QR meja (/menu/:token), "pickup" = link pesan online (/o/:token). */
type MenuMode = 'table' | 'pickup'

/** Nomor WA yang masuk akal: 9–15 digit setelah simbol dibuang. Server tetap
 *  memeriksa ulang; ini hanya supaya pembeli tahu sebelum menekan kirim. */
const phoneLooksValid = (raw: string) => {
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 9 && digits.length <= 15
}

/** Harga satuan baris keranjang: biasa, katalog (dasar grosir), dan tingkatnya. */
type LinePrice = Pick<CartLine, 'unitPrice' | 'basePrice' | 'tiers'>

/** QR meja biasa: pesanan selama ini dianggap kunjungan yang sedang berjalan. */
const TABLE_VISIT_MS = 4 * 60 * 60 * 1000

const productPrice = (p: Product) => p.final_price ?? p.sell_price ?? 0
const variantPrice = (v: ProductVariant) => v.final_price ?? v.sell_price ?? 0

export default function PublicMenuPage({ mode = 'table' }: { mode?: MenuMode }) {
  const { token = '' } = useParams()
  const pickup = mode === 'pickup'
  const [cart, setCart] = useState<Record<string, CartLine>>({})
  const [customizing, setCustomizing] = useState<Product | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  // Nama & WA terakhir diisi ulang dari HP pembeli — pesan kedua kali tidak
  // perlu mengetik ulang.
  const [customerName, setCustomerName] = useState(() => loadContact().name)
  const [customerPhone, setCustomerPhone] = useState(() => loadContact().phone)
  const [serviceType, setServiceType] = useState<'pickup' | 'dine_in'>('pickup')
  // Cara bayar makan di tempat pesan online: QRIS di depan atau di kasir.
  const [dineInPay, setDineInPay] = useState<'qris' | 'counter'>('qris')
  const [notes, setNotes] = useState('')
  // ?order=<id> membuka status pesanan langsung — dipakai "Pesanan saya" untuk
  // pesanan dari meja/toko lain, dan bisa di-bookmark pembeli.
  const [searchParams] = useSearchParams()
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(() => searchParams.get('order'))
  const [historyOpen, setHistoryOpen] = useState(false)
  const [savedOrders, setSavedOrders] = useState<SavedPublicOrder[]>(() => loadOrders())
  // Patokan "kunjungan ini" untuk QR meja biasa, diambil sekali saat halaman dibuka.
  const [openedAt] = useState(() => Date.now())
  // Jenis pesanan yang dikirim — dipegang sendiri supaya halaman bayar tidak
  // bergantung pada data status yang belum dimuat atau tidak lengkap.
  const [placedService, setPlacedService] = useState<'pickup' | 'dine_in'>('dine_in')
  // Pesanan terkirim yang wajib dibayar di depan — bawa pulang, atau makan
  // di tempat di outlet yang menyalakan "bayar di depan".
  const [placedPrepay, setPlacedPrepay] = useState(false)

  const { data, isLoading, isError, error, refetch: refetchMenu } = useQuery({
    queryKey: ['public-menu', mode, token],
    queryFn: () => (pickup ? getStoreMenu(token) : getPublicMenu(token)),
    enabled: !!token,
    retry: false,
  })
  const menu: PublicMenu | undefined = data?.data?.data
  const queryClient = useQueryClient()
  // Meja rental: pesanan tampil di kartu meja, jadi setelah memesan halaman
  // tetap di menu alih-alih pindah ke layar status satu pesanan.
  const rentalTable = !pickup && !!menu?.rental
  // Keadaan meja rental yang dimuat ulang berkala oleh kartu meja — di sini
  // hanya dibaca dari cache yang sama, tanpa permintaan tambahan.
  const { data: liveRental } = useQuery({
    queryKey: ['public-rental', token],
    queryFn: async () => (await getPublicRental(token)).data.data,
    enabled: false,
  })
  const rentalSession = (liveRental ?? menu?.rental)?.session
  // Meja rental: daftar menu baru tampil setelah pembeli menekan "Tambah
  // pesanan" — yang datang untuk main melihat kartu mejanya dulu.
  const [menuOpen, setMenuOpen] = useState(false)
  const showMenu = !rentalTable || menuOpen
  // Bawa pulang dibayar QRIS di muka; toko tanpa QRIS hanya melayani makan
  // di tempat.
  const pickupAvailable = pickup && !!menu?.pickup_payment
  const effectiveService = pickupAvailable ? serviceType : 'dine_in'

  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string>('all')

  const lines = Object.values(cart)
  // Jumlah per produk (semua varian & add-on dijumlah) untuk penanda di kartu.
  const qtyByProduct = lines.reduce<Record<string, number>>((acc, l) => {
    acc[l.productId] = (acc[l.productId] ?? 0) + l.qty
    return acc
  }, {})
  const totalQty = lines.reduce((s, l) => s + l.qty, 0)
  const totalPrice = lines.reduce((s, l) => s + lineTotal(l), 0)

  // Bayar di tempat (pesan online, makan di tempat saja). Tanpa QRIS toko itu
  // satu-satunya cara bayar; di atas batas nominal hanya QRIS yang tersedia.
  const qrisDineIn = !!menu?.prepay_dine_in
  const counterMax = menu?.pay_at_counter_max ?? 0
  const counterOverLimit = counterMax > 0 && totalPrice > counterMax
  const counterAllowed = pickup && !!menu?.pay_at_counter && (!counterOverLimit || !qrisDineIn)
  const effectiveDineInPay: 'qris' | 'counter' = !qrisDineIn ? 'counter' : counterAllowed ? dineInPay : 'qris'
  const payAtCounter = pickup && effectiveService === 'dine_in' && effectiveDineInPay === 'counter'

  const orderMut = useMutation({
    mutationFn: () =>
      pickup
        ? createStoreOrder(token, {
            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim(),
            service_type: effectiveService,
            pay_at_counter: payAtCounter,
            notes: notes.trim() || null,
            items: orderItemsFromCart(lines),
          })
        : createPublicOrder(token, {
            customer_name: customerName.trim() || null,
            customer_phone: customerPhone.trim() || null,
            notes: notes.trim() || null,
            items: orderItemsFromCart(lines),
          }),
    onSuccess: (res) => {
      setPlacedService(pickup ? effectiveService : 'dine_in')
      // Yang menentukan adalah SERVER — keputusan bayar-di-depan tercatat di
      // pesanannya. Menebak dari menu pernah membuat halaman membuka QRIS
      // untuk pesanan yang server anggap bayar biasa, lalu buntu di
      // "Pesanan belum diterima kasir".
      const prepay = !!res.data.data.requires_prepayment || (pickup && effectiveService === 'pickup')
      setPlacedPrepay(prepay)
      if (rentalTable && !prepay) {
        toast.success(t('rentalOrderSent'))
        setMenuOpen(false)
        void queryClient.invalidateQueries({ queryKey: ['public-rental', token] })
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        setPlacedOrderId(res.data.data.transaction_id)
      }
      if (menu) {
        saveOrder({
          id: res.data.data.transaction_id,
          token,
          mode,
          businessName: menu.business_name,
          outletName: menu.outlet_name,
          tableNumber: pickup ? undefined : menu.table_number,
          createdAt: new Date().toISOString(),
          items: lines.map((l) => `${l.qty}× ${l.name}`),
          total: totalPrice,
        })
        setSavedOrders(loadOrders())
      }
      if (customerName.trim() || customerPhone.trim()) {
        saveContact({ name: customerName.trim(), phone: customerPhone.trim() })
      }
      setCart({})
      setCartOpen(false)
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
      // Ditolak karena stok baru saja habis: muat ulang menu supaya produk
      // yang habis ikut hilang dari layar pembeli.
      void refetchMenu()
    },
  })

  const addLine = (key: string, name: string, price: LinePrice, payload: SelfOrderItem, productId: string) => {
    setCart((prev) => {
      const existing = prev[key]
      return { ...prev, [key]: existing
        ? { ...existing, qty: existing.qty + 1 }
        : { key, name, ...price, qty: 1, payload, productId } }
    })
  }

  const changeQty = (key: string, delta: number) => {
    setCart((prev) => {
      const line = prev[key]
      if (!line) return prev
      const qty = line.qty + delta
      if (qty <= 0) {
        const rest = { ...prev }
        delete rest[key]
        return rest
      }
      return { ...prev, [key]: { ...line, qty } }
    })
  }

  // Simple add: produk tanpa varian & tanpa add-on langsung masuk keranjang.
  const quickAdd = (p: Product) => {
    if (p.has_variant || (p.attributes && p.attributes.length > 0)) {
      setCustomizing(p)
      return
    }
    addLine(`p:${p.id}`, p.name, { unitPrice: productPrice(p), basePrice: productPrice(p), tiers: p.price_tiers }, {
      item_type: 'PRODUCT', reference_id: p.id, quantity: 1, attributes: [],
    }, p.id)
    toast.success(`${p.name} ditambahkan`)
  }

  // Nama & WA wajib di kedua jalur. Pesan online: itulah satu-satunya cara
  // kasir memanggil pembeli. QR meja: kasir memakainya untuk mencocokkan dan
  // menggabungkan pesanan ke tagihan meja yang benar.
  const submitOrder = () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error(t(pickup ? 'menuPickupNeedContact' : 'menuTableNeedContact'))
      return
    }
    if (!phoneLooksValid(customerPhone)) { toast.error(t('menuPhoneInvalid')); return }
    orderMut.mutate()
  }

  // "Pesanan saya" di QR meja hanya memuat kunjungan yang sedang berjalan —
  // pesanan kunjungan lalu dari HP yang sama tidak ikut muncul lagi. Meja
  // rental memakai sesi mejanya (cocok per id pesanan, kebal selisih jam HP);
  // meja biasa tidak punya sesi, jadi kunjungan = beberapa jam terakhir.
  // Pesan online tetap menampilkan seluruh riwayat untuk melacak pesanan.
  const sessionOrderIds = new Set(
    rentalSession && rentalSession.status !== 'CANCELED' ? rentalSession.orders.map((o) => o.id) : [],
  )
  const visitCutoff = openedAt - TABLE_VISIT_MS
  const visibleOrders = pickup
    ? savedOrders
    : savedOrders.filter((o) => o.token === token && o.mode === mode && (rentalTable
      ? sessionOrderIds.has(o.id)
      : new Date(o.createdAt).getTime() > visitCutoff))

  const openSavedOrder = (o: SavedPublicOrder) => {
    setHistoryOpen(false)
    if (o.token === token && o.mode === mode) {
      setPlacedOrderId(o.id)
      return
    }
    // Pesanan dari meja/toko lain: buka di halamannya sendiri supaya nama
    // outlet, nomor meja, dan cara bayarnya benar.
    window.location.assign(`${o.mode === 'pickup' ? '/o' : '/menu'}/${o.token}?order=${o.id}`)
  }

  if (placedOrderId) {
    return (
      <OrderPlaced
        menu={menu}
        orderId={placedOrderId}
        pickup={pickup}
        placedPickup={placedService === 'pickup'}
        placedPrepay={placedPrepay}
      />
    )
  }

  if (isLoading) return <MenuSkeleton />
  if (isError || !menu) {
    return (
      <StatusShell tone="neutral" icon={<QrCode size={30} />} title={t('menuUnavailable')}>
        <p className="text-sm text-gray-500">{getErrorMessage(error)}</p>
      </StatusShell>
    )
  }

  const q = normalize(search)
  // Server lama mengirim null untuk outlet tanpa produk.
  const categories = menu.categories ?? []
  const sections = categories
    .filter((c) => activeCat === 'all' || (c.id ?? c.name) === activeCat)
    .map((c) => ({
      ...c,
      products: q
        ? c.products.filter((p) => normalize(`${p.name} ${p.description ?? ''} ${c.name}`).includes(q))
        : c.products,
    }))
    .filter((c) => c.products.length > 0)

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Kepala toko */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
        <div className="max-w-2xl mx-auto px-4 pt-3.5 pb-6 flex items-center gap-3">
          {menu.business_logo ? (
            <img src={menu.business_logo} alt="" className="w-10 h-10 rounded-xl object-cover bg-white/10 ring-2 ring-white/30" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/15 ring-2 ring-white/30 flex items-center justify-center text-sm font-bold">
              {initials(menu.business_name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold leading-tight truncate">{menu.business_name}</h1>
            <p className="text-xs text-white/80 truncate">{menu.outlet_name}</p>
          </div>
          {visibleOrders.length > 0 && (
            <button
              onClick={() => setHistoryOpen(true)}
              aria-label={t('menuMyOrders')}
              className="shrink-0 flex items-center gap-1 text-xs font-semibold bg-white/15 ring-1 ring-white/25 rounded-full px-3 py-1 active:bg-white/25"
            >
              <ReceiptText size={13} />
              {t('menuMyOrders')}
            </button>
          )}
          <span className="shrink-0 text-xs font-semibold bg-white/15 ring-1 ring-white/25 rounded-full px-3 py-1">
            {pickup ? t('menuPickupBadge') : t('menuTableBadge', { n: menu.table_number.toUpperCase() })}
          </span>
        </div>
      </div>

      {/* Pencarian + kategori — menempel saat digulir. */}
      {showMenu && (
      <div className="sticky top-0 z-10 -mt-4">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/70 p-1.5">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('menuSearchPlaceholder')}
                type="search"
                className="w-full pl-9 pr-9 py-2 text-sm bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              {search && (
                <button onClick={() => setSearch('')} aria-label={t('actionClose')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400">
                  <X size={14} />
                </button>
              )}
            </div>
            {categories.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pt-1.5 [scrollbar-width:none]">
                {[{ key: 'all', label: t('menuAllCategories') }, ...categories.map((c) => ({ key: c.id ?? c.name, label: titleCase(c.name) }))].map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setActiveCat(c.key)}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition ${activeCat === c.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Menu */}
      <div className="max-w-2xl mx-auto px-4 pt-3 space-y-5">
        {rentalTable && menu.rental && (
          <RentalCard
            token={token}
            tableNumber={menu.table_number}
            initial={menu.rental}
            renderPay={(orderId) => <PickupPay orderId={orderId} />}
          />
        )}
        {rentalTable && (
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={`w-full rounded-2xl py-3 font-semibold flex items-center justify-center gap-1.5 ${menuOpen
              ? 'bg-white text-gray-600 ring-1 ring-gray-200 active:bg-gray-50'
              : 'bg-white text-indigo-700 ring-1 ring-indigo-200 active:bg-indigo-50'}`}
          >
            {menuOpen ? <><X size={16} /> {t('rentalHideMenu')}</> : <><Plus size={16} /> {t('rentalAddOrder')}</>}
          </button>
        )}
        {showMenu && (<>
        {categories.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-16">{t('menuEmpty')}</p>
        )}
        {categories.length > 0 && sections.length === 0 && (
          <div className="text-center py-16">
            <Search size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">{t('menuNoMatch')}</p>
          </div>
        )}
        {sections.map((cat) => (
          <section key={cat.id ?? cat.name}>
            <div className="flex items-baseline justify-between mb-1.5 px-1">
              <h2 className="text-sm font-bold text-gray-900">{titleCase(cat.name)}</h2>
              <span className="text-xs text-gray-400">{t('menuItemsCount', { n: cat.products.length })}</span>
            </div>
            <div className="space-y-2">
              {cat.products.map((p) => {
                const qty = qtyByProduct[p.id] ?? 0
                const needsChoice = p.has_variant || (p.attributes && p.attributes.length > 0)
                return (
                  <div key={p.id} className="bg-white rounded-2xl ring-1 ring-gray-200/70 p-2.5 flex gap-3">
                    <button onClick={() => quickAdd(p)} className="shrink-0" aria-label={p.name}>
                      {p.image ? (
                        <img src={p.image} alt="" loading="lazy" className="w-16 h-16 rounded-xl object-cover bg-gray-100" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 text-indigo-600 font-bold flex items-center justify-center">
                          {initials(p.name)}
                        </div>
                      )}
                    </button>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <button onClick={() => quickAdd(p)} className="text-left">
                        <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{p.name}</p>
                        {p.description && <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{p.description}</p>}
                      </button>
                      <div className="mt-auto pt-1 flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(productPrice(p))}
                          {p.has_variant && <span className="text-[11px] text-gray-400 font-normal"> {t('menuPickVariant')}</span>}
                          {!p.has_variant && p.price_tiers && p.price_tiers.length > 0 && (
                            <span className="block text-[11px] font-medium text-emerald-600">
                              {t('menuWholesaleFrom', { qty: p.price_tiers[0].min_qty, price: formatCurrency(p.price_tiers[0].price) })}
                            </span>
                          )}
                        </p>
                        {needsChoice ? (
                          <button onClick={() => quickAdd(p)}
                            className={`h-8 px-3 rounded-full text-xs font-bold flex items-center gap-1 ${qty > 0 ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 active:bg-blue-100'}`}>
                            {qty > 0 ? <>{qty} · {t('menuChoose')}</> : <><Plus size={14} /> {t('menuChoose')}</>}
                          </button>
                        ) : qty > 0 ? (
                          <div className="flex items-center gap-1 bg-blue-600 text-white rounded-full p-0.5">
                            <button onClick={() => changeQty(`p:${p.id}`, -1)} aria-label="-" className="w-7 h-7 rounded-full flex items-center justify-center active:bg-white/15"><Minus size={14} /></button>
                            <span className="min-w-5 text-center text-sm font-bold">{qty}</span>
                            <button onClick={() => quickAdd(p)} aria-label="+" className="w-7 h-7 rounded-full flex items-center justify-center active:bg-white/15"><Plus size={14} /></button>
                          </div>
                        ) : (
                          <button onClick={() => quickAdd(p)} aria-label="+"
                            className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center active:bg-blue-100">
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
        </>)}
      </div>

      {/* Bilah keranjang */}
      {totalQty > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full max-w-2xl mx-auto bg-gray-900 text-white rounded-2xl pl-3 pr-5 py-3 flex items-center gap-3 shadow-xl active:scale-[0.99] transition animate-[public-fade-in_.2s_ease-out]"
          >
            <span className="relative w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <ShoppingCart size={18} />
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-blue-500 text-[11px] font-bold flex items-center justify-center">{totalQty}</span>
            </span>
            <span className="flex-1 text-left font-semibold">{t('menuViewOrder')}</span>
            <span className="font-bold">{formatCurrency(totalPrice)}</span>
          </button>
        </div>
      )}

      {customizing && (
        <CustomizeSheet
          product={customizing}
          onClose={() => setCustomizing(null)}
          onAdd={(key, name, price, payload) => addLine(key, name, price, payload, customizing.id)}
        />
      )}

      {cartOpen && (
        <CartSheet
          lines={lines}
          totalQty={totalQty}
          totalPrice={totalPrice}
          pickup={pickup}
          pickupAvailable={pickupAvailable}
          prepayDineIn={!!menu.prepay_dine_in && !payAtCounter}
          serviceType={effectiveService}
          onServiceType={setServiceType}
          counterOffered={pickup && !!menu.pay_at_counter}
          counterAllowed={counterAllowed}
          counterMax={counterMax}
          counterOverLimit={counterOverLimit}
          qrisDineIn={qrisDineIn}
          dineInPay={effectiveDineInPay}
          onDineInPay={setDineInPay}
          customerName={customerName}
          customerPhone={customerPhone}
          notes={notes}
          submitting={orderMut.isPending}
          onName={setCustomerName}
          onPhone={setCustomerPhone}
          onNotes={setNotes}
          onChangeQty={changeQty}
          onClose={() => setCartOpen(false)}
          onSubmit={submitOrder}
        />
      )}

      {historyOpen && (
        <MyOrdersSheet orders={visibleOrders} onOpen={openSavedOrder} onClose={() => setHistoryOpen(false)} />
      )}
    </div>
  )
}

// ─── Pesanan saya (riwayat di HP pembeli) ────────────────────────────────────

function MyOrdersSheet({ orders, onOpen, onClose }: {
  orders: SavedPublicOrder[]
  onOpen: (o: SavedPublicOrder) => void
  onClose: () => void
}) {
  // Status diambil ulang dari server — yang tersimpan di HP hanya penunjuknya.
  const statuses = useQueries({
    queries: orders.map((o) => ({
      queryKey: ['public-order', o.id],
      queryFn: () => getPublicOrderStatus(o.id),
      retry: false,
      staleTime: 30_000,
    })),
  })

  return (
    <Sheet title={t('menuMyOrders')} onClose={onClose}>
      <div className="space-y-2.5">
        {orders.map((o, i) => {
          const q = statuses[i]
          const order = q?.data?.data?.data
          const code = order?.queue_number || order?.bill_number
          const badge = historyBadge(order, !!q?.isError)
          const total = order?.final_price ?? o.total
          const items = o.items ?? []
          return (
            <button
              key={o.id}
              onClick={() => onOpen(o)}
              className="w-full text-left bg-white ring-1 ring-gray-200/80 active:bg-gray-50 rounded-2xl px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold text-gray-900 tracking-wide truncate">
                    {code ?? (q?.isLoading ? '…' : t('menuOrderNumber'))}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {o.tableNumber ? t('menuTableAt', { n: o.tableNumber.toUpperCase(), outlet: o.outletName }) : o.outletName}
                    {' · '}
                    {new Date(o.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className={`shrink-0 text-[11px] font-semibold rounded-full px-2.5 py-1 ${badgeClasses[badge.tone]}`}>
                  {badge.label}
                </span>
              </div>
              {items.length > 0 && (
                <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                  {items.slice(0, 3).map((it) => titleCase(it)).join(', ')}
                  {items.length > 3 && <span className="text-gray-400"> {t('menuHistoryMore', { n: items.length - 3 })}</span>}
                </p>
              )}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed border-gray-200">
                <span className="text-sm font-bold text-gray-900 tabular-nums">{total ? formatCurrency(total) : ''}</span>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-gray-400 text-center mt-4">{t('menuMyOrdersHint')}</p>
    </Sheet>
  )
}

type BadgeTone = 'neutral' | 'warning' | 'success' | 'danger' | 'info'
const badgeClasses: Record<BadgeTone, string> = {
  neutral: 'bg-gray-100 text-gray-600',
  warning: 'bg-amber-50 text-amber-700',
  success: 'bg-emerald-50 text-emerald-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-blue-50 text-blue-700',
}

/**
 * Label status di "Pesanan saya" — dibaca dengan aturan yang sama dengan
 * layar status pesanan (OrderPlaced). Pesanan yang dibatalkan SETELAH diterima
 * berarti digabung kasir ke tagihan, bukan dibatalkan.
 */
function historyBadge(order: PublicOrderResult | undefined, failed: boolean): { label: string; tone: BadgeTone } {
  if (!order) return failed ? { label: t('menuHistoryUnknown'), tone: 'neutral' } : { label: '…', tone: 'neutral' }
  const accepted = !!order.fulfillment_status && order.fulfillment_status !== 'pending'
  if (order.payment_status === 'canceled') {
    if (order.canceled_reason === NO_SHOW_REASON) return { label: t('menuHistoryNoShow'), tone: 'danger' }
    if (order.canceled_reason === PICKUP_EXPIRED_REASON || order.canceled_reason === COUNTER_UNCONFIRMED_REASON) {
      return { label: t('menuHistoryExpired'), tone: 'neutral' }
    }
    return accepted ? { label: t('menuHistoryMerged'), tone: 'success' } : { label: t('menuHistoryRejected'), tone: 'danger' }
  }
  if (order.fulfillment_status === 'served') return { label: t('menuHistoryServed'), tone: 'success' }
  if (order.fulfillment_status === 'ready') return { label: t('menuHistoryReady'), tone: 'success' }
  if (order.payment_status === 'paid') return { label: t('menuHistoryPaid'), tone: 'success' }
  if (order.requires_prepayment && !order.payment_claimed_at) return { label: t('menuHistoryAwaitPay'), tone: 'warning' }
  if (!accepted) return { label: t('menuHistoryWaiting'), tone: 'warning' }
  return { label: t('menuHistoryInProgress'), tone: 'info' }
}

// ─── Customize sheet (variants + add-ons) ────────────────────────────────────

function CustomizeSheet({
  product, onClose, onAdd,
}: {
  product: Product
  onClose: () => void
  onAdd: (key: string, name: string, price: LinePrice, payload: SelfOrderItem) => void
}) {
  const variants = (product.variants ?? []).filter((v) => v.is_available && v.is_active)
  const addons = (product.attributes ?? []).filter((a) => a.is_available && a.is_active)
  const [variantId, setVariantId] = useState<string>(variants[0]?.id ?? '')
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set())

  const variant = variants.find((v) => v.id === variantId)
  const base = product.has_variant && variant ? variantPrice(variant) : productPrice(product)
  const addonPrice = addons.filter((a) => selectedAddons.has(a.id)).reduce((s, a) => s + a.price, 0)
  const unitPrice = base + addonPrice
  const needsVariant = product.has_variant && variants.length > 0

  const toggleAddon = (id: string) =>
    setSelectedAddons((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  const handleAdd = () => {
    if (needsVariant && !variant) { toast.error(t('menuPickVariantFirst')); return }
    const chosenAddons = addons.filter((a) => selectedAddons.has(a.id))
    const key = `${variant ? `v:${variant.id}` : `p:${product.id}`}|${chosenAddons.map((a) => a.id).sort().join(',')}`
    const name = variant ? `${product.name} (${variant.name})` : product.name
    onAdd(key, name, { unitPrice, basePrice: base, tiers: variant ? variant.price_tiers : product.price_tiers }, {
      item_type: variant ? 'VARIANT' : 'PRODUCT',
      reference_id: variant ? variant.id : product.id,
      quantity: 1,
      attributes: chosenAddons.map((a) => ({ product_attribute_id: a.id, additional_price: a.price })),
    })
    toast.success(`${name} ditambahkan`)
    onClose()
  }

  return (
    <Sheet
      onClose={onClose}
      title={product.name}
      footer={
        <button onClick={handleAdd} className="w-full bg-blue-600 text-white font-semibold rounded-2xl py-3.5 active:bg-blue-700">
          {t('menuAddPrice', { price: formatCurrency(unitPrice) })}
        </button>
      }
    >
      {product.image && (
        <img src={product.image} alt="" className="w-full h-40 object-cover rounded-2xl mb-4 bg-gray-100" />
      )}
      {product.description && <p className="text-sm text-gray-500 mb-4">{product.description}</p>}
      {needsVariant && (
        <OptionGroup title={t('menuVariant')}>
          {variants.map((v) => (
            <OptionRow
              key={v.id}
              selected={variantId === v.id}
              round
              label={v.name}
              price={formatCurrency(variantPrice(v))}
              onClick={() => setVariantId(v.id)}
            />
          ))}
        </OptionGroup>
      )}
      {addons.length > 0 && (
        <OptionGroup title={t('menuAddons')}>
          {addons.map((a) => (
            <OptionRow
              key={a.id}
              selected={selectedAddons.has(a.id)}
              label={a.name}
              price={`+${formatCurrency(a.price)}`}
              onClick={() => toggleAddon(a.id)}
            />
          ))}
        </OptionGroup>
      )}
    </Sheet>
  )
}

function OptionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function OptionRow({ selected, label, price, onClick, round = false }: {
  selected: boolean
  label: string
  price: string
  onClick: () => void
  round?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition ${selected ? 'border-blue-600 bg-blue-50/60' : 'border-gray-200 active:bg-gray-50'}`}
    >
      <span className={`w-5 h-5 shrink-0 flex items-center justify-center border-2 ${round ? 'rounded-full' : 'rounded-md'} ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'}`}>
        {selected && <Check size={12} strokeWidth={3} />}
      </span>
      <span className="flex-1 text-sm font-medium text-gray-900">{label}</span>
      <span className="text-sm font-semibold text-gray-700">{price}</span>
    </button>
  )
}

// ─── Cart sheet ──────────────────────────────────────────────────────────────

function CartSheet({
  lines, totalQty, totalPrice, pickup, pickupAvailable, prepayDineIn, serviceType, onServiceType,
  counterOffered, counterAllowed, counterMax, counterOverLimit, qrisDineIn, dineInPay, onDineInPay, customerName, customerPhone, notes, submitting,
  onName, onPhone, onNotes, onChangeQty, onClose, onSubmit,
}: {
  lines: CartLine[]
  totalQty: number
  totalPrice: number
  pickup: boolean
  pickupAvailable: boolean
  /** Makan di tempat juga wajib dibayar QRIS saat dipesan. */
  prepayDineIn: boolean
  serviceType: 'pickup' | 'dine_in'
  onServiceType: (v: 'pickup' | 'dine_in') => void
  /** Outlet menawarkan bayar di tempat untuk makan di tempat. */
  counterOffered: boolean
  /** Bayar di tempat bisa dipilih untuk keranjang ini (batas nominal). */
  counterAllowed: boolean
  counterMax: number
  counterOverLimit: boolean
  /** QRIS di depan tersedia untuk makan di tempat. */
  qrisDineIn: boolean
  dineInPay: 'qris' | 'counter'
  onDineInPay: (v: 'qris' | 'counter') => void
  customerName: string
  customerPhone: string
  notes: string
  submitting: boolean
  onName: (v: string) => void
  onPhone: (v: string) => void
  onNotes: (v: string) => void
  onChangeQty: (key: string, delta: number) => void
  onClose: () => void
  onSubmit: () => void
}) {
  const counterChosen = counterOffered && serviceType === 'dine_in' && dineInPay === 'counter'
  const payNote = counterChosen
    ? t('menuCounterPayNote')
    : (pickup && serviceType === 'pickup') || prepayDineIn
      ? t('menuServicePickupNote')
      : t('menuPayAtCounter')
  const inputCls = 'w-full px-3.5 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white'

  return (
    <Sheet
      onClose={onClose}
      title={t('menuYourOrder')}
      footer={
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">{t('menuSubtotalItems', { n: totalQty })}</span>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(totalPrice)}</span>
          </div>
          <button
            onClick={onSubmit}
            disabled={submitting || lines.length === 0}
            className="w-full bg-blue-600 text-white font-semibold rounded-2xl py-3.5 disabled:opacity-60 active:bg-blue-700"
          >
            {submitting ? 'Mengirim...' : t('menuSendOrder')}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">{payNote}</p>
        </>
      }
    >
      <div className="divide-y divide-gray-100 mb-5">
        {lines.map((l) => (
          <div key={l.key} className="flex items-center gap-3 py-3 first:pt-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 line-clamp-2">{l.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatCurrency(lineTotal(l))}
                {lineUnitPrice(l) < l.unitPrice && <span className="ml-1 text-emerald-600 font-medium">· {t('menuWholesaleApplied')}</span>}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-full p-0.5">
              <button onClick={() => onChangeQty(l.key, -1)} className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center"><Minus size={13} /></button>
              <span className="min-w-6 text-center text-sm font-semibold">{l.qty}</span>
              <button onClick={() => onChangeQty(l.key, 1)} className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center"><Plus size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      {pickup && (
        <div className="mb-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('menuSectionService')}</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: 'pickup', label: t('menuServicePickup'), note: t('menuServicePickupNote'), disabled: !pickupAvailable },
              // Keterangan makan di tempat mengikuti cara bayarnya di outlet ini.
              { key: 'dine_in', label: t('menuServiceDineIn'), note: counterOffered ? (qrisDineIn ? t('menuServiceDineInChooseNote') : t('menuServiceDineInNote')) : prepayDineIn ? t('menuServicePickupNote') : t('menuServiceDineInNote'), disabled: false },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                type="button"
                disabled={opt.disabled}
                onClick={() => onServiceType(opt.key)}
                className={`rounded-2xl border-2 px-3 py-3 text-left transition disabled:opacity-40 ${serviceType === opt.key ? 'border-blue-600 bg-blue-50/60' : 'border-gray-200'}`}
              >
                <p className={`text-sm font-bold ${serviceType === opt.key ? 'text-blue-700' : 'text-gray-900'}`}>{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.note}</p>
              </button>
            ))}
          </div>
          {!pickupAvailable && <p className="text-xs text-gray-500 mt-2">{t('menuPickupNoQris')}</p>}
        </div>
      )}

      {counterOffered && serviceType === 'dine_in' && qrisDineIn && (
        <div className="mb-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('menuSectionPayment')}</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: 'qris', label: t('menuPayQrisNow'), note: t('menuServicePickupNote'), disabled: false },
              { key: 'counter', label: t('menuPayAtCounterOption'), note: t('menuPayAtCounterOptionNote'), disabled: !counterAllowed },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                type="button"
                disabled={opt.disabled}
                onClick={() => onDineInPay(opt.key)}
                className={`rounded-2xl border-2 px-3 py-3 text-left transition disabled:opacity-40 ${dineInPay === opt.key ? 'border-blue-600 bg-blue-50/60' : 'border-gray-200'}`}
              >
                <p className={`text-sm font-bold ${dineInPay === opt.key ? 'text-blue-700' : 'text-gray-900'}`}>{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.note}</p>
              </button>
            ))}
          </div>
          {counterOverLimit && <p className="text-xs text-gray-500 mt-2">{t('menuCounterOverLimit', { max: formatCurrency(counterMax) })}</p>}
        </div>
      )}
      {counterOffered && serviceType === 'dine_in' && !qrisDineIn && counterOverLimit && (
        <p className="text-xs text-red-600 mb-5">{t('menuCounterOverLimitNoQris', { max: formatCurrency(counterMax) })}</p>
      )}

      <div className="mb-5">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('menuSectionContact')}</p>
        <div className="space-y-2">
          <input
            value={customerName}
            onChange={(e) => onName(e.target.value)}
            placeholder={t('menuCustomerName')}
            maxLength={60}
            autoComplete="name"
            className={inputCls}
          />
          <input
            value={customerPhone}
            onChange={(e) => onPhone(e.target.value)}
            placeholder={t('menuCustomerPhone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            className={inputCls}
          />
        </div>
      </div>

      <div className="mb-1">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('menuSectionNote')}</p>
        <textarea
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          placeholder={t('menuNoteExample')}
          rows={2}
          className={`${inputCls} resize-none`}
        />
      </div>
    </Sheet>
  )
}

// ─── Order placed confirmation ───────────────────────────────────────────────

/**
 * Layar setelah pesanan terkirim: bayar (bila wajib di depan), menunggu kasir,
 * lalu mengikuti pesanan sampai siap atau diantar.
 *
 * Pemantauan berhenti di keadaan akhir — batal, atau selesai diantar/diambil.
 */
function OrderPlaced({ menu, orderId, pickup, placedPickup = false, placedPrepay = false }: {
  menu: PublicMenu | undefined
  orderId: string
  pickup: boolean
  placedPickup?: boolean
  placedPrepay?: boolean
}) {

  const { data } = useQuery({
    queryKey: ['public-order', orderId],
    queryFn: () => getPublicOrderStatus(orderId),
    refetchInterval: (q) => {
      const o = q.state.data?.data?.data
      if (o?.payment_status === 'canceled') return false
      if (o?.payment_status === 'paid') {
        // Lunas belum berarti selesai: pembeli masih mengikuti pesanannya
        // (diterima → disiapkan → siap → diantar). Berhenti saat sudah diantar.
        const pickupOrder = o.order_type?.code === 'TKA'
        const done = o.fulfillment_status === 'served' || (pickupOrder && o.fulfillment_status === 'ready')
        if (done) return false
        // Tanpa dapur tidak ada lagi yang memajukan status setelah diterima.
        if (!menu?.has_kitchen && o.fulfillment_status && o.fulfillment_status !== 'pending') return false
      }
      return 5000
    },
    retry: false,
  })
  const order = data?.data?.data
  const paid = order?.payment_status === 'paid'
  // Nota yang dibatalkan SETELAH diterima berarti digabung kasir ke tagihan
  // meja/pesanan yang sedang berjalan — bukan ditolak. Penolakan selalu
  // terjadi selagi pesanan masih menunggu.
  const closed = order?.payment_status === 'canceled'
  // Tidak datang bisa ditandai setelah pesanan diterima — periksa sebelum
  // "digabung", yang juga berarti batal setelah diterima.
  const noShow = closed && order?.canceled_reason === NO_SHOW_REASON
  const unconfirmed = closed && order?.canceled_reason === COUNTER_UNCONFIRMED_REASON
  const merged = closed && !noShow && !!order?.fulfillment_status && order.fulfillment_status !== 'pending'
  const expired = closed && order?.canceled_reason === PICKUP_EXPIRED_REASON
  const rejected = closed && !merged && !expired && !noShow && !unconfirmed
  const isPickupOrder = placedPickup || order?.order_type?.code === 'TKA'
  // Wajib dibayar sebelum sampai ke kasir: bawa pulang, atau makan di tempat
  // saat outlet menyalakan "bayar di depan" (QR meja maupun pesan online).
  const mustPayFirst = isPickupOrder || (order ? !!order.requires_prepayment : placedPrepay)
  const ready = order?.fulfillment_status === 'ready' || order?.fulfillment_status === 'served'
  const served = order?.fulfillment_status === 'served'
  // Langkah "Siap"/"Diantar" hanya digerakkan dapur (KDS). Tanpa dapur
  // langkahnya disembunyikan — kecuali kasir sempat memajukannya manual.
  const hasKitchen = !!menu?.has_kitchen
  const orderCode = order?.queue_number || order?.bill_number
  const confirmed = !!order?.fulfillment_status && order.fulfillment_status !== 'pending'
  const claimed = !!order?.payment_claimed_at
  const where = menu
    ? pickup
      ? t('menuPickupAt', { outlet: menu.outlet_name })
      : t('menuTableAt', { n: menu.table_number.toUpperCase(), outlet: menu.outlet_name })
    : ''
  const again = (
    <button onClick={() => window.location.assign(window.location.pathname)} className="w-full rounded-2xl py-3 text-sm font-semibold text-blue-700 bg-blue-50 active:bg-blue-100">
      {t('menuOrderAgain')}
    </button>
  )

  if (noShow) {
    return (
      <StatusShell tone="danger" icon={<XCircle size={34} />} title={t('menuOrderNoShow')} subtitle={where}>
        {again}
      </StatusShell>
    )
  }
  if (unconfirmed) {
    return (
      <StatusShell tone="warning" icon={<Clock size={34} />} title={t('menuOrderUnconfirmed')} subtitle={where}>
        {again}
      </StatusShell>
    )
  }

  if (merged) {
    return (
      <StatusShell tone="success" icon={<CheckCircle2 size={34} />} title={t('menuOrderMerged')} subtitle={where}>
        {again}
      </StatusShell>
    )
  }
  if (expired) {
    return (
      <StatusShell tone="warning" icon={<Clock size={34} />} title={t('menuPickupExpired')} subtitle={where}>
        {again}
      </StatusShell>
    )
  }

  // Wajib bayar di depan dan belum dibayar: tampilkan QRIS-nya dulu.
  if (mustPayFirst && !paid && !claimed && !closed) {
    return <PickupPay orderId={orderId} orderCode={orderCode} />
  }

  if (rejected) {
    return (
      <StatusShell tone="danger" icon={<XCircle size={34} />} title={t('menuOrderRejected')} subtitle={where}>
        {again}
      </StatusShell>
    )
  }

  // Garis kemajuan pesanan. Langkah "Dibayar" hanya muncul bila sudah lunas
  // atau memang wajib dibayar di depan — pesanan bayar-nanti tidak menunggu itu.
  const steps: { label: string; done: boolean }[] = [
    { label: t('menuStepOrdered'), done: true },
    ...(mustPayFirst || paid ? [{ label: t('menuStepPaid'), done: paid }] : []),
    { label: t('menuStepAccepted'), done: confirmed },
    ...(hasKitchen || ready ? [{ label: t('menuStepReady'), done: ready }] : []),
    ...(!isPickupOrder && (hasKitchen || served) ? [{ label: t('menuStepServed'), done: served }] : []),
  ]

  const status: { tone: Tone; text: string } = claimed && !paid
    ? { tone: 'warning', text: t('menuPaymentChecking') }
    : !confirmed
      ? { tone: 'warning', text: paid ? t('menuPaidAwaitAccept') : t('menuAwaitingCashier') }
      : isPickupOrder
        ? { tone: 'success', text: ready ? t('menuOrderReady') : hasKitchen ? t('menuOrderConfirmed') : t('menuPickupPreparing') }
        : served
          ? { tone: 'success', text: t('menuServedEnjoy') }
          : ready
            ? { tone: 'success', text: t('menuReadyToTable') }
            : paid || !hasKitchen
              ? { tone: 'success', text: t('menuPreparingToTable') }
              : { tone: 'success', text: t('menuOrderConfirmed') }

  return (
    <StatusShell
      tone={status.tone}
      icon={status.tone === 'warning' ? <Clock size={34} /> : <CheckCircle2 size={34} />}
      title={paid ? t('menuThanksPaid') : t('menuOrderSent')}
      subtitle={where}
    >
      {orderCode && (
        <div className="bg-white rounded-2xl ring-1 ring-gray-200/70 py-3 px-4 text-center">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">{isPickupOrder ? t('menuPickupShowCode') : t('menuOrderNumber')}</p>
          <p className="text-2xl font-bold text-gray-900 tracking-wide mt-0.5">{orderCode}</p>
          {order?.final_price ? <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(order.final_price)}{paid ? ` · ${t('menuPaidShort')}` : ''}</p> : null}
        </div>
      )}

      <Stepper steps={steps} />

      <div className={`flex items-start gap-2 text-sm rounded-2xl py-3 px-4 ${toneClasses[status.tone]}`}>
        {status.tone === 'warning' ? <Clock size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
        <span className="text-left">{status.text}</span>
      </div>

      {/* Bayar di belakang: cara bayarnya sudah diputuskan saat memesan —
          dibayar di kasir, tanpa tawaran QRIS dari HP sesudahnya. */}
      {!isPickupOrder && confirmed && !paid && !claimed && (
        <p className="text-sm text-gray-500 text-center">{t('menuPayAtCashier')}</p>
      )}

      {isPickupOrder && <p className="text-xs text-gray-500 text-center">{t('menuPickupReadyHint')}</p>}
      {paid && !isPickupOrder && <p className="text-xs text-gray-500 text-center">{t('menuOrderMoreHint')}</p>}
      {again}
    </StatusShell>
  )
}

/**
 * Pembayaran QRIS: tampil langsung untuk pesanan yang wajib dibayar di depan,
 * atau saat pembeli makan di tempat memilih bayar dari HP.
 *
 * Mode "auto": QR bernominal, lunas sendiri begitu dana masuk — halaman
 * induknya memantau status dan berpindah saat lunas. Mode "manual": QRIS toko
 * yang dicek kasir; pembeli menekan "Saya sudah bayar". Tombol itu tetap ada
 * di mode auto sebagai jalan keluar bila pelunasan otomatis terlambat.
 */
function PickupPay({ orderId, orderCode, onBack }: {
  orderId: string
  orderCode?: string | null
  /** Makan di tempat: kembali ke status dan bayar di kasir saja. */
  onBack?: () => void
}) {
  const [qr, setQr] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Tagihan dimuat lewat useQuery, BUKAN useMutation yang dipanggil di
  // useEffect. Di StrictMode (mode pengembangan) komponen dipasang dua kali,
  // dan mutation yang dimulai sebelum pemasangan ulang kehilangan
  // pengamatnya: tagihannya jadi di server, tetapi hasilnya tidak pernah sampai
  // ke layar — spinner berputar selamanya. Server memakai ulang tagihan yang
  // masih menunggu, jadi memuat ulang tidak menambah selisih nominal unik.
  const billQuery = useQuery({
    queryKey: ['pickup-pay', orderId],
    queryFn: () => payPickupOrder(orderId),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
  const bill: PickupPayment | null = billQuery.data?.data?.data ?? null
  const claimMut = useMutation({
    mutationFn: () => claimPickupPayment(orderId),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  useEffect(() => {
    if (!bill?.qris_payload) return
    QRCode.toDataURL(bill.qris_payload, { width: 512, margin: 2, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(() => setQr(null))
  }, [bill?.qris_payload])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  if (!bill) {
    return billQuery.isError ? (
      <StatusShell tone="warning" icon={<Clock size={34} />} title={getErrorMessage(billQuery.error)}>
        {onBack && (
          <button onClick={onBack} className="w-full rounded-2xl py-3 text-sm font-semibold text-gray-600 bg-gray-100">
            {t('menuPayAtCashierInstead')}
          </button>
        )}
      </StatusShell>
    ) : (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  const left = Math.max(0, Math.floor((new Date(bill.expires_at).getTime() - now) / 1000))
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
  const claimed = claimMut.isSuccess
  const urgent = left <= 60

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-center pt-8 pb-16 px-6">
        {orderCode && <p className="text-xs text-white/70 mb-1">#{orderCode}</p>}
        <p className="text-sm text-white/80">{t('menuPayAmount')}</p>
        <p className="text-3xl font-bold mt-1 tracking-tight">{formatCurrency(bill.amount)}</p>
      </div>
      <div className="max-w-sm mx-auto px-4 -mt-12 pb-8">
        <div className="bg-white rounded-3xl shadow-xl ring-1 ring-gray-200/70 p-5 text-center">
          <p className="text-xs font-bold tracking-widest text-gray-900">QRIS</p>
          <div className="mt-3">
            {qr ? (
              <img src={qr} alt="QRIS" className="w-full max-w-[250px] mx-auto rounded-xl" />
            ) : bill.qris_image_url ? (
              <img src={bill.qris_image_url} alt="QRIS" className="w-full max-w-[250px] mx-auto rounded-xl" />
            ) : (
              <div className="w-full max-w-[250px] mx-auto aspect-square rounded-xl bg-gray-50 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-4">
            {qr ? t('menuPayHint') : t('menuPayTypeAmount', { amount: formatCurrency(bill.amount) })}
          </p>
          <div className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full py-1.5 px-3 mt-3 ${urgent ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
            <Clock size={12} />
            {t('menuPayWithin', { time: mmss })}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {claimed ? (
            <div className="flex items-center justify-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-2xl py-3 px-4">
              <Clock size={16} /> {t('menuPaymentChecking')}
            </div>
          ) : (
            <button
              onClick={() => claimMut.mutate()}
              disabled={claimMut.isPending || left === 0}
              className={`w-full rounded-2xl py-3.5 font-semibold disabled:opacity-60 ${bill.mode === 'manual' ? 'bg-blue-600 text-white active:bg-blue-700' : 'bg-white text-blue-700 ring-1 ring-gray-200'}`}
            >
              {claimMut.isPending ? '...' : t('menuIHavePaid')}
            </button>
          )}
          {onBack && !claimed && (
            <button onClick={onBack} className="w-full py-2 text-sm font-semibold text-gray-500">
              {t('menuPayAtCashierInstead')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Shared UI ───────────────────────────────────────────────────────────────

type Tone = 'success' | 'warning' | 'danger' | 'neutral'

const toneClasses: Record<Tone, string> = {
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  neutral: 'bg-gray-100 text-gray-600',
}

const toneIcon: Record<Tone, string> = {
  success: 'bg-green-100 text-green-600',
  warning: 'bg-amber-100 text-amber-600',
  danger: 'bg-red-100 text-red-600',
  neutral: 'bg-gray-100 text-gray-500',
}

/** Kerangka layar status: ikon berwarna, judul, keterangan, lalu isi. */
function StatusShell({ tone, icon, title, subtitle, children }: {
  tone: Tone
  icon: React.ReactNode
  title: string
  subtitle?: string
  children?: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
      <div className="w-full max-w-sm animate-[public-fade-in_.25s_ease-out]">
        <div className="text-center mb-5">
          <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${toneIcon[tone]}`}>{icon}</div>
          <h1 className="text-xl font-bold text-gray-900 mt-4 leading-snug">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  )
}

/** Garis kemajuan pesanan: langkah selesai berwarna, yang sedang berjalan menyala. */
function Stepper({ steps }: { steps: { label: string; done: boolean }[] }) {
  const current = steps.findIndex((s) => !s.done)
  return (
    <div className="bg-white rounded-2xl ring-1 ring-gray-200/70 px-3 py-4">
      <div className="flex items-start">
        {steps.map((s, i) => {
          const active = i === current
          return (
            <div key={s.label} className="flex-1 flex flex-col items-center relative">
              {i > 0 && (
                <span className={`absolute top-3 right-1/2 w-full h-0.5 -z-0 ${s.done || active ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
              <span className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${s.done ? 'bg-blue-600 text-white' : active ? 'bg-white text-blue-600 ring-2 ring-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                {s.done ? <Check size={13} strokeWidth={3} /> : i + 1}
              </span>
              <span className={`text-[11px] mt-1.5 text-center leading-tight ${s.done || active ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>{s.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Kerangka menu selagi dimuat — bentuknya sama dengan menu aslinya. */
function MenuSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 h-20" />
      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-3 animate-pulse">
        <div className="h-24 bg-white rounded-2xl ring-1 ring-gray-200/70" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl ring-1 ring-gray-200/70 p-2.5 flex gap-3">
            <div className="w-16 h-16 rounded-xl bg-gray-100" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3.5 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-3.5 bg-gray-100 rounded w-1/4 mt-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Sheet({ title, onClose, children, footer }: {
  title: string
  onClose: () => void
  children: React.ReactNode
  /** Bagian yang menempel di dasar lembar — tombol utama tetap terlihat. */
  footer?: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog">
      <div className="absolute inset-0 bg-black/40 animate-[public-fade-in_.2s_ease-out]" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-t-3xl max-h-[88dvh] min-h-0 flex flex-col animate-[public-sheet-up_.25s_ease-out]">
        <div className="pt-2.5 pb-1 flex justify-center"><span className="w-10 h-1 rounded-full bg-gray-200" /></div>
        <div className="flex items-center justify-between px-5 pb-3">
          <h3 className="text-base font-bold text-gray-900 line-clamp-1">{title}</h3>
          <button onClick={onClose} aria-label="Tutup" className="w-11 h-11 shrink-0 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 pb-4">{children}</div>
        {footer && (
          <div className="border-t border-gray-100 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>
  )
}
