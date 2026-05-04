import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, XCircle, Trash2, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  deletePurchaseOrder,
} from '@/api/purchaseOrders'
import type { CreatePOPayload, POItemPayload, ReceiveItemPayload } from '@/api/purchaseOrders'
import { getSuppliers } from '@/api/suppliers'
import { getRawMaterials } from '@/api/rawMaterials'
import { formatCurrency, formatDate, getErrorMessage } from '@/lib/utils'
import type { PurchaseOrder, POItem, Supplier, RawMaterial } from '@/types'

// ─── Status helpers ──────────────────────────────────────────────────────────

type POStatus = PurchaseOrder['status']

const STATUS_LABEL: Record<POStatus, string> = {
  draft: 'Draft',
  ordered: 'Dipesan',
  partial_received: 'Sebagian Diterima',
  received: 'Diterima',
  cancelled: 'Dibatalkan',
}

const STATUS_BADGE: Record<POStatus, 'gray' | 'blue' | 'yellow' | 'green' | 'red'> = {
  draft: 'gray',
  ordered: 'blue',
  partial_received: 'yellow',
  received: 'green',
  cancelled: 'red',
}

function StatusBadge({ status }: { status: POStatus }) {
  return <Badge variant={STATUS_BADGE[status]}>{STATUS_LABEL[status]}</Badge>
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

const TABS: { key: string; label: string }[] = [
  { key: '', label: 'Semua' },
  { key: 'draft', label: 'Draft' },
  { key: 'ordered', label: 'Ordered' },
  { key: 'received', label: 'Diterima' },
  { key: 'cancelled', label: 'Dibatalkan' },
]

// ─── Create PO Modal ─────────────────────────────────────────────────────────

interface CreatePORow extends POItemPayload {
  _key: number
  raw_material_name: string
  unit_alias: string
}

let rowKeyCounter = 0

function CreatePOModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [poNumber, setPoNumber] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<CreatePORow[]>([])
  const [rmSearch, setRmSearch] = useState('')

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () => getSuppliers({ page: 1, limit: 200 }),
    enabled: open,
  })

  const { data: rmData } = useQuery({
    queryKey: ['raw-materials-search', rmSearch],
    queryFn: () => getRawMaterials({ page: 1, limit: 20, search: rmSearch || undefined }),
    enabled: open,
  })

  const suppliers: Supplier[] = suppliersData?.data?.data ?? []
  const rawMaterials: RawMaterial[] = rmData?.data?.data ?? []

  const totalAmount = useMemo(
    () => rows.reduce((sum, r) => sum + r.quantity_ordered * r.unit_cost, 0),
    [rows]
  )

  function addRow(rm: RawMaterial) {
    setRows((prev) => [
      ...prev,
      {
        _key: ++rowKeyCounter,
        raw_material_id: rm.id,
        raw_material_name: rm.name,
        unit_alias: rm.unit?.alias ?? rm.unit?.name ?? '',
        quantity_ordered: 1,
        unit_cost: rm.avg_cost ?? 0,
      },
    ])
    setRmSearch('')
  }

  function updateRow(key: number, field: 'quantity_ordered' | 'unit_cost', val: string) {
    setRows((prev) =>
      prev.map((r) => (r._key === key ? { ...r, [field]: parseFloat(val) || 0 } : r))
    )
  }

  function removeRow(key: number) {
    setRows((prev) => prev.filter((r) => r._key !== key))
  }

  const createMut = useMutation({
    mutationFn: (payload: CreatePOPayload) => createPurchaseOrder(payload),
    onSuccess: () => {
      toast.success('Purchase Order berhasil dibuat')
      onSuccess()
      onClose()
      resetForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  function resetForm() {
    setPoNumber('')
    setSupplierId('')
    setOrderDate(new Date().toISOString().slice(0, 10))
    setExpectedDate('')
    setNotes('')
    setRows([])
    setRmSearch('')
  }

  function handleClose() {
    onClose()
    resetForm()
  }

  function handleSave() {
    if (!poNumber.trim()) { toast.error('Nomor PO wajib diisi'); return }
    if (rows.length === 0) { toast.error('Tambahkan minimal 1 item'); return }
    createMut.mutate({
      po_number: poNumber,
      supplier_id: supplierId || null,
      order_date: orderDate,
      expected_date: expectedDate || null,
      notes: notes || null,
      items: rows.map(({ raw_material_id, quantity_ordered, unit_cost }) => ({
        raw_material_id,
        quantity_ordered,
        unit_cost,
      })),
    })
  }

  return (
    <Modal open={open} onClose={handleClose} title="Buat Purchase Order" size="lg">
      <div className="space-y-5">
        {/* Header fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. PO <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="PO-2024-001"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier (opsional)</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">— Tanpa Supplier —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Order</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tgl Ekspektasi (opsional)</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
          <textarea
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Catatan tambahan untuk PO ini..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Items section */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Item Bahan Baku</p>

          {/* Search raw material */}
          <div className="relative mb-3">
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Cari bahan baku untuk ditambahkan..."
              value={rmSearch}
              onChange={(e) => setRmSearch(e.target.value)}
            />
            {rmSearch && rawMaterials.length > 0 && (
              <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {rawMaterials.map((rm) => (
                  <button
                    key={rm.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between"
                    onClick={() => addRow(rm)}
                  >
                    <span className="font-medium text-gray-800">{rm.name}</span>
                    <span className="text-gray-400 text-xs">{rm.unit?.alias ?? rm.unit?.name ?? ''}</span>
                  </button>
                ))}
              </div>
            )}
            {rmSearch && rawMaterials.length === 0 && (
              <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
                Tidak ditemukan
              </div>
            )}
          </div>

          {rows.length > 0 && (
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Bahan Baku</th>
                    <th className="px-3 py-2 text-left">Satuan</th>
                    <th className="px-3 py-2 text-right w-28">Jumlah</th>
                    <th className="px-3 py-2 text-right w-36">Harga/Satuan</th>
                    <th className="px-3 py-2 text-right w-32">Subtotal</th>
                    <th className="px-3 py-2 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((row) => (
                    <tr key={row._key}>
                      <td className="px-3 py-2 font-medium text-gray-800">{row.raw_material_name}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{row.unit_alias}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                          value={row.quantity_ordered}
                          onChange={(e) => updateRow(row._key, 'quantity_ordered', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                          value={row.unit_cost}
                          onChange={(e) => updateRow(row._key, 'unit_cost', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 font-mono text-xs">
                        {formatCurrency(row.quantity_ordered * row.unit_cost)}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeRow(row._key)}
                          className="p-1 rounded hover:bg-red-50 text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rows.length === 0 && (
            <div className="border border-dashed border-gray-200 rounded-lg py-6 text-center text-sm text-gray-400">
              Belum ada item. Cari bahan baku di atas untuk menambahkan.
            </div>
          )}
        </div>

        {/* Total */}
        {rows.length > 0 && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
            <span className="text-sm font-semibold text-blue-700">Total Amount</span>
            <span className="text-lg font-bold text-blue-700">{formatCurrency(totalAmount)}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={createMut.isPending}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
          >
            {createMut.isPending ? 'Menyimpan...' : 'Simpan PO'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── View / Receive PO Modal ─────────────────────────────────────────────────

function ViewPOModal({
  poId,
  open,
  onClose,
  onMutated,
}: {
  poId: string | null
  open: boolean
  onClose: () => void
  onMutated: () => void
}) {
  const qc = useQueryClient()
  const [showReceive, setShowReceive] = useState(false)
  const [receiveQtys, setReceiveQtys] = useState<Record<string, string>>({})
  const [receiveCosts, setReceiveCosts] = useState<Record<string, string>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-order', poId],
    queryFn: () => getPurchaseOrderById(poId!),
    enabled: open && !!poId,
  })

  const po: PurchaseOrder | null = data?.data?.data ?? null

  const receiveMut = useMutation({
    mutationFn: ({ id, items }: { id: string; items: ReceiveItemPayload[] }) =>
      receivePurchaseOrder(id, { items }),
    onSuccess: () => {
      toast.success('Barang berhasil diterima')
      qc.invalidateQueries({ queryKey: ['purchase-order', poId] })
      qc.invalidateQueries({ queryKey: ['raw-materials'] })
      onMutated()
      setShowReceive(false)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  function handleReceive() {
    if (!po) return
    const items: ReceiveItemPayload[] = po.items.map((item) => ({
      item_id: item.id,
      quantity_received: parseFloat(receiveQtys[item.id] ?? '0') || 0,
      unit_cost: parseFloat(receiveCosts[item.id] ?? String(item.unit_cost)) || item.unit_cost,
    }))
    receiveMut.mutate({ id: po.id, items })
  }

  function initReceive(items: POItem[]) {
    const qtys: Record<string, string> = {}
    const costs: Record<string, string> = {}
    items.forEach((item) => {
      qtys[item.id] = ''
      costs[item.id] = String(item.unit_cost)
    })
    setReceiveQtys(qtys)
    setReceiveCosts(costs)
    setShowReceive(true)
  }

  const canReceive = po
    ? po.status === 'draft' || po.status === 'ordered' || po.status === 'partial_received'
    : false

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); setShowReceive(false) }}
      title={po ? `Detail PO — ${po.po_number}` : 'Loading...'}
      size="lg"
    >
      {isLoading && (
        <div className="space-y-3 py-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      )}

      {po && (
        <div className="space-y-5">
          {/* PO info */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-gray-400 text-xs mb-0.5">No. PO</p>
              <p className="font-semibold text-gray-800">{po.po_number}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Status</p>
              <StatusBadge status={po.status} />
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Supplier</p>
              <p className="text-gray-700">{po.supplier?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Total Amount</p>
              <p className="font-bold text-blue-700">{formatCurrency(po.total_amount)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Tanggal Order</p>
              <p className="text-gray-700">{formatDate(po.order_date)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Tgl Ekspektasi</p>
              <p className="text-gray-700">{po.expected_date ? formatDate(po.expected_date) : '—'}</p>
            </div>
            {po.notes && (
              <div className="col-span-2">
                <p className="text-gray-400 text-xs mb-0.5">Catatan</p>
                <p className="text-gray-700">{po.notes}</p>
              </div>
            )}
          </div>

          {/* Items table */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Item</p>
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Bahan Baku</th>
                    <th className="px-3 py-2 text-left">Satuan</th>
                    <th className="px-3 py-2 text-right">Dipesan</th>
                    <th className="px-3 py-2 text-right">Diterima</th>
                    <th className="px-3 py-2 text-right">Harga/Satuan</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {po.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 font-medium text-gray-800">{item.raw_material_name}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{item.unit_alias}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-700">
                        {item.quantity_ordered.toLocaleString('id-ID', { maximumFractionDigits: 3 })}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-700">
                        {item.quantity_received.toLocaleString('id-ID', { maximumFractionDigits: 3 })}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(item.unit_cost)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Receive section */}
          {canReceive && !showReceive && (
            <div className="flex justify-end">
              <button
                onClick={() => initReceive(po.items)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
              >
                Terima Barang
              </button>
            </div>
          )}

          {canReceive && showReceive && (
            <div className="border border-green-100 rounded-xl overflow-hidden">
              <div className="bg-green-50 px-4 py-3 border-b border-green-100">
                <p className="text-sm font-semibold text-green-800">Terima Barang</p>
                <p className="text-xs text-green-600 mt-0.5">Isi jumlah yang benar-benar diterima dan harga per satuan</p>
              </div>
              <div className="divide-y divide-gray-50">
                {po.items.map((item) => (
                  <div key={item.id} className="px-4 py-3 grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-4">
                      <p className="text-sm font-medium text-gray-800">{item.raw_material_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Dipesan: {item.quantity_ordered} | Sudah diterima: {item.quantity_received}
                      </p>
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs text-gray-500 mb-1">Jml Diterima ({item.unit_alias})</label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                        placeholder="0"
                        value={receiveQtys[item.id] ?? ''}
                        onChange={(e) =>
                          setReceiveQtys((p) => ({ ...p, [item.id]: e.target.value }))
                        }
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs text-gray-500 mb-1">Harga/Satuan (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                        value={receiveCosts[item.id] ?? ''}
                        onChange={(e) =>
                          setReceiveCosts((p) => ({ ...p, [item.id]: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 flex justify-end gap-2 border-t border-gray-100">
                <button
                  onClick={() => setShowReceive(false)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleReceive}
                  disabled={receiveMut.isPending}
                  className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
                >
                  {receiveMut.isPending ? 'Menyimpan...' : 'Konfirmasi Penerimaan'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function PurchaseOrdersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [viewPoId, setViewPoId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', { page, statusFilter }],
    queryFn: () =>
      getPurchaseOrders({
        page,
        limit: 20,
        status: statusFilter || undefined,
      }),
  })

  const items: PurchaseOrder[] = data?.data?.data ?? []
  const total: number = data?.data?.pagination?.total ?? 0

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelPurchaseOrder(id),
    onSuccess: () => {
      toast.success('PO berhasil dibatalkan')
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePurchaseOrder(id),
    onSuccess: () => {
      toast.success('PO berhasil dihapus')
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <>
      <Header title="Purchase Order" />

      <div className="p-6 space-y-5">
        {/* Tabs + action */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setStatusFilter(tab.key); setPage(1) }}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            <Plus size={16} /> Buat PO
          </button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex gap-4 items-center">
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-28" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse flex-1" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-24" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-24" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-28" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-16" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">No. PO</th>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-left">Tgl Order</th>
                  <th className="px-4 py-3 text-left">Tgl Ekspektasi</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <ShoppingCart size={36} className="mx-auto text-gray-200 mb-3" />
                      <p className="text-gray-400 text-sm">Belum ada purchase order.</p>
                      <p className="text-gray-300 text-xs mt-1">Klik "Buat PO" untuk memulai.</p>
                    </td>
                  </tr>
                )}
                {items.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">
                      {po.po_number}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{po.supplier?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(po.order_date)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {po.expected_date ? formatDate(po.expected_date) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {formatCurrency(po.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={po.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          title="Lihat Detail"
                          onClick={() => setViewPoId(po.id)}
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                        >
                          <Eye size={14} />
                        </button>
                        {(po.status === 'draft' || po.status === 'ordered') && (
                          <button
                            title="Batalkan PO"
                            onClick={() => {
                              if (confirm(`Batalkan PO "${po.po_number}"?`)) cancelMut.mutate(po.id)
                            }}
                            className="p-1.5 rounded hover:bg-yellow-50 text-yellow-600"
                          >
                            <XCircle size={14} />
                          </button>
                        )}
                        {(po.status === 'draft' || po.status === 'cancelled') && (
                          <button
                            title="Hapus PO"
                            onClick={() => {
                              if (confirm(`Hapus PO "${po.po_number}"?`)) deleteMut.mutate(po.id)
                            }}
                            className="p-1.5 rounded hover:bg-red-50 text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
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

      {/* Create PO Modal */}
      <CreatePOModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['purchase-orders'] })}
      />

      {/* View / Receive PO Modal */}
      <ViewPOModal
        poId={viewPoId}
        open={!!viewPoId}
        onClose={() => setViewPoId(null)}
        onMutated={() => qc.invalidateQueries({ queryKey: ['purchase-orders'] })}
      />
    </>
  )
}
