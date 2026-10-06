import { parseNumericInput, validNumericInput } from '@/lib/materialUnits'
import NumericInput from '@/components/ui/NumericInput'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserCheck, CalendarX2, ShieldAlert } from 'lucide-react'
import Switch from '@/components/ui/Switch'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { getPharmacySettings, savePharmacySettings, type PharmacySettings } from '@/api/pharmacy'
import { getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'

/**
 * Formulirnya dipisah dan di-`key` pada jawaban server — pola yang sama
 * dengan halaman Loyalitas.
 *
 * Bukan `useEffect` yang menyalin data ke state: efek seperti itu berjalan
 * lagi setiap kali query menyegarkan dirinya, dan menimpa apa yang sedang
 * diketik pemilik tepat di tengah ia mengetiknya.
 */
function PharmacyForm({ initial }: { initial?: PharmacySettings }) {
  const qc = useQueryClient()
  const [name, setName] = useState(initial?.pharmacist_name ?? '')
  const [license, setLicense] = useState(initial?.pharmacist_license ?? '')
  const [warningDays, setWarningDays] = useState(String(initial?.expiry_warning_days ?? 30))
  const [blockExpired, setBlockExpired] = useState(initial?.block_expired_sale ?? true)

  const saveMut = useMutation({
    mutationFn: () =>
      savePharmacySettings({
        pharmacist_name: name.trim(),
        pharmacist_license: license.trim(),
        expiry_warning_days: parseNumericInput(warningDays),
        block_expired_sale: blockExpired,
      }),
    onSuccess: () => {
      toast.success(t('pharmSettingsSaved'))
      qc.invalidateQueries({ queryKey: ['pharmacy-settings'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <div className="max-w-2xl bg-card rounded-2xl border border-border p-6 space-y-6">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            <span className="flex items-center gap-1.5">
              <UserCheck size={14} className="text-muted-foreground" />
              {t('pharmPharmacistName')}
            </span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('pharmPharmacistNameHint')}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            <span className="flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-muted-foreground" />
              {t('pharmPharmacistLicense')}
            </span>
          </label>
          <input
            type="text"
            value={license}
            onChange={(e) => setLicense(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {/* Keduanya satu pasangan: salinan resep tanpa salah satunya tidak sah. */}
          <p className="text-xs text-muted-foreground mt-1">{t('pharmPharmacistHelp')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            <span className="flex items-center gap-1.5">
              <CalendarX2 size={14} className="text-muted-foreground" />
              {t('pharmWarningDays')}
            </span>
          </label>
          <NumericInput
            type="number"
            min={1}
            max={365}
            value={warningDays}
            onChange={(e) => setWarningDays(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-muted-foreground mt-1">{t('pharmWarningDaysHint')}</p>
        </div>

        <label className="flex items-start gap-3 w-full text-left cursor-pointer">
          <Switch size="sm" className="mt-0.5" checked={blockExpired} label={t('pharmBlockExpired')} onChange={setBlockExpired} />
          <span>
            <span className="block text-sm font-medium text-foreground">{t('pharmBlockExpired')}</span>
            <span className="block text-xs text-muted-foreground mt-0.5">{t('pharmBlockExpiredHint')}</span>
          </span>
        </label>
      </div>

      <button
        type="button"
        disabled={saveMut.isPending || !(validNumericInput(warningDays, 1) && Number.isInteger(parseNumericInput(warningDays)) && Number(warningDays) <= 730)}
        onClick={() => saveMut.mutate()}
        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
      >
        {t('actionSave')}
      </button>
    </div>
  )
}

/**
 * Pengaturan Apotek — apoteker penanggung jawab dan aturan obat kedaluwarsa.
 *
 * Endpoint-nya sudah lama ada dan dipakai aplikasi kasir, tetapi dashboard
 * tidak pernah punya layarnya: pemilik apotek yang mengganti apoteker
 * penanggung jawab harus membuka HP untuk melakukannya, padahal justru di
 * dashboard-lah ia mengurus hal-hal resmi seperti ini.
 */
export default function PharmacySettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['pharmacy-settings'],
    queryFn: getPharmacySettings,
  })
  const settings = data?.data?.data

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      <Header title={t('pharmSettingsTitle')} subtitle={t('pharmSettingsSubtitle')} />
      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6">
        {isLoading ? (
          <div className="max-w-2xl bg-card rounded-2xl border border-border p-6 animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-muted rounded w-40" />
                <div className="h-9 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : (
          <PharmacyForm key={settings?.pharmacist_license ?? 'new'} initial={settings} />
        )}
      </div>
    </div>
  )
}
