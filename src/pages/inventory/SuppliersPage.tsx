import { parseNumericInput, validWholeNumberInput } from '@/lib/materialUnits'
import { formatStockQuantity, measuredUnitLabel, weightUnitScale } from '@/lib/money'
import NumericInput from '@/components/ui/NumericInput'
import { useState } from 'react'
import Form from '@/components/ui/Form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, RotateCcw, Truck, PackageCheck } from 'lucide-react'
import ConsignmentSalesPanel, { ConsignmentSalesModal } from '@/components/suppliers/ConsignmentSalesPanel'
import { EditButton, DeleteButton } from '@/components/ui/RowActions'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import QueryErrorState from '@/components/ui/QueryErrorState'
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
  // Rincian barang titipan terjual untuk satu penitip.
  const [salesOf, setSalesOf] = useState<Supplier | null>(null)
  const [returnForm, setReturnForm] = useState({ consignor_id: '', product_id: '', quantity: '1', notes: '' })
  const activeOutlet = useOutletStore(s => s.selected)

  const { data: stocksData } = useQuery({
    queryKey: ['outlet-stocks-all', activeOutlet?.id],
    queryFn: () => getOutletStocksAll(activeOutlet!.id),
    enabled: returnOpen && !!activeOutlet?.id,
  })

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['suppliers', { page, search }],
    queryFn: () => getSuppliers({ page, limit: 20, search: search || undefined }),
  })

  const items: Supplier[] = data?.data?.data ?? []
  const total: number = data?.data?.pagination?.total ?? 0
  const consignors = items.filter(item => item.is_consignor)
  const consignmentStocks = (stocksData?.data?.data ?? []).filter(
    stock => stock.product?.consignor_id === returnForm.consignor_id && !stock.product?.has_variant,
  )

  const returnStock = consignmentStocks.find(stock => stock.product_id === returnForm.product_id)
  const returnMeasured = !!returnStock?.product?.is_weight_based
  const returnQuantity = returnMeasured
    ? Math.round(parseNumericInput(returnForm.quantity) * weightUnitScale(returnStock?.product?.weight_unit))
    : (validWholeNumberInput(returnForm.quantity, 1) ? parseNumericInput(returnForm.quantity) : NaN)
  const returnValid = Number.isFinite(returnQuantity) && returnQuantity > 0 && !!returnStock && returnQuantity <= returnStock.quantity

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
      notes: returnForm.notes.trim() || null,
      items: [{ product_id: returnForm.product_id, quantity: returnQuantity }],
    }),
    onSuccess: response => {
      toast.success(`Retur ${response.data.data.return_number} berhasil dibuat`)
      // Retur mengurangi stok: segarkan semua daftar stok & riwayat pergerakan.
      qc.invalidateQueries({ queryKey: ['outlet-stocks-all'] })
      qc.invalidateQueries({ queryKey: ['outlet-stocks'] })
      qc.invalidateQueries({ queryKey: ['outlet-stocks-selector'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
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
    const payload = { ...formData, name: formData.name.trim(), code: formData.code?.trim() || null, contact_name: formData.contact_name?.trim() || null, phone: formData.phone?.trim() || null, email: formData.email?.trim() || null, address: formData.address?.trim() || null, notes: formData.notes?.trim() || null }
    if (formModal.item) {
      updateMut.mutate({ id: formModal.item.id, payload })
    } else {
      createMut.mutate(payload)
    }
  }

  const isSaving = createMut.isPending || updateMut.isPending

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header title={t('navSuppliers')} subtitle="Kelola pemasok, penitip, catatan kerja sama, dan retur barang titipan." />

      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-5">
        {/* Filter & actions bar */}
        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            className="border border-border rounded-lg px-3 py-2 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('supplierSearch')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
          <div className="flex flex-wrap gap-2">
            {/* Back-office penitip: tagihan, pelunasan, retur, produk titipan. */}
            <Link to="/inventory/consignment" className="flex min-h-11 flex-1 sm:flex-none items-center justify-center gap-2 border border-border px-4 py-2 rounded-lg text-sm font-semibold hover:bg-muted">
              <PackageCheck size={16} /> {t('csPageTitle')}
            </Link>
            <button onClick={() => setReturnOpen(true)} className="flex min-h-11 flex-1 sm:flex-none items-center justify-center gap-2 border border-border px-4 py-2 rounded-lg text-sm font-semibold hover:bg-muted">
              <RotateCcw size={16} /> Retur ke Penitip
            </button>
            <button onClick={openCreate} className="flex min-h-11 flex-1 sm:flex-none items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
              <Plus size={16} /> Tambah Supplier / Penitip
            </button>
          </div>
        </div>

        {/* Table */}
        <QueryErrorState error={error} onRetry={refetch} />
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
            <table className="responsive-table w-full min-w-[640px] text-sm">
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
                {!error && items.length === 0 && (
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
                    <td data-label={t('labelName')} className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                    <td data-label={t('labelCode')} className="px-4 py-3 text-muted-foreground font-mono text-xs">{item.code ?? '—'}</td>
                    <td data-label={t('labelContact')} className="px-4 py-3 text-muted-foreground">{item.contact_name ?? '—'}</td>
                    <td data-label={t('labelPhone')} className="px-4 py-3 text-muted-foreground">{item.phone ?? '—'}</td>
                    <td data-label={t('labelEmail')} className="px-4 py-3 text-muted-foreground">{item.email ?? '—'}</td>
                    <td data-label={t('labelActions')} className="px-4 py-3 text-muted-foreground">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${item.is_consignor ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}>
                        {item.is_consignor ? 'Penitip' : 'Supplier'}
                      </span>
                      {item.notes && <p className="mt-1 max-w-56 truncate text-xs" title={item.notes}>{item.notes}</p>}
                    </td>
                    <td data-label={t('labelActions')} className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {item.is_consignor && (
                          <button
                            onClick={() => setSalesOf(item)}
                            title={t('csSoldAction')}
                            aria-label={t('csSoldAction')}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-muted transition"
                          >
                            <PackageCheck size={15} />
                          </button>
                        )}
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

        {/* Barang titipan yang terjual — hanya bila ada penitip. */}
        {consignors.length > 0 && <ConsignmentSalesPanel outletId={activeOutlet?.id} />}

        <Pagination page={page} total={total} limit={20} onChange={setPage} />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={formModal.open}
        onClose={() => setFormModal({ open: false })}
        title={formModal.item ? t('supplierEdit') : t('supplierAdd')}
      >
        <Form onSubmit={event => { event.preventDefault(); handleSubmit() }} className="space-y-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              type="button" onClick={() => setFormModal({ open: false })}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted"
            >
              {t('actionCancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving || !formData.name.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {isSaving ? t('saving') : t('actionSave')}
            </button>
          </div>
        </Form>
      </Modal>

      <Modal open={returnOpen} onClose={() => setReturnOpen(false)} title="Retur Barang ke Penitip">
        <div className="space-y-4">
          {!activeOutlet && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Pilih outlet terlebih dahulu dari pemilih outlet.</p>}
          <div><label className="block text-sm font-medium mb-1">Penitip</label><select value={returnForm.consignor_id} onChange={e => setReturnForm({ consignor_id: e.target.value, product_id: '', quantity: '1', notes: '' })} className="w-full border border-border rounded-lg px-3 py-2 text-sm"><option value="">Pilih penitip</option>{consignors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Barang titipan</label><select value={returnForm.product_id} onChange={e => setReturnForm(p => ({ ...p, product_id: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm"><option value="">Pilih barang</option>{consignmentStocks.map(s => <option key={s.product_id} value={s.product_id}>{s.product?.name} — stok {formatStockQuantity(s.quantity, s.product?.is_weight_based, s.product?.unit?.name, s.product?.weight_unit)}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Jumlah retur {returnMeasured ? `(${measuredUnitLabel(returnStock?.product?.unit?.name, returnStock?.product?.weight_unit)})` : ''}</label><NumericInput type="number" min={0} step={returnMeasured ? 'any' : 1} value={returnForm.quantity} onChange={e => setReturnForm(p => ({ ...p, quantity: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Catatan</label><textarea rows={2} value={returnForm.notes} onChange={e => setReturnForm(p => ({ ...p, notes: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none" placeholder="Alasan retur atau kondisi barang" /></div>
          <div className="flex justify-end gap-2"><button onClick={() => setReturnOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg">{t('actionCancel')}</button><button onClick={() => returnMut.mutate()} disabled={!activeOutlet || !returnForm.consignor_id || !returnForm.product_id || !returnValid || returnMut.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">{returnMut.isPending ? t('saving') : 'Simpan Retur'}</button></div>
        </div>
      </Modal>
      {salesOf && (
        <ConsignmentSalesModal
          supplierId={salesOf.id}
          supplierName={salesOf.name}
          outletId={activeOutlet?.id}
          onClose={() => setSalesOf(null)}
        />
      )}
    </div>
  )
}
