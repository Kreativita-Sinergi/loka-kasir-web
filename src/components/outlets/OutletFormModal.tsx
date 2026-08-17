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
} from '@/api/outlets'
import type { Outlet } from '@/types'
import { getErrorMessage } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { deriveStatus } from '@/store/subscriptionStore'
import { t } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'

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
  service_fee_type: 'percent' | 'fixed'
  service_fee_rate: number
  service_fee_label: string
  service_fee_taxable: boolean
  service_fee_order_types: string
  rounding_enabled: boolean
  rounding_denomination: number
  allow_partial_payment: boolean
  qris_enabled: boolean
  qris_mode: 'static'
  qris_payload: string
  payment_link: string
}

const emptyForm: FormState = {
  name: '', address: '', phone: '', is_active: true,
  has_table: false, has_kitchen: false, require_pin_for_void: false, require_order_confirmation: false, self_order_enabled: false,
  header_text: '', footer_text: '', show_logo: false, show_tax_percentage: false,
  paper_size: '58mm', show_social_media: false, instagram_handle: '',
  queue_enabled: false, queue_prefix: '', queue_suffix: '',
  service_fee_enabled: false, service_fee_type: 'percent', service_fee_rate: 0, service_fee_label: '', service_fee_taxable: false, service_fee_order_types: '1,2',
  rounding_enabled: false, rounding_denomination: 100,
  allow_partial_payment: false,
  // QRIS tidak dinyalakan otomatis. Mode dinamis lewat akun Duitku Loka Kasir
  // baru boleh setelah akun perusahaan disetujui Duitku, jadi outlet baru
  // dimulai dari mode statis dan pemiliknya yang menyalakan.
  qris_enabled: false, qris_mode: 'static', qris_payload: '', payment_link: '',
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
          service_fee_enabled: c.service_fee_enabled,
          service_fee_type: c.service_fee_type === 'fixed' ? 'fixed' : 'percent',
          service_fee_rate: c.service_fee_rate,
          service_fee_label: c.service_fee_label ?? '',
          service_fee_taxable: c.service_fee_taxable,
          service_fee_order_types: c.service_fee_order_types ?? '1,2',
          rounding_enabled: c.rounding_enabled, rounding_denomination: c.rounding_denomination || 100,
          allow_partial_payment: c.allow_partial_payment ?? false,
          qris_enabled: c.qris_enabled ?? false, qris_mode: 'static',
          qris_payload: c.qris_payload ?? '',
          payment_link: c.payment_link ?? '',
        }))
        setQrisImageUrl(c.qris_image_url ?? null)
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
        service_fee_type: form.service_fee_type,
        service_fee_rate: form.service_fee_rate,
        service_fee_label: form.service_fee_label || null,
        service_fee_taxable: form.service_fee_taxable,
        service_fee_order_types: form.service_fee_order_types,
        rounding_enabled: form.rounding_enabled,
        rounding_denomination: form.rounding_denomination,
        allow_partial_payment: form.allow_partial_payment,
        qris_enabled: form.qris_enabled,
        qris_mode: form.qris_mode,
        qris_payload: form.qris_payload || null,
        payment_link: form.payment_link || null,
      })
    },
    onSuccess: () => {
      toast.success(t('outletCreated'))
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
        service_fee_type: form.service_fee_type,
        service_fee_rate: form.service_fee_rate,
        service_fee_label: form.service_fee_label || null,
        service_fee_taxable: form.service_fee_taxable,
        service_fee_order_types: form.service_fee_order_types,
        rounding_enabled: form.rounding_enabled,
        rounding_denomination: form.rounding_denomination,
        allow_partial_payment: form.allow_partial_payment,
        qris_enabled: form.qris_enabled,
        qris_mode: form.qris_mode,
        qris_payload: form.qris_payload || null,
        payment_link: form.payment_link || null,
      })
    },
    onSuccess: () => {
      toast.success(t('outletUpdated'))
      qc.invalidateQueries({ queryKey: ['outlets', businessId] })
      onSuccess()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const isPending = createMut.isPending || updateMut.isPending

  const handleQrisUpload = async (file: File) => {
    if (!outlet) {
      toast.error(t('outletSaveBeforeQris'))
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
      toast.success(t('outletQrisUploaded'))
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error(t('outletNameRequired')); return }
    if (isEdit) { updateMut.mutate() } else { createMut.mutate() }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('outletEdit') : t('outletAdd')}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">{t('outletName')} <span className="text-red-500 dark:text-red-400">*</span></label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t('outletNameExample')}
            className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">{t('labelAddress')}</label>
          <textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder={t('outletAddressPlaceholder')}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">{t('labelPhone')}</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder={t('phonePlaceholder')}
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
          <label htmlFor="is_active" className="text-sm text-foreground">{t('outletActive')}</label>
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('outletFeatures')}</p>
          {([
            { key: 'has_table', label: t('featTableMgmt'), desc: t('featTableMgmtDesc'), paidOnly: true, proOnly: false },
            { key: 'has_kitchen', label: t('featKitchenDisplay'), desc: t('featKitchenDisplayDesc'), paidOnly: true, proOnly: false },
            { key: 'require_pin_for_void', label: t('featVoidPin'), desc: t('featVoidPinDesc'), paidOnly: false, proOnly: false },
            { key: 'require_order_confirmation', label: t('featOrderConfirm'), desc: t('featOrderConfirmDesc'), paidOnly: false, proOnly: false },
            { key: 'self_order_enabled', label: t('featSelfOrder'), desc: t('featSelfOrderDesc'), paidOnly: false, proOnly: true },
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
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('receiptSettings')}</p>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{t('receiptPaperSize')}</label>
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
            <label className="block text-xs font-medium text-foreground mb-1">{t('receiptHeaderText')}</label>
            <input
              type="text"
              maxLength={100}
              value={form.header_text}
              onChange={(e) => setForm({ ...form, header_text: e.target.value })}
              placeholder={t('receiptHeaderExample')}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{t('receiptFooterText')}</label>
            <input
              type="text"
              maxLength={100}
              value={form.footer_text}
              onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
              placeholder={t('receiptFooterExample')}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {([
            { key: 'show_logo', label: t('receiptShowLogo'), desc: t('receiptShowLogoDesc') },
            { key: 'show_tax_percentage', label: t('receiptShowTaxPct'), desc: t('receiptShowTaxPctDesc') },
            { key: 'show_social_media', label: t('receiptShowInstagram'), desc: t('receiptShowInstagramDesc') },
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
              <label className="block text-xs font-medium text-foreground mb-1">{t('receiptInstagramHandle')}</label>
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
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('queueNumber')}</p>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-foreground">{t('queueEnable')}</p>
              <p className="text-xs text-muted-foreground">{t('queueEnableDesc')}</p>
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
                <label className="block text-xs font-medium text-foreground mb-1">{t('queuePrefix')}</label>
                <input type="text" maxLength={10} value={form.queue_prefix}
                  onChange={(e) => setForm({ ...form, queue_prefix: e.target.value })}
                  placeholder={t('exampleLetterA')}
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">{t('queueSuffix')}</label>
                <input type="text" maxLength={10} value={form.queue_suffix}
                  onChange={(e) => setForm({ ...form, queue_suffix: e.target.value })}
                  placeholder={t('exampleLetterB')}
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Biaya Pelayanan */}
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('serviceFee')}</p>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-foreground">{t('serviceFeeEnable')}</p>
              <p className="text-xs text-muted-foreground">{t('serviceFeeEnableDesc')}</p>
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
                <p className="text-xs font-medium text-foreground mb-1">{t('serviceFeeMethod')}</p>
                <div className="flex gap-2">
                  {([
                    { val: 'percent', label: t('serviceFeePercent') },
                    { val: 'fixed', label: t('serviceFeeFixed') },
                  ] as const).map(({ val, label }) => (
                    <button
                      key={val}
                      type="button"
                      // Angkanya berarti lain di tiap mode (5 = 5% vs Rp 5),
                      // jadi nilainya di-reset alih-alih ikut terbawa diam-diam.
                      onClick={() => setForm({ ...form, service_fee_type: val, service_fee_rate: 0 })}
                      className={`flex-1 px-3 py-2 text-sm rounded-xl border transition-colors ${
                        form.service_fee_type === val
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  {form.service_fee_type === 'fixed' ? t('serviceFeeFixedLabel') : t('serviceFeePercentLabel')}
                </label>
                <input
                  type="number"
                  min={0}
                  max={form.service_fee_type === 'fixed' ? undefined : 100}
                  step={form.service_fee_type === 'fixed' ? 100 : 0.1}
                  value={form.service_fee_rate}
                  onChange={(e) => setForm({ ...form, service_fee_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {form.service_fee_type === 'fixed'
                    ? t('serviceFeeFixedHint')
                    : t('serviceFeePercentHint')}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">{t('serviceFeeReceiptName')}</label>
                <input
                  type="text"
                  maxLength={50}
                  placeholder={t('serviceFee')}
                  value={form.service_fee_label}
                  onChange={(e) => setForm({ ...form, service_fee_label: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground mb-1">{t('serviceFeeOrderTypes')}</p>
                <div className="flex gap-4">
                  {/* Id jenis order mengikuti seeder: 1 Dine In, 2 Take Away, 3 Delivery.
                      Delivery dulu tidak ada di sini sehingga tidak pernah bisa dipilih. */}
                  {[
                    { val: '1', label: t('orderTypeDineIn') },
                    { val: '2', label: t('orderTypeTakeAway') },
                    { val: '3', label: t('orderTypeDelivery') },
                  ].map(({ val, label }) => {
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
                  <p className="text-sm font-medium text-foreground">{t('serviceFeeTaxable')}</p>
                  <p className="text-xs text-muted-foreground">{t('serviceFeeTaxableDesc')}</p>
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
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('cashRounding')}</p>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-foreground">{t('cashRoundingEnable')}</p>
              <p className="text-xs text-muted-foreground">{t('cashRoundingDesc')}</p>
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
              <label className="block text-xs font-medium text-foreground mb-1">{t('cashRoundingDenomination')}</label>
              <select
                value={form.rounding_denomination}
                onChange={(e) => setForm({ ...form, rounding_denomination: parseInt(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {/* Nominalnya diformat lewat formatCurrency, bukan ditulis
                    "Rp 100": outlet yang membukukan yen atau ringgit tidak
                    boleh melihat rupiah di daftar pilihannya sendiri. */}
                <option value={100}>{formatMoney(100)}</option>
                <option value={500}>{formatMoney(500)}</option>
                <option value={1000}>{formatMoney(1000)}</option>
              </select>
            </div>
          )}
        </div>

        {/* Kasbon / Bayar Sebagian */}
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('creditPartial')}</p>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{t('creditAllowPartial')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('creditAllowPartialDesc')}</p>
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
              <p className="text-sm font-medium text-foreground">{t('qrisEnable')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('qrisEnableDesc')}</p>
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
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('qrisStaticImage')}</label>
                {!isEdit ? (
                  <p className="text-xs text-muted-foreground">{t('qrisSaveFirst')}</p>
                ) : qrisImageUrl ? (
                  <div className="flex items-center gap-3">
                    <img src={qrisImageUrl} alt="QRIS" className="h-20 w-20 rounded-lg border border-border object-cover" />
                    <button type="button" onClick={handleQrisRemove} disabled={qrisUploading} className="text-xs text-red-500 hover:underline">
                      {t('actionDelete')}
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
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('qrisText')}</label>
                <textarea
                  rows={3}
                  value={form.qris_payload}
                  onChange={(e) => setForm({ ...form, qris_payload: e.target.value })}
                  placeholder="00020101021126…"
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {/* Gambar QRIS hanya bisa ditampilkan apa adanya — pelanggan
                    mengetik nominalnya sendiri, dan salah ketik membuat
                    pelunasan otomatis gagal mencocokkan. Dari TEKS-nya, server
                    bisa menyisipkan nominal dan membuat QR per tagihan. */}
                <p className="text-xs text-muted-foreground mt-1">
                  {t('qrisTextHint')}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('paymentLink')}</label>
                <input
                  type="url"
                  value={form.payment_link}
                  onChange={(e) => setForm({ ...form, payment_link: e.target.value })}
                  placeholder={t('paymentLinkPlaceholder')}
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-muted-foreground mt-1">{t('paymentLinkHint')}</p>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted transition"
          >
            {t('actionCancel')}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {isPending ? t('saving') : isEdit ? t('actionSave') : t('outletCreate')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
