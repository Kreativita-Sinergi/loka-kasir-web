import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, ToggleLeft, ToggleRight, GitBranch, Plus, SlidersHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { getOutletStocksAll, updateProductAvailability, addStock, adjustStock } from '@/api/stock'
import { useOutletStore } from '@/store/outletStore'
import { IconProduct } from '@/components/icons/LokaIcons'
import type { OutletStock } from '@/types'
import { getErrorMessage } from '@/lib/utils'

// ─── Stock Entry Modal ────────────────────────────────────────────────────────

function StockEntryModal({ open, onClose, outletId, stocks }: {
  open: boolean
  onClose: () => void
  outletId: string
  stocks: OutletStock[]
}) {
  const qc = useQueryClient()
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')

  const filteredStocks = search.trim()
    ? stocks.filter(s => s.product?.track_stock && (
        s.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.product?.sku?.toLowerCase().includes(search.toLowerCase())
      ))
    : stocks.filter(s => s.product?.track_stock)

  const mut = useMutation({
    mutationFn: () => addStock({
      outlet_id: outletId,
      product_id: productId,
      quantity: parseInt(quantity),
      notes: notes || null,
    }),
    onSuccess: () => {
      toast.success('Stok berhasil ditambahkan')
      qc.invalidateQueries({ queryKey: ['outlet-stocks-all', outletId] })
      onClose()
      setProductId(''); setQuantity(''); setNotes(''); setSearch('')
    },
    onError: (err) => {
      const msg = getErrorMessage(err)
      toast.error(msg)
      if (msg.toLowerCase().includes('outlet tidak ditemukan')) {
        useOutletStore.getState().setOutlet(null)
      }
    },
  })

  const selected = stocks.find(s => s.product_id === productId)

  return (
    <Modal open={open} onClose={onClose} title="Stok Masuk" size="md">
      <div className="space-y-4">
        {/* Product search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Produk</label>
          <input
            type="text"
            placeholder="Cari produk..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
            {filteredStocks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Tidak ada produk ditemukan</p>
            ) : filteredStocks.map(s => (
              <button
                key={s.product_id}
                onClick={() => setProductId(s.product_id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition ${productId === s.product_id ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}
              >
                {s.product?.image
                  ? <img src={s.product.image} className="w-7 h-7 rounded-lg object-cover shrink-0" alt="" />
                  : <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center shrink-0"><IconProduct size={12} className="text-gray-400" /></div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 capitalize truncate">{s.product?.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{s.product?.sku ?? '-'}</p>
                </div>
                <span className="text-xs text-gray-500 shrink-0">Stok: {s.quantity}</span>
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl text-sm text-blue-700">
            <span className="font-medium capitalize">{selected.product?.name}</span>
            <span className="text-blue-400">·</span>
            <span>Stok saat ini: <strong>{selected.quantity}</strong></span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Jumlah Masuk</label>
          <input
            type="number"
            min="1"
            placeholder="Masukkan jumlah..."
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Catatan (opsional)</label>
          <input
            type="text"
            placeholder="Misal: Pembelian dari supplier..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition">Batal</button>
          <button
            disabled={!productId || !quantity || parseInt(quantity) <= 0 || mut.isPending}
            onClick={() => mut.mutate()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {mut.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Stock Adjustment Modal ───────────────────────────────────────────────────

function StockAdjustModal({ open, onClose, outletId, stocks }: {
  open: boolean
  onClose: () => void
  outletId: string
  stocks: OutletStock[]
}) {
  const qc = useQueryClient()
  const [productId, setProductId] = useState('')
  const [actualQty, setActualQty] = useState('')
  const [search, setSearch] = useState('')

  const filteredStocks = search.trim()
    ? stocks.filter(s => s.product?.track_stock && (
        s.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.product?.sku?.toLowerCase().includes(search.toLowerCase())
      ))
    : stocks.filter(s => s.product?.track_stock)

  const selected = stocks.find(s => s.product_id === productId)
  const delta = selected && actualQty !== '' ? parseInt(actualQty) - selected.quantity : null

  const mut = useMutation({
    mutationFn: () => adjustStock({
      outlet_id: outletId,
      product_id: productId,
      actual_quantity: parseInt(actualQty),
    }),
    onSuccess: () => {
      toast.success('Stok berhasil disesuaikan')
      qc.invalidateQueries({ queryKey: ['outlet-stocks-all', outletId] })
      onClose()
      setProductId(''); setActualQty(''); setSearch('')
    },
    onError: (err) => {
      const msg = getErrorMessage(err)
      toast.error(msg)
      if (msg.toLowerCase().includes('outlet tidak ditemukan')) {
        useOutletStore.getState().setOutlet(null)
      }
    },
  })

  return (
    <Modal open={open} onClose={onClose} title="Penyesuaian Stok" size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Masukkan jumlah stok fisik aktual. Sistem akan menghitung selisih dan mencatat mutasi <strong>ADJUSTMENT</strong>.</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Produk</label>
          <input
            type="text"
            placeholder="Cari produk..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
            {filteredStocks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Tidak ada produk ditemukan</p>
            ) : filteredStocks.map(s => (
              <button
                key={s.product_id}
                onClick={() => { setProductId(s.product_id); setActualQty(String(s.quantity)) }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition ${productId === s.product_id ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}
              >
                {s.product?.image
                  ? <img src={s.product.image} className="w-7 h-7 rounded-lg object-cover shrink-0" alt="" />
                  : <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center shrink-0"><IconProduct size={12} className="text-gray-400" /></div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 capitalize truncate">{s.product?.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{s.product?.sku ?? '-'}</p>
                </div>
                <span className="text-xs text-gray-500 shrink-0">Stok: {s.quantity}</span>
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl text-sm">
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Stok Sistem</p>
              <p className="font-semibold text-gray-900">{selected.quantity}</p>
            </div>
            {delta !== null && (
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Selisih</p>
                <p className={`font-semibold ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {delta > 0 ? `+${delta}` : delta}
                </p>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Stok Fisik Aktual</label>
          <input
            type="number"
            min="0"
            placeholder="Masukkan jumlah fisik..."
            value={actualQty}
            onChange={e => setActualQty(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition">Batal</button>
          <button
            disabled={!productId || actualQty === '' || parseInt(actualQty) < 0 || mut.isPending}
            onClick={() => mut.mutate()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {mut.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StockCurrentPage() {
  const qc = useQueryClient()
  const { selected: activeOutlet } = useOutletStore()
  const [search, setSearch] = useState('')
  const [showEntry, setShowEntry] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['outlet-stocks-all', activeOutlet?.id],
    queryFn: () => getOutletStocksAll(activeOutlet!.id),
    enabled: !!activeOutlet?.id,
  })

  const availMut = useMutation({
    mutationFn: ({ productId, isAvailable }: { productId: string; isAvailable: boolean }) =>
      updateProductAvailability(productId, isAvailable),
    onSuccess: (_, { isAvailable }) => {
      toast.success(isAvailable ? 'Produk ditandai tersedia' : 'Produk ditandai tidak tersedia')
      qc.invalidateQueries({ queryKey: ['outlet-stocks-all', activeOutlet?.id] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const allStocks: OutletStock[] = data?.data?.data ?? []

  const stocks = search.trim()
    ? allStocks.filter(s => {
        const q = search.toLowerCase()
        return (
          s.product?.name?.toLowerCase().includes(q) ||
          s.product?.sku?.toLowerCase().includes(q)
        )
      })
    : allStocks

  const columns = [
    {
      key: 'product',
      label: 'Produk',
      render: (row: OutletStock) => (
        <div className="flex items-center gap-3">
          {row.product?.image ? (
            <img src={row.product.image} className="w-8 h-8 rounded-lg object-cover shrink-0" alt="" />
          ) : (
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
              <IconProduct size={14} className="text-gray-400" />
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900 capitalize">{row.product?.name ?? '—'}</p>
            <p className="text-xs text-gray-400 font-mono">{row.product?.sku ?? '-'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Kategori',
      render: (row: OutletStock) => (
        <span className="text-sm text-gray-500">{row.product?.category?.name ?? <span className="text-gray-300">—</span>}</span>
      ),
    },
    {
      key: 'track_stock',
      label: 'Lacak Stok',
      render: (row: OutletStock) => (
        row.product?.track_stock
          ? <Badge variant="blue">Dilacak</Badge>
          : <Badge variant="gray">Tidak Dilacak</Badge>
      ),
    },
    {
      key: 'quantity',
      label: 'Kuantitas',
      render: (row: OutletStock) => (
        row.product?.track_stock
          ? (
            <span className={`font-semibold tabular-nums ${row.quantity === 0 ? 'text-red-500' : 'text-gray-900'}`}>
              {row.quantity}
            </span>
          )
          : <span className="text-gray-400 text-sm">∞</span>
      ),
    },
    {
      key: 'is_available',
      label: 'Tersedia',
      render: (row: OutletStock) => {
        if (!row.product) return null
        const pending = availMut.isPending && availMut.variables?.productId === row.product_id
        const isAvailable = row.product.is_available
        return (
          <button
            disabled={pending}
            onClick={() => availMut.mutate({ productId: row.product_id, isAvailable: !isAvailable })}
            className={`transition ${isAvailable ? 'text-blue-500' : 'text-gray-300'} hover:scale-110 disabled:opacity-50`}
            title={isAvailable ? 'Tandai tidak tersedia' : 'Tandai tersedia'}
          >
            {isAvailable ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
          </button>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Stok Saat Ini" subtitle="Kuantitas stok dan ketersediaan produk per outlet aktif" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">

            {/* Outlet indicator */}
            <div className="flex items-center gap-2 text-sm text-gray-500 shrink-0">
              <GitBranch size={14} className="text-gray-400" />
              {activeOutlet
                ? <span className="font-medium text-gray-800">{activeOutlet.name}</span>
                : <span className="text-gray-400">Belum ada outlet dipilih</span>
              }
            </div>

            {activeOutlet && (
              <>
                <div className="relative flex-1 max-w-xs ml-auto">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari produk atau SKU..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-sm text-gray-500 shrink-0">
                  Total: <span className="font-semibold text-gray-900">{allStocks.length}</span>
                </p>
                <button
                  onClick={() => setShowAdjust(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition shrink-0"
                >
                  <SlidersHorizontal size={14} />
                  Penyesuaian
                </button>
                <button
                  onClick={() => setShowEntry(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shrink-0"
                >
                  <Plus size={14} />
                  Stok Masuk
                </button>
              </>
            )}
          </div>

          {!activeOutlet ? (
            <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
              <GitBranch size={32} className="text-gray-200" />
              <p className="text-sm font-medium">Silakan pilih outlet terlebih dahulu</p>
              <p className="text-xs text-gray-300">Gunakan dropdown outlet di sidebar kiri</p>
            </div>
          ) : (
            <DataTable
              columns={columns as never[]}
              data={stocks as never[]}
              loading={isLoading}
              emptyMessage="Belum ada stok untuk outlet ini"
            />
          )}
        </div>
      </div>

      {activeOutlet && (
        <>
          <StockEntryModal
            open={showEntry}
            onClose={() => setShowEntry(false)}
            outletId={activeOutlet.id}
            stocks={allStocks}
          />
          <StockAdjustModal
            open={showAdjust}
            onClose={() => setShowAdjust(false)}
            outletId={activeOutlet.id}
            stocks={allStocks}
          />
        </>
      )}
    </div>
  )
}
