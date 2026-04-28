import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ArrowDownToLine, SlidersHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import {
  getRawMaterials,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  stockInRawMaterial,
  adjustRawMaterialStock,
} from '@/api/rawMaterials'
import type { CreateRawMaterialPayload, StockInPayload, AdjustStockPayload } from '@/api/rawMaterials'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import type { RawMaterial } from '@/types'

// ─── Sub-form for stock-in ──────────────────────────────────────────────────

function StockInForm({
  onSubmit,
  loading,
}: {
  onSubmit: (data: StockInPayload) => void
  loading: boolean
}) {
  const [qty, setQty] = useState('')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')

  return (
    <div className="space-y-4">
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
  const [newQty, setNewQty] = useState('')
  const [formData, setFormData] = useState<CreateRawMaterialPayload>({ name: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['raw-materials', { page, search }],
    queryFn: () => getRawMaterials({ page, limit: 20, search: search || undefined }),
  })

  const items: RawMaterial[] = data?.data?.data ?? []
  const total: number = data?.data?.pagination?.total ?? 0

  const createMut = useMutation({
    mutationFn: (payload: CreateRawMaterialPayload) => createRawMaterial(payload),
    onSuccess: () => { toast.success('Bahan baku berhasil dibuat'); qc.invalidateQueries({ queryKey: ['raw-materials'] }); setFormModal({ open: false }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateRawMaterialPayload }) => updateRawMaterial(id, payload),
    onSuccess: () => { toast.success('Bahan baku berhasil diubah'); qc.invalidateQueries({ queryKey: ['raw-materials'] }); setFormModal({ open: false }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteRawMaterial(id),
    onSuccess: () => { toast.success('Bahan baku berhasil dihapus'); qc.invalidateQueries({ queryKey: ['raw-materials'] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const stockInMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: StockInPayload }) => stockInRawMaterial(id, payload),
    onSuccess: () => { toast.success('Stok berhasil ditambahkan'); qc.invalidateQueries({ queryKey: ['raw-materials'] }); setStockInModal({ open: false }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const adjustMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdjustStockPayload }) => adjustRawMaterialStock(id, payload),
    onSuccess: () => { toast.success('Stok berhasil disesuaikan'); qc.invalidateQueries({ queryKey: ['raw-materials'] }); setAdjustModal({ open: false }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  function openCreate() {
    setFormData({ name: '' })
    setFormModal({ open: true })
  }

  function openEdit(item: RawMaterial) {
    setFormData({ name: item.name, sku: item.sku ?? undefined, unit_id: item.unit?.id ?? undefined })
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

      <div className="p-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <input
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Cari bahan baku..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            <Plus size={16} /> Tambah Bahan Baku
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Memuat data...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Nama</th>
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-left">Satuan</th>
                  <th className="px-4 py-3 text-right">Stok</th>
                  <th className="px-4 py-3 text-right">HPP Rata-rata</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">Belum ada bahan baku.</td>
                  </tr>
                )}
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                    <td className="px-4 py-3 text-gray-500">{item.sku ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{item.unit?.alias ?? item.unit?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-right font-mono">{item.stock.toLocaleString('id-ID', { maximumFractionDigits: 3 })}</td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-700">{formatCurrency(item.avg_cost)}</td>
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
                          onClick={() => { setNewQty(String(item.stock)); setAdjustModal({ open: true, item }) }}
                          className="p-1.5 rounded hover:bg-orange-50 text-orange-600"
                        >
                          <SlidersHorizontal size={14} />
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

        <div className="mt-4">
          <Pagination current={page} total={total} limit={20} onPage={setPage} />
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={formModal.open}
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
        isOpen={stockInModal.open}
        onClose={() => setStockInModal({ open: false })}
        title={`Stok Masuk — ${stockInModal.item?.name}`}
      >
        {stockInModal.item && (
          <StockInForm
            loading={stockInMut.isPending}
            onSubmit={payload => stockInMut.mutate({ id: stockInModal.item!.id, payload })}
          />
        )}
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={adjustModal.open}
        onClose={() => setAdjustModal({ open: false })}
        title={`Sesuaikan Stok — ${adjustModal.item?.name}`}
      >
        {adjustModal.item && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Stok saat ini: <strong>{adjustModal.item.stock}</strong></p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stok Baru</label>
              <input
                type="number"
                min="0"
                step="0.001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newQty}
                onChange={e => setNewQty(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAdjustModal({ open: false })} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button>
              <button
                onClick={() => adjustMut.mutate({ id: adjustModal.item!.id, payload: { new_quantity: parseFloat(newQty) } })}
                disabled={adjustMut.isPending || newQty === ''}
                className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-semibold"
              >
                {adjustMut.isPending ? 'Menyimpan...' : 'Sesuaikan'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
