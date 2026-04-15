import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { getDiscounts, createDiscount, updateDiscount, deleteDiscount } from '@/api/library'
import type { Discount, DiscountScope } from '@/types'
import { getErrorMessage, formatCurrency } from '@/lib/utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const SCOPE_OPTIONS: { value: DiscountScope; label: string; hint: string }[] = [
  { value: 'global',   label: 'Global (Seluruh Keranjang)', hint: 'Diterapkan setelah semua diskon item.' },
  { value: 'category', label: 'Kategori',                  hint: 'Berlaku untuk semua produk dalam satu kategori.' },
  { value: 'product',  label: 'Produk',                    hint: 'Berlaku untuk produk tertentu (tanpa varian spesifik).' },
  { value: 'variant',  label: 'Varian Produk',             hint: 'Berlaku hanya untuk satu varian produk.' },
]

const SCOPE_BADGE: Record<DiscountScope, { label: string; variant: 'blue' | 'green' | 'yellow' | 'red' }> = {
  global:   { label: 'Global',   variant: 'blue' },
  category: { label: 'Kategori', variant: 'green' },
  product:  { label: 'Produk',   variant: 'yellow' },
  variant:  { label: 'Varian',   variant: 'red' },
}

const emptyForm = {
  name: '',
  description: '',
  amount: 0,
  is_percentage: false,
  scope: 'global' as DiscountScope,
  ref_id: '',
  is_multiple: false,
  is_active: true,
  start_at: '',
  end_at: '',
}

type DiscountForm = typeof emptyForm

// ─── Component ────────────────────────────────────────────────────────────────

export default function DiscountsTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Discount | null>(null)
  const [form, setForm] = useState<DiscountForm>(emptyForm)

  const set = (key: keyof DiscountForm, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }))

  const { data, isLoading } = useQuery({
    queryKey: ['discounts', { page, limit: 10 }],
    queryFn: () => getDiscounts({ page, limit: 10 }),
  })

  const items = data?.data?.data ?? []
  const pagination = data?.data?.pagination

  const toPayload = (f: DiscountForm) => ({
    name: f.name,
    description: f.description || undefined,
    amount: Number(f.amount),
    is_percentage: f.is_percentage,
    scope: f.scope,
    ref_id: f.scope !== 'global' && f.ref_id.trim() ? f.ref_id.trim() : null,
    // Backward compat: kirim is_global=true jika scope=global
    is_global: f.scope === 'global',
    is_multiple: f.is_multiple,
    is_active: f.is_active,
    start_at: f.start_at || null,
    end_at: f.end_at || null,
  })

  const createMut = useMutation({
    mutationFn: () => createDiscount(toPayload(form)),
    onSuccess: () => {
      toast.success('Diskon Dibuat')
      qc.invalidateQueries({ queryKey: ['discounts'] })
      setModal(false)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateDiscount(editing!.id, toPayload(form)),
    onSuccess: () => {
      toast.success('Diskon Diperbarui')
      qc.invalidateQueries({ queryKey: ['discounts'] })
      setModal(false)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteDiscount(id),
    onSuccess: () => {
      toast.success('Diskon Dihapus')
      qc.invalidateQueries({ queryKey: ['discounts'] })
      setDeleteId(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true) }

  const openEdit = (row: Discount) => {
    setEditing(row)
    // Tentukan scope: pakai field scope baru, fallback ke is_global lama
    const scope: DiscountScope = row.scope ?? (row.is_global ? 'global' : 'global')
    setForm({
      name: row.name,
      description: row.description ?? '',
      amount: row.amount,
      is_percentage: row.is_percentage,
      scope,
      ref_id: row.ref_id ?? '',
      is_multiple: row.is_multiple,
      is_active: row.is_active,
      start_at: row.start_at ? row.start_at.slice(0, 16) : '',
      end_at: row.end_at ? row.end_at.slice(0, 16) : '',
    })
    setModal(true)
  }

  const resolveScope = (row: Discount): DiscountScope =>
    row.scope ?? (row.is_global ? 'global' : 'global')

  const columns = [
    {
      key: 'name', label: 'Nama',
      render: (row: Discount) => <span className="font-medium text-gray-900">{row.name}</span>,
    },
    {
      key: 'amount', label: 'Nilai',
      render: (row: Discount) => (
        <span className="font-semibold text-gray-900">
          {row.is_percentage ? `${row.amount}%` : formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: 'scope', label: 'Scope',
      render: (row: Discount) => {
        const scope = resolveScope(row)
        const badge = SCOPE_BADGE[scope]
        return (
          <div className="flex flex-col gap-0.5">
            <Badge variant={badge.variant}>{badge.label}</Badge>
            {scope !== 'global' && row.ref_id && (
              <span className="text-[10px] text-gray-400 font-mono truncate max-w-[120px]">{row.ref_id}</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'flags', label: 'Opsi',
      render: (row: Discount) => (
        <div className="flex gap-1 flex-wrap">
          {row.is_multiple && <Badge variant="blue">Per Unit</Badge>}
        </div>
      ),
    },
    {
      key: 'is_active', label: 'Status',
      render: (row: Discount) => row.is_active
        ? <Badge variant="green">Aktif</Badge>
        : <Badge variant="red">Nonaktif</Badge>,
    },
    {
      key: 'actions', label: '',
      render: (row: Discount) => (
        <div className="flex gap-1 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row) }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteId(row.id) }}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ]

  const selectedScopeOption = SCOPE_OPTIONS.find((o) => o.value === form.scope)

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">{pagination?.total ?? 0} Diskon</span>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
          >
            <Plus size={15} /> Tambah
          </button>
        </div>
        <DataTable columns={columns as never[]} data={items as never[]} loading={isLoading} />
        <Pagination page={page} total={pagination?.total ?? 0} limit={10} onChange={setPage} />
      </div>

      {/* ─── Create / Edit Modal ─── */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Diskon' : 'Tambah Diskon'} size="md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (editing) updateMut.mutate()
            else createMut.mutate()
          }}
          className="space-y-4"
        >
          {/* Nama */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Diskon</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Diskon Hari Raya"
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deskripsi <span className="text-gray-400 font-normal">(Opsional)</span>
            </label>
            <input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Keterangan singkat..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tipe & Nilai */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
              <select
                value={form.is_percentage ? 'pct' : 'fix'}
                onChange={(e) => set('is_percentage', e.target.value === 'pct')}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="fix">Nominal (Rp)</option>
                <option value="pct">Persentase (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nilai {form.is_percentage ? '(%)' : '(Rp)'}
              </label>
              <input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* ─── Scope ─── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scope <span className="text-gray-400 font-normal">(Cakupan Diskon)</span>
            </label>
            <select
              value={form.scope}
              onChange={(e) => {
                set('scope', e.target.value as DiscountScope)
                set('ref_id', '') // reset ref saat scope berubah
              }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {SCOPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {selectedScopeOption && (
              <p className="mt-1 text-xs text-gray-400">{selectedScopeOption.hint}</p>
            )}
          </div>

          {/* Ref ID — tampil hanya jika scope bukan global */}
          {form.scope !== 'global' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                <Tag size={13} className="text-gray-400" />
                ID {form.scope === 'category' ? 'Kategori' : form.scope === 'product' ? 'Produk' : 'Varian'}
              </label>
              <input
                value={form.ref_id}
                onChange={(e) => set('ref_id', e.target.value)}
                placeholder={`UUID ${form.scope === 'category' ? 'kategori' : form.scope === 'product' ? 'produk' : 'varian'}...`}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Salin UUID dari halaman {form.scope === 'category' ? 'Kategori' : 'Produk'} (detail item → salin ID).
              </p>
            </div>
          )}

          {/* Waktu */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mulai <span className="text-gray-400 font-normal">(opsional)</span>
              </label>
              <input
                type="datetime-local"
                value={form.start_at}
                onChange={(e) => set('start_at', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selesai <span className="text-gray-400 font-normal">(opsional)</span>
              </label>
              <input
                type="datetime-local"
                value={form.end_at}
                onChange={(e) => set('end_at', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Flags */}
          <div className="flex flex-wrap gap-4">
            {([
              { key: 'is_multiple' as const, label: 'Per Unit (diskon berlaku × kuantitas)' },
              { key: 'is_active' as const, label: 'Aktif' },
            ]).map((f) => (
              <label key={f.key} className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form[f.key]}
                  onChange={(e) => set(f.key, e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-sm text-gray-700">{f.label}</span>
              </label>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setModal(false)}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMut.isPending || updateMut.isPending}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60"
            >
              {createMut.isPending || updateMut.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Delete Confirm ─── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus Diskon" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Yakin ingin menghapus diskon ini?</p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteId(null)}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              onClick={() => deleteMut.mutate(deleteId!)}
              disabled={deleteMut.isPending}
              className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-60"
            >
              {deleteMut.isPending ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
