import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Truck } from 'lucide-react'
import { EditButton, DeleteButton } from '@/components/ui/RowActions'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '@/api/suppliers'
import type { SupplierPayload } from '@/api/suppliers'
import { getErrorMessage } from '@/lib/utils'
import type { Supplier } from '@/types'

const EMPTY_FORM: SupplierPayload = {
  name: '',
  code: null,
  contact_name: null,
  phone: null,
  email: null,
  address: null,
  notes: null,
}

export default function SuppliersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formModal, setFormModal] = useState<{ open: boolean; item?: Supplier }>({ open: false })
  const [formData, setFormData] = useState<SupplierPayload>(EMPTY_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', { page, search }],
    queryFn: () => getSuppliers({ page, limit: 20, search: search || undefined }),
  })

  const items: Supplier[] = data?.data?.data ?? []
  const total: number = data?.data?.pagination?.total ?? 0

  const createMut = useMutation({
    mutationFn: (payload: SupplierPayload) => createSupplier(payload),
    onSuccess: () => {
      toast.success('Supplier berhasil dibuat')
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setFormModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SupplierPayload }) =>
      updateSupplier(id, payload),
    onSuccess: () => {
      toast.success('Supplier berhasil diubah')
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setFormModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSupplier(id),
    onSuccess: () => {
      toast.success('Supplier berhasil dihapus')
      qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  function openCreate() {
    setFormData(EMPTY_FORM)
    setFormModal({ open: true })
  }

  function openEdit(item: Supplier) {
    setFormData({
      name: item.name,
      code: item.code ?? null,
      contact_name: item.contact_name ?? null,
      phone: item.phone ?? null,
      email: item.email ?? null,
      address: item.address ?? null,
      notes: item.notes ?? null,
    })
    setFormModal({ open: true, item })
  }

  function handleSubmit() {
    if (!formData.name.trim()) return
    if (formModal.item) {
      updateMut.mutate({ id: formModal.item.id, payload: formData })
    } else {
      createMut.mutate(formData)
    }
  }

  const isSaving = createMut.isPending || updateMut.isPending

  return (
    <>
      <Header title="Supplier" />

      <div className="p-6 space-y-5">
        {/* Filter & actions bar */}
        <div className="flex items-center justify-between gap-3">
          <input
            className="border border-border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Cari supplier..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
          <button
            onClick={openCreate}
            data-tour="supplier-add"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            <Plus size={16} /> Tambah Supplier
          </button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex gap-4 items-center">
                  <div className="h-4 bg-muted rounded animate-pulse flex-1" />
                  <div className="h-4 bg-muted rounded animate-pulse w-24" />
                  <div className="h-4 bg-muted rounded animate-pulse w-32" />
                  <div className="h-4 bg-muted rounded animate-pulse w-28" />
                  <div className="h-4 bg-muted rounded animate-pulse w-36" />
                  <div className="h-4 bg-muted rounded animate-pulse w-16" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Nama</th>
                  <th className="px-4 py-3 text-left">Kode</th>
                  <th className="px-4 py-3 text-left">Kontak</th>
                  <th className="px-4 py-3 text-left">Telepon</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 max-w-xs mx-auto">
                        <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center border border-border">
                          <Truck size={26} className="text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Belum ada supplier</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Daftarkan supplier untuk membuat Purchase Order dan melacak riwayat pembelian bahan baku.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{item.code ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.contact_name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1" data-tour="row-actions">
                        <EditButton onClick={() => openEdit(item)} />
                        <DeleteButton onClick={() => { if (confirm(`Hapus supplier "${item.name}"?`)) deleteMut.mutate(item.id) }} />
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

      {/* Create / Edit Modal */}
      <Modal
        open={formModal.open}
        onClose={() => setFormModal({ open: false })}
        title={formModal.item ? 'Edit Supplier' : 'Tambah Supplier'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Nama <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: PT Sumber Makmur"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Kode (opsional)</label>
            <input
              type="text"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: SUP-001"
              value={formData.code ?? ''}
              onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value || null }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nama Kontak (opsional)</label>
              <input
                type="text"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mis. Budi (orang yang dihubungi)"
                value={formData.contact_name ?? ''}
                onChange={(e) => setFormData((p) => ({ ...p, contact_name: e.target.value || null }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Telepon (opsional)</label>
              <input
                type="text"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="08xxxxxxxxxx"
                value={formData.phone ?? ''}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value || null }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email (opsional)</label>
            <input
              type="email"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="supplier@email.com"
              value={formData.email ?? ''}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value || null }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Alamat (opsional)</label>
            <textarea
              rows={2}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Alamat lengkap supplier"
              value={formData.address ?? ''}
              onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value || null }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Catatan (opsional)</label>
            <textarea
              rows={2}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Catatan tambahan..."
              value={formData.notes ?? ''}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value || null }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setFormModal({ open: false })}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving || !formData.name.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
