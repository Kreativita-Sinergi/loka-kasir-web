import { useState } from 'react'
import toast from 'react-hot-toast'
import { ShoppingCart } from 'lucide-react'
import { updatePurchaseOrdersSetting } from '@/api/business'
import { useAuthStore } from '@/store/authStore'
import { getErrorMessage } from '@/lib/utils'
import { purchaseOrdersEnabled } from '@/lib/purchaseMode'
import { t } from '@/lib/i18n'

/**
 * Saklar "Pakai Purchase Order" seluruh usaha. Hanya pemilik — mengikuti
 * `AuthorizeOwner` di server, sama dengan [PreOrderToggle]. Bawaannya nyala;
 * mati = menu Purchase Order menjadi "Pembelian" sekali jalan (barang
 * langsung masuk stok) untuk toko yang membeli dan menerima barang sekaligus.
 */
export default function PurchaseOrdersToggle() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const setAuth = useAuthStore((s) => s.setAuth)
  const [saving, setSaving] = useState(false)

  if (!user || user.role?.code !== 'OWNER') return null
  const enabled = purchaseOrdersEnabled(user.business)

  const toggle = async () => {
    if (!token || saving) return
    const next = !enabled
    setSaving(true)
    try {
      const res = await updatePurchaseOrdersSetting(next)
      const saved = res.data.data?.purchase_orders_enabled ?? next
      // Hanya kolom yang endpoint ini ubah yang disalin — lihat CurrencyMenu.
      setAuth({ ...user, business: { ...user.business, purchase_orders_enabled: saved } }, token)
      toast.success(saved ? t('dpurSettingOn') : t('dpurSettingOff'))
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-start gap-3">
      <ShoppingCart size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{t('dpurSettingTitle')}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-snug">{t('dpurSettingHint')}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={t('dpurSettingTitle')}
        disabled={saving}
        onClick={toggle}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-60 ${enabled ? 'bg-primary' : 'bg-muted'}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}
