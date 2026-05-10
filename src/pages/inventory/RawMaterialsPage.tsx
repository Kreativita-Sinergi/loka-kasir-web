import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ArrowDownToLine, SlidersHorizontal, Package, AlertTriangle, TrendingUp, Upload, Flame } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import StatCard from '@/components/ui/StatCard'
import RawMaterialImportModal from '@/components/raw-materials/RawMaterialImportModal'
import LowStockAlert from '@/components/inventory/LowStockAlert'
import {
  getRawMaterials,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  stockInRawMaterial,
  adjustRawMaterialStock,
  recordRawMaterialWaste,
} from '@/api/rawMaterials'
import type { CreateRawMaterialPayload, StockInPayload, AdjustStockPayload, WastePayload } from '@/api/rawMaterials'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import type { RawMaterial } from '@/types'

// ─── Stock status helper ─────────────────────────────────────────────────────

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) return <Badge variant="red">Habis</Badge>
  if (stock <= 5) return <Badge variant="yellow">Rendah</Badge>
  return <Badge variant="green">Tersedia</Badge>
}

// ─── Sub-form for stock-in ──────────────────────────────────────────────────

function StockInForm({
  item,
  onSubmit,
  loading,
}: {
  item: RawMaterial
  onSubmit: (data: StockInPayload) => void
  loading: boolean
}) {
  const [qty, setQty] = useState('')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')

  const newAvgPreview = useMemo(() => {
    const q = parseFloat(qty)
    const c = parseFloat(cost)
    if (!q || q <= 0 || isNaN(c)) return null
    const totalStock = item.stock + q
    return (item.stock * item.avg_cost + q * c) / totalStock
  }, [qty, cost, item.stock, item.avg_cost])

  return (
    <div className="space-y-4">
      {/* Current state info */}
      <div className="bg-gray-50 rounded-lg px-4 py-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-gray-400">Stok Saat Ini</p>
          <p className="font-semibold text-gray-800 mt-0.5">
            {item.stock.toLocaleString('id-ID', { maximumFractionDigits: 3 })} {item.unit?.alias ?? item.unit?.name ?? ''}
          </p>
        </div>
        <div>
          <p className="text-gray-400">HPP Rata-rata Saat Ini</p>
          <p className="font-semibold text-blue-700 mt-0.5">{formatCurrency(item.avg_cost)}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Masuk</label>
        <input
          type="number"
          min="0.001"
          step="0.001"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0"
          value={qty}
          onChange={e => setQty(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Harga Beli per Satuan (Rp)</label>
        <input
          type="number"
          min="0"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0"
          value={cost}
          onChange={e => setCost(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
        <input
          type="text"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Supplier, nomor faktur, dll."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      {/* Moving average HPP preview */}
      {newAvgPreview !== null && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="text-xs">
            <p className="text-blue-700 font-semibold">HPP Rata-rata Baru (estimasi)</p>
            <p className="text-gray-400 mt-0.5">Moving average setelah stok masuk</p>
          </div>
          <p className="text-lg font-bold text-blue-700">{formatCurrency(newAvgPreview)}</p>
        </div>
      )}

      <button
        type="button"
        disabled={loading || !qty || !cost}
        onClick={() => onSubmit({ quantity: parseFloat(qty), unit_cost: parseFloat(cost), notes: notes || null })}
        className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Menyimpan...' : 'Tambah Stok'}
      </button>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function RawMaterialsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formModal, setFormModal] = useState<{ open: boolean; item?: RawMaterial }>({ open: false })
  const [stockInModal, setStockInModal] = useState<{ open: boolean; item?: RawMaterial }>({ open: false })
  const [adjustModal, setAdjustModal] = useState<{ open: boolean; item?: RawMaterial }>({ open: false })
  const [wasteModal, setWasteModal] = useState<{ open: boolean; item?: RawMaterial }>({ open: false })
  const [wasteQty, setWasteQty] = useState('')
  const [wasteNotes, setWasteNotes] = useState('')
  const [newQty, setNewQty] = useState('')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [formData, setFormData] = useState<CreateRawMaterialPayload>({ name: '' })
  const [showImportModal, setShowImportModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['raw-materials', { page, search }],
    queryFn: () => getRawMaterials({ page, limit: 20, search: search || undefined }),
  })

  const items: RawMaterial[] = data?.data?.data ?? []
  const total: number = data?.data?.pagination?.total ?? 0

  const statsAll = useQuery({
    queryKey: ['raw-materials-all'],
    queryFn: () => getRawMaterials({ page: 1, limit: 1000 }),
    select: (res) => {
      const all: RawMaterial[] = res.data?.data ?? []
      const paginationTotal: number = res.data?.pagination?.total ?? all.length
      return {
        total: paginationTotal,
        outOfStock: all.filter(i => i.stock <= 0).length,
        lowStock: all.filter(i => i.stock > 0 && i.stock <= 5).length,
      }
    },
  })

  const createMut = useMutation({
    mutationFn: (payload: CreateRawMaterialPayload) => createRawMaterial(payload),
    onSuccess: () => {
      toast.success('Bahan baku berhasil dibuat')
      qc.invalidateQueries({ queryKey: ['raw-materials'] })
      setFormModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateRawMaterialPayload }) => updateRawMaterial(id, payload),
    onSuccess: () => {
      toast.success('Bahan baku berhasil diubah')
      qc.invalidateQueries({ queryKey: ['raw-materials'] })
      setFormModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteRawMaterial(id),
    onSuccess: () => {
      toast.success('Bahan baku berhasil dihapus')
      qc.invalidateQueries({ queryKey: ['raw-materials'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const stockInMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: StockInPayload }) => stockInRawMaterial(id, payload),
    onSuccess: () => {
      toast.success('Stok berhasil ditambahkan')
      qc.invalidateQueries({ queryKey: ['raw-materials'] })
      setStockInModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const adjustMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdjustStockPayload }) => adjustRawMaterialStock(id, payload),
    onSuccess: () => {
      toast.success('Stok berhasil disesuaikan')
      qc.invalidateQueries({ queryKey: ['raw-materials'] })
      setAdjustModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const wasteMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WastePayload }) => recordRawMaterialWaste(id, payload),
    onSuccess: () => {
      toast.success('Waste berhasil dicatat')
      qc.invalidateQueries({ queryKey: ['raw-materials'] })
      setWasteModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  function openCreate() {
    setFormData({ name: '' })
    setFormModal({ open: true })
  }

  function openEdit(item: RawMaterial) {
    setFormData({ name: item.name, sku: item.sku ?? undefined, unit_id: item.unit?.id ?? undefined, min_stock: item.min_stock ?? 0 })
    setFormModal({ open: true, item })
  }

  function handleFormSubmit() {
    if (!formData.name.trim()) return
    if (formModal.item) {
      updateMut.mutate({ id: formModal.item.id, payload: formData })
    } else {
      createMut.mutate(formData)
    }
  }

  return (
    <>
      <Header title="Bahan Baku" />

      <div className="p-6 space-y-5">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            title="Total Bahan Baku"
            value={statsAll.data?.total ?? total}
            icon={<Package size={18} />}
            color="blue"
            loading={statsAll.isLoading}
          />
          <StatCard
            title="Stok Habis"
            value={statsAll.data?.outOfStock ?? 0}
            icon={<AlertTriangle size={18} />}
            color="orange"
            subtitle="Perlu pengisian segera"
            loading={statsAll.isLoading}
          />
          <StatCard
            title="Stok Rendah"
            value={statsAll.data?.lowStock ?? 0}
            icon={<TrendingUp size={18} />}
            color="purple"
            subtitle="Stok ≤ 5 satuan"
            loading={statsAll.isLoading}
          />
        </div>

        {/* Low stock alert banner */}
        <LowStockAlert />

        {/* Filter & actions bar */}
        <div className="flex items-center justify-between gap-3">
          <input
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Cari bahan baku..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50"
            >
              <Upload size={16} /> Import CSV
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              <Plus size={16} /> Tambah Bahan Baku
            </button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex gap-4 items-center">
                  <div className="h-4 bg-gray-100 rounded animate-pulse flex-1" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-16" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-24" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Nama</th>
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-left">Satuan</th>
                  <th className="px-4 py-3 text-right">Stok</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">HPP Rata-rata</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <Package size={32} className="mx-auto text-gray-200 mb-2" />
                      <p className="text-gray-400 text-sm">Belum ada bahan baku.</p>
                      <p className="text-gray-300 text-xs mt-1">Klik "Tambah Bahan Baku" untuk memulai.</p>
                    </td>
                  </tr>
                )}
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{item.sku ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{item.unit?.alias ?? item.unit?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.is_low_stock && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                            <AlertTriangle size={11} />
                            Stok Rendah
                          </span>
                        )}
                        {item.stock.toLocaleString('id-ID', { maximumFractionDigits: 3 })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StockBadge stock={item.stock} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.avg_cost > 0
                        ? <span className="font-semibold text-blue-700">{formatCurrency(item.avg_cost)}</span>
                        : <span className="text-gray-300 text-xs italic">Belum ada pembelian</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          title="Stok Masuk"
                          onClick={() => setStockInModal({ open: true, item })}
                          className="p-1.5 rounded hover:bg-green-50 text-green-600"
                        >
                          <ArrowDownToLine size={14} />
                        </button>
                        <button
                          title="Sesuaikan Stok"
                          onClick={() => { setNewQty(String(item.stock)); setAdjustNotes(''); setAdjustModal({ open: true, item }) }}
                          className="p-1.5 rounded hover:bg-orange-50 text-orange-600"
                        >
                          <SlidersHorizontal size={14} />
                        </button>
                        <button
                          title="Catat Pemborosan/Sisa"
                          onClick={() => { setWasteQty(''); setWasteNotes(''); setWasteModal({ open: true, item }) }}
                          className="p-1.5 rounded hover:bg-red-50 text-red-500"
                        >
                          <Flame size={14} />
                        </button>
                        <button
                          title="Edit"
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          title="Hapus"
                          onClick={() => { if (confirm('Hapus bahan baku ini?')) deleteMut.mutate(item.id) }}
                          className="p-1.5 rounded hover:bg-red-50 text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} total={total} limit={20} onChange={setPage} />
      </div>

      {/* CSV Import Modal */}
      {showImportModal && (
        <RawMaterialImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['raw-materials'] })
          }}
        />
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={formModal.open}
        onClose={() => setFormModal({ open: false })}
        title={formModal.item ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama <span className="text-red-500">*</span></label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: Tepung Terigu"
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU (opsional)</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: BK-001"
              value={formData.sku ?? ''}
              onChange={e => setFormData(p => ({ ...p, sku: e.target.value || null }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stok Minimum (Alert)</label>
            <input
              type="number"
              min="0"
              step="0.001"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0 (kosongkan untuk nonaktif)"
              value={formData.min_stock ?? ''}
              onChange={e => setFormData(p => ({ ...p, min_stock: e.target.value === '' ? null : parseFloat(e.target.value) }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setFormModal({ open: false })} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button>
            <button
              onClick={handleFormSubmit}
              disabled={createMut.isPending || updateMut.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {createMut.isPending || updateMut.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Stock In Modal */}
      <Modal
        open={stockInModal.open}
        onClose={() => setStockInModal({ open: false })}
        title={`Stok Masuk — ${stockInModal.item?.name}`}
      >
        {stockInModal.item && (
          <StockInForm
            item={stockInModal.item}
            loading={stockInMut.isPending}
            onSubmit={payload => stockInMut.mutate({ id: stockInModal.item!.id, payload })}
          />
        )}
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        open={adjustModal.open}
        onClose={() => setAdjustModal({ open: false })}
        title={`Sesuaikan Stok — ${adjustModal.item?.name}`}
      >
        {adjustModal.item && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs">
              <p className="text-gray-400">Stok Tercatat Saat Ini</p>
              <p className="font-bold text-gray-800 text-base mt-0.5">
                {adjustModal.item.stock.toLocaleString('id-ID', { maximumFractionDigits: 3 })}{' '}
                <span className="font-normal text-gray-400">{adjustModal.item.unit?.alias ?? adjustModal.item.unit?.name ?? ''}</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stok Aktual (hasil hitung fisik)</label>
              <input
                type="number"
                min="0"
                step="0.001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newQty}
                onChange={e => setNewQty(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Alasan penyesuaian..."
                value={adjustNotes}
                onChange={e => setAdjustNotes(e.target.value)}
              />
            </div>
            {newQty !== '' && parseFloat(newQty) !== adjustModal.item.stock && (
              <div className={`rounded-lg px-4 py-3 text-xs flex items-center gap-2 ${parseFloat(newQty) < adjustModal.item.stock ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                <AlertTriangle size={14} className="shrink-0" />
                {parseFloat(newQty) < adjustModal.item.stock
                  ? `Stok akan berkurang ${(adjustModal.item.stock - parseFloat(newQty)).toLocaleString('id-ID', { maximumFractionDigits: 3 })} satuan`
                  : `Stok akan bertambah ${(parseFloat(newQty) - adjustModal.item.stock).toLocaleString('id-ID', { maximumFractionDigits: 3 })} satuan`
                }
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setAdjustModal({ open: false })} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button>
              <button
                onClick={() => adjustMut.mutate({ id: adjustModal.item!.id, payload: { new_quantity: parseFloat(newQty), notes: adjustNotes || undefined } })}
                disabled={adjustMut.isPending || newQty === ''}
                className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-semibold"
              >
                {adjustMut.isPending ? 'Menyimpan...' : 'Sesuaikan'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Waste Modal */}
      <Modal
        open={wasteModal.open}
        onClose={() => setWasteModal({ open: false })}
        title={`Catat Pemborosan/Sisa — ${wasteModal.item?.name}`}
      >
        {wasteModal.item && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-xs">
              <p className="text-gray-400">Stok Saat Ini</p>
              <p className="font-bold text-gray-800 text-base mt-0.5">
                {wasteModal.item.stock.toLocaleString('id-ID', { maximumFractionDigits: 3 })}{' '}
                <span className="font-normal text-gray-400">{wasteModal.item.unit?.alias ?? wasteModal.item.unit?.name ?? ''}</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jumlah Waste <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.001"
                step="0.001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="0"
                value={wasteQty}
                onChange={e => setWasteQty(e.target.value)}
              />
              {wasteQty !== '' && parseFloat(wasteQty) > wasteModal.item.stock && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} className="shrink-0" />
                  Jumlah waste melebihi stok tersedia ({wasteModal.item.stock.toLocaleString('id-ID', { maximumFractionDigits: 3 })})
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="Alasan pemborosan, bahan kadaluarsa, dll."
                value={wasteNotes}
                onChange={e => setWasteNotes(e.target.value)}
              />
            </div>
            {wasteQty !== '' && parseFloat(wasteQty) > 0 && parseFloat(wasteQty) <= wasteModal.item.stock && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-xs flex items-center justify-between">
                <div>
                  <p className="text-red-700 font-semibold">Stok setelah waste</p>
                  <p className="text-gray-400 mt-0.5">Perkiraan stok yang tersisa</p>
                </div>
                <p className="text-lg font-bold text-red-700">
                  {(wasteModal.item.stock - parseFloat(wasteQty)).toLocaleString('id-ID', { maximumFractionDigits: 3 })}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setWasteModal({ open: false })} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button>
              <button
                onClick={() => wasteMut.mutate({ id: wasteModal.item!.id, payload: { quantity: parseFloat(wasteQty), notes: wasteNotes || null } })}
                disabled={
                  wasteMut.isPending ||
                  wasteQty === '' ||
                  parseFloat(wasteQty) <= 0 ||
                  parseFloat(wasteQty) > wasteModal.item.stock
                }
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold"
              >
                {wasteMut.isPending ? 'Menyimpan...' : 'Catat Waste'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
