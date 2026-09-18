import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RotateCcw, Truck } from 'lucide-react'
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
  createConsignmentReturn,
} from '@/api/suppliers'
import type { SupplierPayload } from '@/api/suppliers'
import { getErrorMessage } from '@/lib/utils'
import type { Supplier } from '@/types'
import { t } from '@/lib/i18n'
import { getOutletStocksAll } from '@/api/stock'
import { useOutletStore } from '@/store/outletStore'

const EMPTY_FORM: SupplierPayload = {
  name: '',
  code: null,
  contact_name: null,
  phone: null,
  email: null,
  address: null,
  notes: null,
  is_consignor: false,
}

export default function SuppliersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formModal, setFormModal] = useState<{ open: boolean; item?: Supplier }>({ open: false })
  const [formData, setFormData] = useState<SupplierPayload>(EMPTY_FORM)
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnForm, setReturnForm] = useState({ consignor_id: '', product_id: '', quantity: '1', notes: '' })
  const activeOutlet = useOutletStore(s => s.selected)

  const { data: stocksData } = useQuery({
    queryKey: ['outlet-stocks-all', activeOutlet?.id],
    queryFn: () => getOutletStocksAll(activeOutlet!.id),
    enabled: returnOpen && !!activeOutlet?.id,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', { page, search }],
    queryFn: () => getSuppliers({ page, limit: 20, search: search || undefined }),
  })

  const items: Supplier[] = data?.data?.data ?? []
  const total: number = data?.data?.pagination?.total ?? 0
  const consignors = items.filter(item => item.is_consignor)
  const consignmentStocks = (stocksData?.data?.data ?? []).filter(
    stock => stock.product?.consignor_id === returnForm.consignor_id && !stock.product?.has_variant,
  )

  const createMut = useMutation({
    mutationFn: (payload: SupplierPayload) => createSupplier(payload),
    onSuccess: () => {
      toast.success(t('supplierAdded'))
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setFormModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SupplierPayload }) =>
      updateSupplier(id, payload),
    onSuccess: () => {
      toast.success(t('supplierUpdated'))
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setFormModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSupplier(id),
    onSuccess: () => {
      toast.success(t('supplierDeleted'))
      qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const returnMut = useMutation({
    mutationFn: () => createConsignmentReturn({
      outlet_id: activeOutlet!.id,
      consignor_id: returnForm.consignor_id,
      notes: returnForm.notes || null,
      items: [{ product_id: returnForm.product_id, quantity: Number(returnForm.quantity) }],
    }),
    onSuccess: response => {
      toast.success(`Retur ${response.data.data.return_number} berhasil dibuat`)
      qc.invalidateQueries({ queryKey: ['outlet-stocks-all'] })
      setReturnOpen(false)
      setReturnForm({ consignor_id: '', product_id: '', quantity: '1', notes: '' })
    },
    onError: err => toast.error(getErrorMessage(err)),
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
      is_consignor: item.is_consignor,
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
      <Header title={t('navSuppliers')} subtitle="Kelola pemasok, penitip, catatan kerja sama, dan retur barang titipan." />

      <div className="p-6 space-y-5">
        {/* Filter & actions bar */}
        <div className="flex items-center justify-between gap-3">
          <input
            className="border border-border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('supplierSearch')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
          <div className="flex gap-2">
            <button onClick={() => setReturnOpen(true)} className="flex items-center gap-2 border border-border px-4 py-2 rounded-lg text-sm font-semibold hover:bg-muted">
              <RotateCcw size={16} /> Retur ke Penitip
            </button>
            <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
              <Plus size={16} /> Tambah Supplier / Penitip
            </button>
          </div>
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
          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">{t('labelName')}</th>
                  <th className="px-4 py-3 text-left">{t('labelCode')}</th>
                  <th className="px-4 py-3 text-left">{t('labelContact')}</th>
                  <th className="px-4 py-3 text-left">{t('labelPhone')}</th>
                  <th className="px-4 py-3 text-left">{t('labelEmail')}</th>
                  <th className="px-4 py-3 text-left">Jenis & Catatan</th>
                  <th className="px-4 py-3 text-center">{t('labelActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 max-w-xs mx-auto">
                        <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center border border-border">
                          <Truck size={26} className="text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{t('supplierEmpty')}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('supplierEmptyBody')}
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
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${item.is_consignor ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}>
                        {item.is_consignor ? 'Penitip' : 'Supplier'}
                      </span>
                      {item.notes && <p className="mt-1 max-w-56 truncate text-xs" title={item.notes}>{item.notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <EditButton onClick={() => openEdit(item)} />
                        <DeleteButton onClick={() => { if (confirm(t('confirmDeleteNamed', { name: item.name }))) deleteMut.mutate(item.id) }} />
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
        title={formModal.item ? t('supplierEdit') : t('supplierAdd')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('labelName')} <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('supplierNameExample')}
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer">
            <input type="checkbox" checked={formData.is_consignor ?? false}
              onChange={e => setFormData(p => ({ ...p, is_consignor: e.target.checked }))}
              className="mt-0.5" />
            <span><span className="block text-sm font-medium">Penitip barang</span><span className="block text-xs text-muted-foreground mt-0.5">Aktifkan bila kontak ini menitipkan barang untuk dijual.</span></span>
          </label>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('codeOptional')}</label>
            <input
              type="text"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('supplierCodeExample')}
              value={formData.code ?? ''}
              onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value || null }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('supplierContactOptional')}</label>
              <input
                type="text"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('supplierContactExample')}
                value={formData.contact_name ?? ''}
                onChange={(e) => setFormData((p) => ({ ...p, contact_name: e.target.value || null }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('phoneOptional')}</label>
              <input
                type="text"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('phonePlaceholder')}
                value={formData.phone ?? ''}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value || null }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('emailOptional')}</label>
            <input
              type="email"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('supplierEmailPlaceholder')}
              value={formData.email ?? ''}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value || null }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('addressOptional')}</label>
            <textarea
              rows={2}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder={t('supplierAddressPlaceholder')}
              value={formData.address ?? ''}
              onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value || null }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('labelNoteOptional')}</label>
            <textarea
              rows={2}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder={t('notesPlaceholder')}
              value={formData.notes ?? ''}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value || null }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setFormModal({ open: false })}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted"
            >
              {t('actionCancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving || !formData.name.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {isSaving ? 'Menyimpan...' : t('actionSave')}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={returnOpen} onClose={() => setReturnOpen(false)} title="Retur Barang ke Penitip">
        <div className="space-y-4">
          {!activeOutlet && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Pilih outlet terlebih dahulu dari pemilih outlet.</p>}
          <div><label className="block text-sm font-medium mb-1">Penitip</label><select value={returnForm.consignor_id} onChange={e => setReturnForm({ consignor_id: e.target.value, product_id: '', quantity: '1', notes: '' })} className="w-full border border-border rounded-lg px-3 py-2 text-sm"><option value="">Pilih penitip</option>{consignors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Barang titipan</label><select value={returnForm.product_id} onChange={e => setReturnForm(p => ({ ...p, product_id: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm"><option value="">Pilih barang</option>{consignmentStocks.map(s => <option key={s.product_id} value={s.product_id}>{s.product?.name} — stok {s.quantity}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Jumlah retur</label><input type="number" min="1" value={returnForm.quantity} onChange={e => setReturnForm(p => ({ ...p, quantity: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Catatan</label><textarea rows={2} value={returnForm.notes} onChange={e => setReturnForm(p => ({ ...p, notes: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none" placeholder="Alasan retur atau kondisi barang" /></div>
          <div className="flex justify-end gap-2"><button onClick={() => setReturnOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg">Batal</button><button onClick={() => returnMut.mutate()} disabled={!activeOutlet || !returnForm.consignor_id || !returnForm.product_id || Number(returnForm.quantity) < 1 || returnMut.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">{returnMut.isPending ? 'Menyimpan...' : 'Simpan Retur'}</button></div>
        </div>
      </Modal>
    </>
  )
}
