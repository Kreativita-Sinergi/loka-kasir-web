import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Store, Phone, MapPin, Pencil, Trash2, Lock, Crown, Upload, X, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import ImageCropModal from '@/components/ui/ImageCropModal'
import {
  getOutletsByBusiness,
  createOutlet,
  updateOutlet,
  deleteOutlet,
  getOutletConfig,
  upsertOutletConfig,
} from '@/api/outlets'
import { updateBusinessLogo, removeBusinessLogo } from '@/api/business'
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
  show_tax_percentage: boolean
  paper_size: string
  show_social_media: boolean
  instagram_handle: string
  queue_enabled: boolean
  queue_prefix: string
  queue_suffix: string
  service_fee_enabled: boolean
  service_fee_rate: number
  service_fee_taxable: boolean
  service_fee_order_types: string
  rounding_enabled: boolean
  rounding_denomination: number
}

const emptyForm: FormState = {
  name: '', address: '', phone: '', is_active: true,
  has_table: false, has_kitchen: false, require_pin_for_void: false,
  header_text: '', footer_text: '', show_logo: false, show_tax_percentage: false,
  paper_size: '58mm', show_social_media: false, instagram_handle: '',
  queue_enabled: false, queue_prefix: '', queue_suffix: '',
  service_fee_enabled: false, service_fee_rate: 0, service_fee_taxable: false, service_fee_order_types: '1,2',
  rounding_enabled: false, rounding_denomination: 100,
}

const subscriptionStatusLabel: Record<OutletSubscriptionStatus, string> = {
  active: 'Aktif', trial: 'Aktif', expired: 'Kadaluarsa', inactive: 'Nonaktif',
}
const subscriptionStatusVariant: Record<OutletSubscriptionStatus, 'green' | 'yellow' | 'red' | 'gray'> = {
  active: 'green', trial: 'green', expired: 'red', inactive: 'gray',
}

// ─── Quota helpers ────────────────────────────────────────────────────────────

/**
 * Mengembalikan true jika bisnis sudah mencapai batas kuota outlet
 * berdasarkan tier membership aktif.
 *
 * - lite  : maks 1 outlet
 * - trial : maks 1 outlet (outlet pertama sudah dibuat saat registrasi)
 * - pro   : tidak ada batas di level pembuatan (tiap outlet ke-2+ butuh add-on berbayar)
 */
function isOutletQuotaFull(membershipTier: string | undefined, outletCount: number): boolean {
  if (!membershipTier) return false
  if (membershipTier === 'lite' || membershipTier === 'trial') return outletCount >= 1
  return false
}


export default function OutletsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const businessId = user?.business?.id ?? ''
  const membershipTier = user?.business?.membership?.tier

  // Outlet list state
  const [outletPage, setOutletPage] = useState(1)
  const [outletSearch, setOutletSearch] = useState('')

  // Outlet form modal
  const [showForm, setShowForm] = useState(false)
  const [editOutlet, setEditOutlet] = useState<Outlet | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  // Business logo state
  const [bizLogoUrl, setBizLogoUrl] = useState<string | null>(user?.business?.image ?? null)
  const [bizLogoPendingBase64, setBizLogoPendingBase64] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const bizLogoInputRef = useRef<HTMLInputElement>(null)

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
        show_tax_percentage: form.show_tax_percentage,
        paper_size: form.paper_size,
        show_social_media: form.show_social_media,
        instagram_handle: form.instagram_handle || null,
        queue_enabled: form.queue_enabled,
        queue_prefix: form.queue_prefix || null,
        queue_suffix: form.queue_suffix || null,
        service_fee_enabled: form.service_fee_enabled,
        service_fee_rate: form.service_fee_rate,
        service_fee_taxable: form.service_fee_taxable,
        service_fee_order_types: form.service_fee_order_types,
        rounding_enabled: form.rounding_enabled,
        rounding_denomination: form.rounding_denomination,
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
        show_tax_percentage: form.show_tax_percentage,
        paper_size: form.paper_size,
        show_social_media: form.show_social_media,
        instagram_handle: form.instagram_handle || null,
        queue_enabled: form.queue_enabled,
        queue_prefix: form.queue_prefix || null,
        queue_suffix: form.queue_suffix || null,
        service_fee_enabled: form.service_fee_enabled,
        service_fee_rate: form.service_fee_rate,
        service_fee_taxable: form.service_fee_taxable,
        service_fee_order_types: form.service_fee_order_types,
        rounding_enabled: form.rounding_enabled,
        rounding_denomination: form.rounding_denomination,
      })
    },
    onSuccess: () => {
      toast.success('Outlet Berhasil Diperbarui')
      qc.invalidateQueries({ queryKey: ['outlets', businessId] })
      closeForm()
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

  const bizLogoMut = useMutation({
    mutationFn: async () => {
      if (bizLogoPendingBase64) {
        await updateBusinessLogo(bizLogoPendingBase64)
      } else if (bizLogoUrl === null) {
        await removeBusinessLogo()
      }
    },
    onSuccess: () => {
      toast.success('Logo bisnis berhasil diperbarui')
      setBizLogoPendingBase64(null)
      qc.invalidateQueries({ queryKey: ['me'] })
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
      header_text: '', footer_text: '', show_logo: false, show_tax_percentage: false,
      paper_size: '58mm', show_social_media: false, instagram_handle: '',
      queue_enabled: false, queue_prefix: '', queue_suffix: '',
      service_fee_enabled: false, service_fee_rate: 0, service_fee_taxable: false, service_fee_order_types: '1,2',
      rounding_enabled: false, rounding_denomination: 100,
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
        show_tax_percentage: c.show_tax_percentage,
        paper_size: c.paper_size || '58mm',
        show_social_media: c.show_social_media,
        instagram_handle: c.instagram_handle ?? '',
        queue_enabled: c.queue_enabled,
        queue_prefix: c.queue_prefix ?? '',
        queue_suffix: c.queue_suffix ?? '',
        service_fee_enabled: c.service_fee_enabled,
        service_fee_rate: c.service_fee_rate,
        service_fee_taxable: c.service_fee_taxable,
        service_fee_order_types: c.service_fee_order_types ?? '1,2',
        rounding_enabled: c.rounding_enabled,
        rounding_denomination: c.rounding_denomination || 100,
      }
    } catch {
      // config belum ada — gunakan default
    }
    setForm({ name: outlet.name, address: outlet.address ?? '', phone: outlet.phone ?? '', is_active: outlet.is_active, ...cfg })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditOutlet(null)
    setForm(emptyForm)
    setCropSrc(null)
  }

  const handleBizLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setCropSrc(reader.result as string) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleCropSave = (base64: string, dataUrl: string) => {
    setBizLogoPendingBase64(base64)
    setBizLogoUrl(dataUrl)
    setCropSrc(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Nama Outlet Harus Diisi'); return }
    if (editOutlet) { updateMut.mutate() } else { createMut.mutate() }
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
      render: (row: Outlet & { logo_url?: string | null }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
            {row.logo_url
              ? <img src={row.logo_url} alt={row.name} className="w-full h-full object-cover" />
              : <Store size={14} className="text-indigo-600" />}
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
  const totalOutlets = outletPagination?.total ?? 0
  const quotaFull = isOutletQuotaFull(membershipTier, totalOutlets)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Outlet" subtitle={`${user?.business?.business_name ?? 'Bisnis Anda'}`} />
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Logo Bisnis ──────────────────────────────────────────────── */}
        <div className="mb-6 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={16} className="text-gray-500" />
            <p className="text-sm font-semibold text-gray-700">Logo Bisnis</p>
          </div>
          <div className="flex items-center gap-5">
            <div
              className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden shrink-0 cursor-pointer hover:border-blue-400 transition"
              onClick={() => bizLogoInputRef.current?.click()}
            >
              {bizLogoUrl
                ? <img src={bizLogoUrl} alt="logo" className="w-full h-full object-cover" />
                : <Store size={28} className="text-gray-300" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{user?.business?.business_name ?? 'Bisnis Anda'}</p>
              <p className="text-xs text-gray-400 mt-0.5 mb-3">Logo ini akan tampil di struk semua outlet.</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => bizLogoInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                >
                  <Upload size={12} />
                  {bizLogoUrl ? 'Ganti Logo' : 'Upload Logo'}
                </button>
                {bizLogoUrl && (
                  <button
                    type="button"
                    onClick={() => { setBizLogoUrl(null); setBizLogoPendingBase64(null) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition"
                  >
                    <X size={12} />
                    Hapus
                  </button>
                )}
                {(bizLogoPendingBase64 !== null || (bizLogoUrl === null && user?.business?.image)) && (
                  <button
                    type="button"
                    onClick={() => bizLogoMut.mutate()}
                    disabled={bizLogoMut.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
                  >
                    {bizLogoMut.isPending ? 'Menyimpan...' : 'Simpan'}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">PNG/JPG, maks 2MB</p>
            </div>
          </div>
          <input
            ref={bizLogoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleBizLogoFileChange}
          />
        </div>

        {/* Banner kuota penuh */}
        {quotaFull && (
          <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <Crown size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">
                Kuota Outlet Tercapai
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {membershipTier === 'lite'
                  ? 'Paket Lite hanya mendukung 1 outlet.'
                  : 'Trial hanya mendukung 1 outlet.'}
                {' '}Upgrade ke Paket Pro untuk menambah outlet.
              </p>
            </div>
            <button
              onClick={() => navigate('/membership')}
              className="shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition"
            >
              Upgrade
            </button>
          </div>
        )}

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
            {quotaFull ? (
              <button
                onClick={() => navigate('/membership')}
                title="Upgrade untuk menambah outlet"
                className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 text-sm font-semibold rounded-xl hover:bg-amber-200 transition shrink-0 border border-amber-200"
              >
                <Lock size={14} />
                Tambah Outlet
              </button>
            ) : (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shrink-0"
              >
                <Plus size={14} />
                Tambah Outlet
              </button>
            )}
            <p className="text-sm text-gray-500 shrink-0">
              Total: <span className="font-semibold text-gray-900">{totalOutlets}</span>
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


      {/* Business logo crop modal */}
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onSave={handleCropSave}
          onClose={() => setCropSrc(null)}
        />
      )}

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
              { key: 'show_tax_percentage', label: 'Tampilkan % Pajak', desc: 'Persentase pajak ditampilkan di struk' },
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

          {/* ── Nomor Antrian ── */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nomor Antrian</p>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-700">Aktifkan Nomor Antrian</p>
                <p className="text-xs text-gray-400">Setiap transaksi mendapat nomor urut otomatis</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.queue_enabled}
                onClick={() => setForm({ ...form, queue_enabled: !form.queue_enabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${form.queue_enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${form.queue_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </label>
            {form.queue_enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Awalan (opsional)</label>
                  <input type="text" maxLength={10} value={form.queue_prefix}
                    onChange={(e) => setForm({ ...form, queue_prefix: e.target.value })}
                    placeholder="Misal: A"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Akhiran (opsional)</label>
                  <input type="text" maxLength={10} value={form.queue_suffix}
                    onChange={(e) => setForm({ ...form, queue_suffix: e.target.value })}
                    placeholder="Misal: B"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Biaya Pelayanan ── */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Biaya Pelayanan</p>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-700">Aktifkan Biaya Pelayanan</p>
                <p className="text-xs text-gray-400">Ditambahkan ke total tagihan per transaksi</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.service_fee_enabled}
                onClick={() => setForm({ ...form, service_fee_enabled: !form.service_fee_enabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${form.service_fee_enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${form.service_fee_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </label>
            {form.service_fee_enabled && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Persentase Biaya (%)</label>
                  <input type="number" min={0} max={100} step={0.1}
                    value={form.service_fee_rate}
                    onChange={(e) => setForm({ ...form, service_fee_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Berlaku untuk jenis order:</p>
                  <div className="flex gap-4">
                    {[{ val: '1', label: 'Dine In' }, { val: '2', label: 'Take Away' }].map(({ val, label }) => {
                      const types = form.service_fee_order_types.split(',').filter(Boolean)
                      const checked = types.includes(val)
                      return (
                        <label key={val} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={() => {
                            const next = checked ? types.filter(t => t !== val) : [...types, val]
                            setForm({ ...form, service_fee_order_types: next.join(',') })
                          }} className="rounded" />
                          <span className="text-sm text-gray-700">{label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Dikenai Pajak</p>
                    <p className="text-xs text-gray-400">Pajak dihitung di atas biaya pelayanan</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.service_fee_taxable}
                    onClick={() => setForm({ ...form, service_fee_taxable: !form.service_fee_taxable })}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${form.service_fee_taxable ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${form.service_fee_taxable ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </label>
              </>
            )}
          </div>

          {/* ── Pembulatan Tunai ── */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pembulatan Tunai</p>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-700">Aktifkan Pembulatan</p>
                <p className="text-xs text-gray-400">Total dibulatkan ke pecahan terdekat saat bayar tunai</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.rounding_enabled}
                onClick={() => setForm({ ...form, rounding_enabled: !form.rounding_enabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${form.rounding_enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${form.rounding_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </label>
            {form.rounding_enabled && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Pecahan Uang Terkecil</label>
                <select
                  value={form.rounding_denomination}
                  onChange={(e) => setForm({ ...form, rounding_denomination: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={100}>Rp 100</option>
                  <option value={500}>Rp 500</option>
                  <option value={1000}>Rp 1.000</option>
                </select>
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
