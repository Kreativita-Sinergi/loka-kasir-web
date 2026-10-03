import { useState } from 'react'
import toast from 'react-hot-toast'
import { PackageCheck } from 'lucide-react'
import { updatePreOrderSetting } from '@/api/business'
import { useAuthStore } from '@/store/authStore'
import { getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'

/**
 * Saklar pre-order (PO) seluruh usaha. Hanya pemilik — mengikuti
 * `AuthorizeOwner` di server. Mati = pilihan "Barang PO" tidak tampil di
 * form produk dan label PO tidak berlaku di aplikasi kasir.
 */
export default function PreOrderToggle() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const setAuth = useAuthStore((s) => s.setAuth)
  const [saving, setSaving] = useState(false)

  if (!user || user.role?.code !== 'OWNER') return null
  const enabled = user.business?.pre_order_enabled === true

  const toggle = async () => {
    if (!token || saving) return
    const next = !enabled
    setSaving(true)
    try {
      const res = await updatePreOrderSetting(next)
      const saved = res.data.data?.pre_order_enabled ?? next
      // Hanya kolom yang endpoint ini ubah yang disalin — lihat CurrencyMenu.
      setAuth({ ...user, business: { ...user.business, pre_order_enabled: saved } }, token)
      toast.success(saved ? t('poSettingOn') : t('poSettingOff'))
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-start gap-3">
      <PackageCheck size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{t('poSettingTitle')}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-snug">{t('poSettingHint')}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={t('poSettingTitle')}
        disabled={saving}
        onClick={toggle}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-60 ${enabled ? 'bg-primary' : 'bg-muted'}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}
