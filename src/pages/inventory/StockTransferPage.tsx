import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Check, ArrowRight, X, GitBranch, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import {
  getStockTransfersByBusiness,
  createStockTransfer,
  approveStockTransfer,
  completeStockTransfer,
  cancelStockTransfer,
} from '@/api/stock'
import { getOutletsByBusiness } from '@/api/outlets'
import { useAuthStore } from '@/store/authStore'
import type { StockTransfer, Outlet } from '@/types'
import { formatDateTime, getErrorMessage } from '@/lib/utils'

function statusBadge(status: StockTransfer['status']) {
  const map: Record<string, { variant: 'blue' | 'green' | 'gray' | 'red' | 'yellow' | 'purple'; label: string }> = {
    PENDING:   { variant: 'yellow', label: 'Menunggu' },
    APPROVED:  { variant: 'blue',   label: 'Disetujui' },
    COMPLETED: { variant: 'green',  label: 'Selesai' },
    CANCELED:  { variant: 'red',    label: 'Dibatalkan' },
  }
  const s = map[status] ?? { variant: 'gray', label: status }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

export default function StockTransferPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const businessId = user?.business?.id ?? ''

  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<StockTransfer | null>(null)
  const [createModal, setCreateModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'complete' | 'cancel'; id: string } | null>(null)

  // Form state
  const [form, setForm] = useState({
    from_outlet_id: '',
    to_outlet_id: '',
    product_id: '',
    quantity: 1,
    notes: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['stock-transfers', { businessId, page, status: statusFilter }],
    queryFn: () => getStockTransfersByBusiness(businessId, {
      page,
      limit: 20,
      status: statusFilter || undefined,
    }),
    enabled: !!businessId,
  })

  const { data: outletsData } = useQuery({
    queryKey: ['outlets-selector', businessId],
    queryFn: () => getOutletsByBusiness(businessId, { limit: 50, page: 1 }),
    enabled: !!businessId,
    staleTime: 60_000,
  })

  const transfers = data?.data?.data ?? []
  const pagination = data?.data?.pagination
  const outlets: Outlet[] = outletsData?.data?.data ?? []

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['stock-transfers'] })
    qc.invalidateQueries({ queryKey: ['stock-movements'] })
  }

  const createMut = useMutation({
    mutationFn: () => createStockTransfer({ business_id: businessId, ...form, quantity: Number(form.quantity) }),
    onSuccess: () => { toast.success('Transfer berhasil dibuat'); invalidate(); setCreateModal(false); resetForm() },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const approveMut = useMutation({
    mutationFn: (id: string) => approveStockTransfer(id),
    onSuccess: () => { toast.success('Transfer disetujui'); invalidate(); setConfirmAction(null) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const completeMut = useMutation({
    mutationFn: (id: string) => completeStockTransfer(id),
    onSuccess: () => { toast.success('Transfer selesai, stok diperbarui'); invalidate(); setConfirmAction(null) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelStockTransfer(id),
    onSuccess: () => { toast.success('Transfer dibatalkan'); invalidate(); setConfirmAction(null) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const resetForm = () => setForm({ from_outlet_id: '', to_outlet_id: '', product_id: '', quantity: 1, notes: '' })

  const columns = [
    {
      key: 'transfer_code',
      label: 'Kode',
      render: (row: StockTransfer) => (
        <span className="font-mono text-sm font-semibold text-gray-900">{row.transfer_code}</span>
      ),
    },
    {
      key: 'route',
      label: 'Rute',
      render: (row: StockTransfer) => (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <GitBranch size={13} className="text-gray-400" />
          <span>{row.from_outlet?.name ?? '-'}</span>
          <ArrowRight size={13} className="text-gray-400" />
          <span>{row.to_outlet?.name ?? '-'}</span>
        </div>
      ),
    },
    {
      key: 'product',
      label: 'Produk',
      render: (row: StockTransfer) => (
        <div className="flex items-center gap-2">
          <Package size={14} className="text-gray-400 shrink-0" />
          <span className="text-sm text-gray-700">{row.product?.name ?? '-'}</span>
        </div>
      ),
    },
    {
      key: 'quantity',
      label: 'Qty',
      render: (row: StockTransfer) => (
        <span className="text-sm font-semibold text-gray-900">{row.quantity}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: StockTransfer) => statusBadge(row.status),
    },
    {
      key: 'created_at',
      label: 'Dibuat',
      render: (row: StockTransfer) => (
        <span className="text-xs text-gray-400">{formatDateTime(row.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row: StockTransfer) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setSelected(row) }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            <Eye size={14} />
          </button>
          {row.status === 'PENDING' && (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'approve', id: row.id }) }}
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
              title="Setujui"
            >
              <Check size={14} />
            </button>
          )}
          {row.status === 'APPROVED' && (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'complete', id: row.id }) }}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
              title="Tandai Selesai"
            >
              <ArrowRight size={14} />
            </button>
          )}
          {(row.status === 'PENDING' || row.status === 'APPROVED') && (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'cancel', id: row.id }) }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Batalkan"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ),
    },
  ]

  const confirmLabels = {
    approve:  { title: 'Setujui Transfer', desc: 'Stok belum bergerak, transfer akan menunggu eksekusi.', btn: 'Setujui', color: 'bg-green-500 hover:bg-green-600' },
    complete: { title: 'Tandai Selesai', desc: 'Stok akan langsung dipindahkan dari outlet asal ke tujuan.', btn: 'Selesaikan', color: 'bg-blue-500 hover:bg-blue-600' },
    cancel:   { title: 'Batalkan Transfer', desc: 'Transfer tidak dapat dibatalkan setelah selesai.', btn: 'Batalkan', color: 'bg-red-500 hover:bg-red-600' },
  }

  const handleConfirm = () => {
    if (!confirmAction) return
    if (confirmAction.type === 'approve') approveMut.mutate(confirmAction.id)
    else if (confirmAction.type === 'complete') completeMut.mutate(confirmAction.id)
    else cancelMut.mutate(confirmAction.id)
  }

  const isPending = approveMut.isPending || completeMut.isPending || cancelMut.isPending

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Transfer Stok" subtitle="Manajemen perpindahan stok antar outlet" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* Status timeline legend */}
        <div className="flex items-center gap-2 mb-5 text-xs text-gray-500 bg-white border border-gray-100 rounded-xl px-4 py-3">
          <span className="font-semibold text-gray-700">Alur:</span>
          {(['PENDING', 'APPROVED', 'COMPLETED'] as const).map((s, i, arr) => (
            <span key={s} className="flex items-center gap-2">
              {statusBadge(s)}
              {i < arr.length - 1 && <ArrowRight size={12} className="text-gray-300" />}
            </span>
          ))}
          <span className="mx-2 text-gray-300">|</span>
          {statusBadge('CANCELED')}
          <span className="text-gray-400">(bisa dari PENDING atau APPROVED)</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="py-2 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
            >
              <option value="">Semua Status</option>
              <option value="PENDING">Menunggu</option>
              <option value="APPROVED">Disetujui</option>
              <option value="COMPLETED">Selesai</option>
              <option value="CANCELED">Dibatalkan</option>
            </select>
            <p className="text-sm text-gray-500 ml-auto">
              Total: <span className="font-semibold text-gray-900">{pagination?.total ?? 0}</span>
            </p>
            <button
              onClick={() => setCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition"
            >
              <Plus size={15} />
              Transfer Baru
            </button>
          </div>

          <DataTable
            columns={columns as never[]}
            data={transfers as never[]}
            loading={isLoading}
            onRowClick={(row) => setSelected(row as StockTransfer)}
          />
          <Pagination page={page} total={pagination?.total ?? 0} limit={20} onChange={setPage} />
        </div>
      </div>

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detail Transfer Stok" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xl font-bold font-mono">{selected.transfer_code}</p>
              {statusBadge(selected.status)}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Dari Outlet</p>
                <p className="font-medium">{selected.from_outlet?.name ?? '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Ke Outlet</p>
                <p className="font-medium">{selected.to_outlet?.name ?? '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Produk</p>
                <p className="font-medium">{selected.product?.name ?? '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Jumlah</p>
                <p className="font-medium text-lg">{selected.quantity}</p>
              </div>
              {selected.notes && (
                <div className="col-span-2 bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Catatan</p>
                  <p className="font-medium">{selected.notes}</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Dibuat</p>
                <p className="font-medium text-xs">{formatDateTime(selected.created_at)}</p>
              </div>
              {selected.approved_at && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Disetujui</p>
                  <p className="font-medium text-xs">{formatDateTime(selected.approved_at)}</p>
                </div>
              )}
              {selected.completed_at && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Selesai</p>
                  <p className="font-medium text-xs">{formatDateTime(selected.completed_at)}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              {selected.status === 'PENDING' && (
                <button
                  onClick={() => { setSelected(null); setConfirmAction({ type: 'approve', id: selected.id }) }}
                  className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition"
                >
                  Setujui
                </button>
              )}
              {selected.status === 'APPROVED' && (
                <button
                  onClick={() => { setSelected(null); setConfirmAction({ type: 'complete', id: selected.id }) }}
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition"
                >
                  Tandai Selesai
                </button>
              )}
              {(selected.status === 'PENDING' || selected.status === 'APPROVED') && (
                <button
                  onClick={() => { setSelected(null); setConfirmAction({ type: 'cancel', id: selected.id }) }}
                  className="flex-1 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-xl transition"
                >
                  Batalkan
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal open={createModal} onClose={() => { setCreateModal(false); resetForm() }} title="Transfer Stok Baru" size="sm">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Dari Outlet</label>
            <select
              value={form.from_outlet_id}
              onChange={(e) => setForm(f => ({ ...f, from_outlet_id: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Pilih outlet asal</option>
              {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Ke Outlet</label>
            <select
              value={form.to_outlet_id}
              onChange={(e) => setForm(f => ({ ...f, to_outlet_id: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Pilih outlet tujuan</option>
              {outlets.filter(o => o.id !== form.from_outlet_id).map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Product ID</label>
            <input
              type="text"
              placeholder="UUID produk..."
              value={form.product_id}
              onChange={(e) => setForm(f => ({ ...f, product_id: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Jumlah</label>
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Catatan (opsional)</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Alasan transfer..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setCreateModal(false); resetForm() }} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">Batal</button>
            <button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || !form.from_outlet_id || !form.to_outlet_id || !form.product_id}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition"
            >
              {createMut.isPending ? 'Membuat...' : 'Buat Transfer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Action Modal */}
      <Modal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction ? confirmLabels[confirmAction.type].title : ''}
        size="sm"
      >
        {confirmAction && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{confirmLabels[confirmAction.type].desc}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">Batal</button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className={`flex-1 py-2.5 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition ${confirmLabels[confirmAction.type].color}`}
              >
                {isPending ? 'Memproses...' : confirmLabels[confirmAction.type].btn}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
