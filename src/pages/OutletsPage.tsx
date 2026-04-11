import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Store, Phone, MapPin, Pencil, Trash2, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import {
  getOutletsByBusiness,
  createOutlet,
  updateOutlet,
  deleteOutlet,
  getOutletConfig,
  upsertOutletConfig,
  activateOutletSubscription,
} from '@/api/outlets'
import { useAuthStore } from '@/store/authStore'
import type { Outlet, OutletSubscriptionStatus } from '@/types'
import { getErrorMessage } from '@/lib/utils'

type FormState = {
  name: string
  address: string
  phone: string
  is_active: boolean
  has_table: boolean
  has_kitchen: boolean
  require_pin_for_void: boolean
  header_text: string
  footer_text: string
  show_logo: boolean
  paper_size: string
  show_social_media: boolean
  instagram_handle: string
}

const emptyForm: FormState = {
  name: '', address: '', phone: '', is_active: true,
  has_table: false, has_kitchen: false, require_pin_for_void: false,
  header_text: '', footer_text: '', show_logo: false, paper_size: '58mm',
  show_social_media: false, instagram_handle: '',
}

type SubscriptionForm = {
  status: OutletSubscriptionStatus
  duration_months: number
}

const subscriptionStatusLabel: Record<OutletSubscriptionStatus, string> = {
  active: 'Aktif', trial: 'Trial', expired: 'Kadaluarsa', inactive: 'Nonaktif',
}
const subscriptionStatusVariant: Record<OutletSubscriptionStatus, 'green' | 'yellow' | 'red' | 'gray'> = {
  active: 'green', trial: 'yellow', expired: 'red', inactive: 'gray',
}

export default function OutletsPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const businessId = user?.business?.id ?? ''

  // Outlet list state
  const [outletPage, setOutletPage] = useState(1)
  const [outletSearch, setOutletSearch] = useState('')

  // Outlet form modal
  const [showForm, setShowForm] = useState(false)
  const [editOutlet, setEditOutlet] = useState<Outlet | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  // Subscription modal
  const [subOutlet, setSubOutlet] = useState<Outlet | null>(null)
  const [subForm, setSubForm] = useState<SubscriptionForm>({ status: 'active', duration_months: 1 })

  // ─── Outlet list ─────────────────────────────────────────────────────────
  const { data: outletData, isLoading: outletLoading } = useQuery({
    queryKey: ['outlets', businessId, { page: outletPage, limit: 10, search: outletSearch }],
    queryFn: () => getOutletsByBusiness(businessId, { page: outletPage, limit: 10, search: outletSearch || undefined }),
    enabled: !!businessId,
  })
  const outlets = outletData?.data?.data ?? []
  const outletPagination = outletData?.data?.pagination

  // ─── Mutations ────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: async () => {
      const res = await createOutlet({
        business_id: businessId,
        name: form.name,
        address: form.address || null,
        phone: form.phone || null,
        is_active: form.is_active,
      })
      const newOutletId = res.data.data.id
      await upsertOutletConfig(newOutletId, {
        outlet_id: newOutletId,
        has_table: form.has_table,
        has_kitchen: form.has_kitchen,
        auto_print: false,
        require_pin_for_void: form.require_pin_for_void,
        header_text: form.header_text || null,
        footer_text: form.footer_text || null,
        show_logo: form.show_logo,
        paper_size: form.paper_size,
        show_social_media: form.show_social_media,
        instagram_handle: form.instagram_handle || null,
      })
    },
    onSuccess: () => {
      toast.success('Outlet Berhasil Dibuat')
      qc.invalidateQueries({ queryKey: ['outlets', businessId] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: async () => {
      await updateOutlet(editOutlet!.id, {
        name: form.name,
        address: form.address || null,
        phone: form.phone || null,
        is_active: form.is_active,
      })
      await upsertOutletConfig(editOutlet!.id, {
        outlet_id: editOutlet!.id,
        has_table: form.has_table,
        has_kitchen: form.has_kitchen,
        auto_print: false,
        require_pin_for_void: form.require_pin_for_void,
        header_text: form.header_text || null,
        footer_text: form.footer_text || null,
        show_logo: form.show_logo,
        paper_size: form.paper_size,
        show_social_media: form.show_social_media,
        instagram_handle: form.instagram_handle || null,
      })
    },
    onSuccess: () => {
      toast.success('Outlet Berhasil Diperbarui')
      qc.invalidateQueries({ queryKey: ['outlets', businessId] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const subscriptionMut = useMutation({
    mutationFn: () => activateOutletSubscription(subOutlet!.id, subForm),
    onSuccess: () => {
      toast.success('Langganan outlet berhasil diperbarui')
      qc.invalidateQueries({ queryKey: ['outlets', businessId] })
      setSubOutlet(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteOutlet(id),
    onSuccess: () => {
      toast.success('Outlet Dihapus')
      qc.invalidateQueries({ queryKey: ['outlets', businessId] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditOutlet(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = async (outlet: Outlet) => {
    setEditOutlet(outlet)
    let cfg = {
      has_table: false, has_kitchen: false, require_pin_for_void: false,
      header_text: '', footer_text: '', show_logo: false, paper_size: '58mm',
      show_social_media: false, instagram_handle: '',
    }
    try {
      const configRes = await getOutletConfig(outlet.id)
      const c = configRes.data.data
      cfg = {
        has_table: c.has_table,
        has_kitchen: c.has_kitchen,
        require_pin_for_void: c.require_pin_for_void,
        header_text: c.header_text ?? '',
        footer_text: c.footer_text ?? '',
        show_logo: c.show_logo,
        paper_size: c.paper_size || '58mm',
        show_social_media: c.show_social_media,
        instagram_handle: c.instagram_handle ?? '',
      }
    } catch {
      // config belum ada — gunakan default
    }
    setForm({ name: outlet.name, address: outlet.address ?? '', phone: outlet.phone ?? '', is_active: outlet.is_active, ...cfg })
    setShowForm(true)
  }

  const openSubscription = (outlet: Outlet) => {
    setSubOutlet(outlet)
    setSubForm({ status: outlet.subscription_status ?? 'active', duration_months: 1 })
  }

  const closeForm = () => {
    setShowForm(false)
    setEditOutlet(null)
    setForm(emptyForm)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Nama Outlet Harus Diisi'); return }
    editOutlet ? updateMut.mutate() : createMut.mutate()
  }

  const handleDelete = (outlet: Outlet) => {
    if (!confirm(`Hapus outlet "${outlet.name}"?`)) return
    deleteMut.mutate(outlet.id)
  }

  // ─── Outlet columns ───────────────────────────────────────────────────────
  const outletColumns = [
    {
      key: 'name',
      label: 'Outlet',
      render: (row: Outlet) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
            <Store size={14} className="text-indigo-600" />
          </div>
          <p className="font-medium text-gray-900">{row.name}</p>
        </div>
      ),
    },
    {
      key: 'address',
      label: 'Alamat',
      render: (row: Outlet) => (
        <span className="text-sm text-gray-500 flex items-center gap-1">
          {row.address ? <><MapPin size={12} className="shrink-0" />{row.address}</> : <span className="text-gray-300">—</span>}
        </span>
      ),
    },
    {
      key: 'phone',
      label: 'Telepon',
      render: (row: Outlet) => (
        <span className="text-sm text-gray-500 flex items-center gap-1">
          {row.phone ? <><Phone size={12} className="shrink-0" />{row.phone}</> : <span className="text-gray-300">—</span>}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (row: Outlet) => (
        <Badge variant={row.is_active ? 'green' : 'red'}>
          {row.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      key: 'subscription_status',
      label: 'Langganan',
      render: (row: Outlet) => {
        const status = (row.subscription_status ?? 'inactive') as OutletSubscriptionStatus
        return (
          <div className="flex flex-col gap-0.5">
            <Badge variant={subscriptionStatusVariant[status]}>
              {subscriptionStatusLabel[status]}
            </Badge>
            {row.subscription_end_date && (
              <span className="text-xs text-gray-400">
                s/d {new Date(row.subscription_end_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'actions',
      label: '',
      render: (row: Outlet) => (
        <div className="flex items-center gap-1">
          <button
            title="Kelola Langganan"
            onClick={(e) => { e.stopPropagation(); openSubscription(row) }}
            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
          >
            <CreditCard size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row) }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(row) }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Outlet" subtitle={`${user?.business?.business_name ?? 'Bisnis Anda'}`} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari Outlet..."
                value={outletSearch}
                onChange={(e) => { setOutletSearch(e.target.value); setOutletPage(1) }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shrink-0"
            >
              <Plus size={14} />
              Tambah Outlet
            </button>
            <p className="text-sm text-gray-500 shrink-0">
              Total: <span className="font-semibold text-gray-900">{outletPagination?.total ?? 0}</span>
            </p>
          </div>
          <DataTable
            columns={outletColumns as never[]}
            data={outlets as never[]}
            loading={outletLoading}
            emptyMessage="Belum Ada Outlet"
          />
          <Pagination page={outletPage} total={outletPagination?.total ?? 0} limit={10} onChange={setOutletPage} />
        </div>
      </div>

      {/* Subscription Modal */}
      <Modal
        open={!!subOutlet}
        onClose={() => setSubOutlet(null)}
        title={`Kelola Langganan — ${subOutlet?.name ?? ''}`}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status Langganan</label>
            <select
              value={subForm.status}
              onChange={(e) => setSubForm({ ...subForm, status: e.target.value as OutletSubscriptionStatus })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Aktif</option>
              <option value="trial">Trial</option>
              <option value="expired">Kadaluarsa</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Durasi Perpanjangan (bulan)</label>
            <input
              type="number"
              min={0}
              max={24}
              value={subForm.duration_months}
              onChange={(e) => setSubForm({ ...subForm, duration_months: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Isi 0 untuk tidak mengubah tanggal akhir langganan.</p>
          </div>
          {subOutlet?.subscription_end_date && (
            <p className="text-xs text-gray-500">
              Berakhir saat ini:{' '}
              <span className="font-medium">
                {new Date(subOutlet.subscription_end_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSubOutlet(null)}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={subscriptionMut.isPending}
              onClick={() => subscriptionMut.mutate()}
              className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-60 transition"
            >
              {subscriptionMut.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Form Modal */}
      <Modal
        open={showForm}
        onClose={closeForm}
        title={editOutlet ? 'Edit Outlet' : 'Tambah Outlet'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nama Outlet <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Contoh: Cabang Utama"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Alamat</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Alamat Lengkap Outlet"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Telepon</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="08xxxxxxxxxx"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">Outlet Aktif</label>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fitur Outlet</p>
            {([
              { key: 'has_table', label: 'Manajemen Meja', desc: 'Aktifkan Pemilihan Meja Saat Transaksi (F&B)' },
              { key: 'has_kitchen', label: 'Layar Dapur (KDS)', desc: 'Tampilkan Menu Dapur di Aplikasi Kasir' },
              { key: 'require_pin_for_void', label: 'PIN Supervisor untuk Void', desc: 'Kasir harus meminta persetujuan supervisor untuk membatalkan transaksi' },
            ] as const).map(({ key, label, desc }) => (
              <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form[key]}
                  onClick={() => setForm({ ...form, [key]: !form[key] })}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${form[key] ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${form[key] ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </label>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pengaturan Struk</p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ukuran Kertas</label>
              <select
                value={form.paper_size}
                onChange={(e) => setForm({ ...form, paper_size: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="58mm">58 mm</option>
                <option value="80mm">80 mm</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Teks Header</label>
              <input
                type="text"
                maxLength={100}
                value={form.header_text}
                onChange={(e) => setForm({ ...form, header_text: e.target.value })}
                placeholder="Contoh: Selamat Datang!"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Teks Footer</label>
              <input
                type="text"
                maxLength={100}
                value={form.footer_text}
                onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
                placeholder="Contoh: Terima kasih!"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {([
              { key: 'show_logo', label: 'Tampilkan Logo', desc: 'Logo bisnis di atas struk' },
              { key: 'show_social_media', label: 'Tampilkan Instagram', desc: 'Tampilkan handle Instagram di footer' },
            ] as const).map(({ key, label, desc }) => (
              <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form[key]}
                  onClick={() => setForm({ ...form, [key]: !form[key] })}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${form[key] ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${form[key] ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </label>
            ))}
            {form.show_social_media && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Instagram Handle</label>
                <div className="flex items-center border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden">
                  <span className="px-3 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 py-2">@</span>
                  <input
                    type="text"
                    maxLength={50}
                    value={form.instagram_handle}
                    onChange={(e) => setForm({ ...form, instagram_handle: e.target.value })}
                    placeholder="username"
                    className="flex-1 px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeForm}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {isPending ? 'Menyimpan...' : editOutlet ? 'Simpan' : 'Buat Outlet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
