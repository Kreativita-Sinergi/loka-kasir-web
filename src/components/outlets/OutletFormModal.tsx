import { useState, useEffect } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import {
  createOutlet,
  updateOutlet,
  getOutletConfig,
  upsertOutletConfig,
  updateOutletQris,
  removeOutletQris,
  setOutletDuitkuCreds,
  removeOutletDuitkuCreds,
} from '@/api/outlets'
import type { Outlet } from '@/types'
import { getErrorMessage } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { deriveStatus } from '@/store/subscriptionStore'

type FormState = {
  name: string
  address: string
  phone: string
  is_active: boolean
  has_table: boolean
  has_kitchen: boolean
  require_pin_for_void: boolean
  require_order_confirmation: boolean
  self_order_enabled: boolean
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
  allow_partial_payment: boolean
  qris_enabled: boolean
  qris_mode: 'static' | 'dynamic'
  payment_link: string
}

const emptyForm: FormState = {
  name: '', address: '', phone: '', is_active: true,
  has_table: false, has_kitchen: false, require_pin_for_void: false, require_order_confirmation: false, self_order_enabled: false,
  header_text: '', footer_text: '', show_logo: false, show_tax_percentage: false,
  paper_size: '58mm', show_social_media: false, instagram_handle: '',
  queue_enabled: false, queue_prefix: '', queue_suffix: '',
  service_fee_enabled: false, service_fee_rate: 0, service_fee_taxable: false, service_fee_order_types: '1,2',
  rounding_enabled: false, rounding_denomination: 100,
  allow_partial_payment: false,
  qris_enabled: false, qris_mode: 'static', payment_link: '',
}

interface OutletFormModalProps {
  outlet: Outlet | null
  businessId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function OutletFormModal({ outlet, businessId, open, onClose, onSuccess }: OutletFormModalProps) {
  const qc = useQueryClient()
  const isEdit = outlet !== null
  const membership = useAuthStore((s) => s.user?.business?.membership)
  const isPaid = deriveStatus(membership) !== 'FREE'
  // Pro & Trial membuka fitur Pro seperti Pesan via QR (Scan-to-Order).
  const tier = membership?.tier ?? membership?.type ?? 'free'
  const isPro = tier === 'pro' || tier === 'trial'

  const baseForm = outlet
    ? { ...emptyForm, name: outlet.name, address: outlet.address ?? '', phone: outlet.phone ?? '', is_active: outlet.is_active }
    : emptyForm

  const [form, setForm] = useState<FormState>(baseForm)
  const [qrisImageUrl, setQrisImageUrl] = useState<string | null>(null)
  const [qrisUploading, setQrisUploading] = useState(false)
  const [duitkuConfigured, setDuitkuConfigured] = useState(false)
  const [duitkuMerchantCode, setDuitkuMerchantCode] = useState('')
  const [duitkuApiKey, setDuitkuApiKey] = useState('')
  const [duitkuSaving, setDuitkuSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(baseForm) // eslint-disable-line react-hooks/set-state-in-effect
    if (!outlet) return
    getOutletConfig(outlet.id)
      .then(({ data }) => {
        const c = data.data
        setForm(prev => ({
          ...prev,
          has_table: c.has_table, has_kitchen: c.has_kitchen,
          require_pin_for_void: c.require_pin_for_void,
          require_order_confirmation: c.require_order_confirmation,
          self_order_enabled: c.self_order_enabled,
          header_text: c.header_text ?? '', footer_text: c.footer_text ?? '',
          show_logo: c.show_logo, show_tax_percentage: c.show_tax_percentage,
          paper_size: c.paper_size || '58mm', show_social_media: c.show_social_media,
          instagram_handle: c.instagram_handle ?? '', queue_enabled: c.queue_enabled,
          queue_prefix: c.queue_prefix ?? '', queue_suffix: c.queue_suffix ?? '',
          service_fee_enabled: c.service_fee_enabled, service_fee_rate: c.service_fee_rate,
          service_fee_taxable: c.service_fee_taxable,
          service_fee_order_types: c.service_fee_order_types ?? '1,2',
          rounding_enabled: c.rounding_enabled, rounding_denomination: c.rounding_denomination || 100,
          allow_partial_payment: c.allow_partial_payment ?? false,
          qris_enabled: c.qris_enabled ?? false, qris_mode: c.qris_mode ?? 'static',
          payment_link: c.payment_link ?? '',
        }))
        setQrisImageUrl(c.qris_image_url ?? null)
        setDuitkuConfigured(c.duitku_configured ?? false)
        setDuitkuMerchantCode(c.duitku_merchant_code ?? '')
      })
      .catch(() => {/* config belum ada — gunakan default */})
  }, [open, outlet]) // eslint-disable-line react-hooks/exhaustive-deps

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
        require_order_confirmation: form.require_order_confirmation,
        self_order_enabled: form.self_order_enabled,
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
        allow_partial_payment: form.allow_partial_payment,
        qris_enabled: form.qris_enabled,
        qris_mode: form.qris_mode,
        payment_link: form.payment_link || null,
      })
    },
    onSuccess: () => {
      toast.success('Outlet Berhasil Dibuat')
      qc.invalidateQueries({ queryKey: ['outlets', businessId] })
      onSuccess()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: async () => {
      await updateOutlet(outlet!.id, {
        name: form.name,
        address: form.address || null,
        phone: form.phone || null,
        is_active: form.is_active,
      })
      await upsertOutletConfig(outlet!.id, {
        outlet_id: outlet!.id,
        has_table: form.has_table,
        has_kitchen: form.has_kitchen,
        auto_print: false,
        require_pin_for_void: form.require_pin_for_void,
        require_order_confirmation: form.require_order_confirmation,
        self_order_enabled: form.self_order_enabled,
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
        allow_partial_payment: form.allow_partial_payment,
        qris_enabled: form.qris_enabled,
        qris_mode: form.qris_mode,
        payment_link: form.payment_link || null,
      })
    },
    onSuccess: () => {
      toast.success('Outlet Berhasil Diperbarui')
      qc.invalidateQueries({ queryKey: ['outlets', businessId] })
      onSuccess()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const isPending = createMut.isPending || updateMut.isPending

  const handleQrisUpload = async (file: File) => {
    if (!outlet) {
      toast.error('Simpan outlet dulu sebelum upload QRIS')
      return
    }
    setQrisUploading(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await updateOutletQris(outlet.id, base64)
      setQrisImageUrl(res.data.data.qris_image_url ?? null)
      toast.success('QRIS berhasil diupload')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setQrisUploading(false)
    }
  }

  const handleQrisRemove = async () => {
    if (!outlet) return
    setQrisUploading(true)
    try {
      await removeOutletQris(outlet.id)
      setQrisImageUrl(null)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setQrisUploading(false)
    }
  }

  const handleDuitkuSave = async () => {
    if (!outlet) { toast.error('Simpan outlet dulu'); return }
    if (!duitkuMerchantCode.trim() || !duitkuApiKey.trim()) {
      toast.error('Merchant code & API key wajib diisi')
      return
    }
    setDuitkuSaving(true)
    try {
      await setOutletDuitkuCreds(outlet.id, { merchant_code: duitkuMerchantCode.trim(), api_key: duitkuApiKey.trim() })
      setDuitkuConfigured(true)
      setDuitkuApiKey('')
      toast.success('Kredensial Duitku tersimpan')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDuitkuSaving(false)
    }
  }

  const handleDuitkuRemove = async () => {
    if (!outlet) return
    setDuitkuSaving(true)
    try {
      await removeOutletDuitkuCreds(outlet.id)
      setDuitkuConfigured(false)
      setDuitkuMerchantCode('')
      setDuitkuApiKey('')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDuitkuSaving(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Nama Outlet Harus Diisi'); return }
    if (isEdit) { updateMut.mutate() } else { createMut.mutate() }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Outlet' : 'Tambah Outlet'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Nama Outlet <span className="text-red-500 dark:text-red-400">*</span></label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Contoh: Cabang Utama"
            className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Alamat</label>
          <textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Alamat Lengkap Outlet"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Telepon</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="08xxxxxxxxxx"
            className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <label htmlFor="is_active" className="text-sm text-foreground">Outlet Aktif</label>
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fitur Outlet</p>
          {([
            { key: 'has_table', label: 'Manajemen Meja', desc: 'Aktifkan Pemilihan Meja Saat Transaksi (F&B)', paidOnly: true, proOnly: false },
            { key: 'has_kitchen', label: 'Layar Dapur', desc: 'Tampilkan menu dapur di aplikasi kasir', paidOnly: true, proOnly: false },
            { key: 'require_pin_for_void', label: 'PIN Supervisor untuk Pembatalan', desc: 'Kasir harus minta persetujuan supervisor untuk membatalkan transaksi', paidOnly: false, proOnly: false },
            { key: 'require_order_confirmation', label: 'Konfirmasi Terima Pesanan (F&B)', desc: 'Tambah langkah "Terima" sebelum dapur memasak (pending → confirmed → preparing). Untuk pesanan dari kanal online/self-order.', paidOnly: false, proOnly: false },
            { key: 'self_order_enabled', label: 'Pesan via QR (Scan-to-Order) · Pro', desc: 'Pelanggan memindai QR di meja untuk melihat menu & memesan sendiri. Pesanan masuk sebagai pending dan harus dikonfirmasi kasir. Tersedia khusus paket Pro.', paidOnly: false, proOnly: true },
          ] as const).filter(({ paidOnly, proOnly }) => (!paidOnly || isPaid) && (!proOnly || isPro)).map(({ key, label, desc }) => (
            <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form[key]}
                onClick={() => setForm({ ...form, [key]: !form[key] })}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${form[key] ? 'bg-blue-600' : 'bg-muted'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-card shadow transform transition-transform ${form[key] ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </label>
          ))}
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pengaturan Struk</p>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Ukuran Kertas</label>
            <select
              value={form.paper_size}
              onChange={(e) => setForm({ ...form, paper_size: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="58mm">58 mm</option>
              <option value="80mm">80 mm</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Teks Header</label>
            <input
              type="text"
              maxLength={100}
              value={form.header_text}
              onChange={(e) => setForm({ ...form, header_text: e.target.value })}
              placeholder="Contoh: Selamat Datang!"
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Teks Footer</label>
            <input
              type="text"
              maxLength={100}
              value={form.footer_text}
              onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
              placeholder="Contoh: Terima kasih!"
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {([
            { key: 'show_logo', label: 'Tampilkan Logo', desc: 'Logo bisnis di atas struk' },
            { key: 'show_tax_percentage', label: 'Tampilkan % Pajak', desc: 'Persentase pajak ditampilkan di struk' },
            { key: 'show_social_media', label: 'Tampilkan Instagram', desc: 'Tampilkan handle Instagram di footer' },
          ] as const).map(({ key, label, desc }) => (
            <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form[key]}
                onClick={() => setForm({ ...form, [key]: !form[key] })}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${form[key] ? 'bg-blue-600' : 'bg-muted'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-card shadow transform transition-transform ${form[key] ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </label>
          ))}
          {form.show_social_media && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Instagram Handle</label>
              <div className="flex items-center border border-border rounded-xl focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden">
                <span className="px-3 text-sm text-muted-foreground bg-muted border-r border-border py-2">@</span>
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

        {/* Nomor Antrian */}
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nomor Antrian</p>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-foreground">Aktifkan Nomor Antrian</p>
              <p className="text-xs text-muted-foreground">Setiap transaksi mendapat nomor urut otomatis</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.queue_enabled}
              onClick={() => setForm({ ...form, queue_enabled: !form.queue_enabled })}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${form.queue_enabled ? 'bg-blue-600' : 'bg-muted'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-card shadow transform transition-transform ${form.queue_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </label>
          {form.queue_enabled && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Awalan (opsional)</label>
                <input type="text" maxLength={10} value={form.queue_prefix}
                  onChange={(e) => setForm({ ...form, queue_prefix: e.target.value })}
                  placeholder="Misal: A"
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Akhiran (opsional)</label>
                <input type="text" maxLength={10} value={form.queue_suffix}
                  onChange={(e) => setForm({ ...form, queue_suffix: e.target.value })}
                  placeholder="Misal: B"
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Biaya Pelayanan */}
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Biaya Pelayanan</p>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-foreground">Aktifkan Biaya Pelayanan</p>
              <p className="text-xs text-muted-foreground">Ditambahkan ke total tagihan per transaksi</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.service_fee_enabled}
              onClick={() => setForm({ ...form, service_fee_enabled: !form.service_fee_enabled })}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${form.service_fee_enabled ? 'bg-blue-600' : 'bg-muted'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-card shadow transform transition-transform ${form.service_fee_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </label>
          {form.service_fee_enabled && (
            <>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Persentase Biaya (%)</label>
                <input type="number" min={0} max={100} step={0.1}
                  value={form.service_fee_rate}
                  onChange={(e) => setForm({ ...form, service_fee_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground mb-1">Berlaku untuk jenis order:</p>
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
                        <span className="text-sm text-foreground">{label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-foreground">Dikenai Pajak</p>
                  <p className="text-xs text-muted-foreground">Pajak dihitung di atas biaya pelayanan</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.service_fee_taxable}
                  onClick={() => setForm({ ...form, service_fee_taxable: !form.service_fee_taxable })}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${form.service_fee_taxable ? 'bg-blue-600' : 'bg-muted'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-card shadow transform transition-transform ${form.service_fee_taxable ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </label>
            </>
          )}
        </div>

        {/* Pembulatan Tunai */}
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pembulatan Tunai</p>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-foreground">Aktifkan Pembulatan</p>
              <p className="text-xs text-muted-foreground">Total dibulatkan ke pecahan terdekat saat bayar tunai</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.rounding_enabled}
              onClick={() => setForm({ ...form, rounding_enabled: !form.rounding_enabled })}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${form.rounding_enabled ? 'bg-blue-600' : 'bg-muted'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-card shadow transform transition-transform ${form.rounding_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </label>
          {form.rounding_enabled && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Pecahan Uang Terkecil</label>
              <select
                value={form.rounding_denomination}
                onChange={(e) => setForm({ ...form, rounding_denomination: parseInt(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={100}>Rp 100</option>
                <option value={500}>Rp 500</option>
                <option value={1000}>Rp 1.000</option>
              </select>
            </div>
          )}
        </div>

        {/* Kasbon / Bayar Sebagian */}
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kasbon / Bayar Sebagian</p>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Izinkan Bayar Sebagian</p>
              <p className="text-xs text-muted-foreground mt-0.5">Kasir dapat mengkonfirmasi order meski belum lunas. Stok tetap dipotong dan sisa tagihan dicatat sebagai kasbon.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.allow_partial_payment}
              onClick={() => setForm({ ...form, allow_partial_payment: !form.allow_partial_payment })}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${form.allow_partial_payment ? 'bg-blue-600' : 'bg-muted'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-card shadow transform transition-transform ${form.allow_partial_payment ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* QRIS (statis milik merchant) */}
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">QRIS</p>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Aktifkan QRIS</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tampilkan QRIS milik toko Anda di kasir. Dana langsung ke rekening Anda; kasir konfirmasi lunas manual.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.qris_enabled}
              onClick={() => setForm({ ...form, qris_enabled: !form.qris_enabled })}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${form.qris_enabled ? 'bg-blue-600' : 'bg-muted'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-card shadow transform transition-transform ${form.qris_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {form.qris_enabled && (
            <>
              {/* Mode: statis (manual) vs dinamis (Duitku merchant) */}
              <div className="grid grid-cols-2 gap-2">
                {(['static', 'dynamic'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm({ ...form, qris_mode: m })}
                    className={`rounded-xl border px-3 py-2 text-left text-xs transition ${form.qris_mode === m ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40' : 'border-border hover:bg-muted'}`}
                  >
                    <span className="block font-semibold">{m === 'static' ? 'Statis' : 'Dinamis (Duitku)'}</span>
                    <span className="text-muted-foreground">{m === 'static' ? 'QR sendiri, konfirmasi manual' : 'Nominal otomatis + auto-lunas'}</span>
                  </button>
                ))}
              </div>

              {form.qris_mode === 'static' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Gambar QRIS Statis</label>
                    {!isEdit ? (
                      <p className="text-xs text-muted-foreground">Simpan outlet dulu, lalu buka lagi untuk mengupload gambar QRIS.</p>
                    ) : qrisImageUrl ? (
                      <div className="flex items-center gap-3">
                        <img src={qrisImageUrl} alt="QRIS" className="h-20 w-20 rounded-lg border border-border object-cover" />
                        <button type="button" onClick={handleQrisRemove} disabled={qrisUploading} className="text-xs text-red-500 hover:underline">
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <input
                        type="file"
                        accept="image/*"
                        disabled={qrisUploading}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleQrisUpload(f) }}
                        className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-xs file:font-semibold"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Link Pembayaran (opsional)</label>
                    <input
                      type="url"
                      value={form.payment_link}
                      onChange={(e) => setForm({ ...form, payment_link: e.target.value })}
                      placeholder="https://… (mis. link QRIS / payment page)"
                      className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Bila diisi & tanpa gambar, kasir menampilkan QR dari link ini.</p>
                  </div>
                </>
              ) : !isEdit ? (
                <p className="text-xs text-muted-foreground">Simpan outlet dulu, lalu buka lagi untuk mengisi kredensial Duitku.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Masukkan kredensial akun Duitku <span className="font-medium">milik toko Anda</span>. QRIS dinamis dibuat
                    atas nama akun ini sehingga dana settle ke rekening Anda dan pembayaran terkonfirmasi otomatis.
                    {duitkuConfigured && <span className="text-green-600 dark:text-green-400"> ✓ API key tersimpan.</span>}
                  </p>
                  <input
                    type="text"
                    value={duitkuMerchantCode}
                    onChange={(e) => setDuitkuMerchantCode(e.target.value)}
                    placeholder="Merchant Code (mis. DXXXX)"
                    className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    value={duitkuApiKey}
                    onChange={(e) => setDuitkuApiKey(e.target.value)}
                    placeholder={duitkuConfigured ? 'API Key (isi untuk mengganti)' : 'API Key'}
                    className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={handleDuitkuSave} disabled={duitkuSaving} className="px-3 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      {duitkuSaving ? 'Menyimpan…' : 'Simpan Kredensial'}
                    </button>
                    {duitkuConfigured && (
                      <button type="button" onClick={handleDuitkuRemove} disabled={duitkuSaving} className="px-3 py-2 text-xs font-semibold text-red-500 border border-border rounded-lg hover:bg-muted">
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {isPending ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Buat Outlet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
