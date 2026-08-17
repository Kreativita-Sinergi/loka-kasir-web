import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Gift, Coins, ArrowRightLeft, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { getLoyaltyConfig, upsertLoyaltyConfig } from '@/api/loyalty'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import type { LoyaltyConfig } from '@/types'
import { t } from '@/lib/i18n'

function LoyaltyForm({ initial }: { initial?: LoyaltyConfig }) {
  const qc = useQueryClient()
  const [ptsPerThousand, setPtsPerThousand] = useState(String(initial?.points_per_thousand_idr ?? 1))
  const [minRedeem, setMinRedeem] = useState(String(initial?.min_redeem_points ?? 100))
  const [pointValue, setPointValue] = useState(String(initial?.point_value_idr ?? 100))

  const saveMut = useMutation({
    mutationFn: () =>
      upsertLoyaltyConfig({
        points_per_thousand_idr: parseInt(ptsPerThousand) || 1,
        min_redeem_points: parseInt(minRedeem) || 100,
        point_value_idr: parseInt(pointValue) || 100,
      }),
    onSuccess: () => {
      toast.success(t('loyaltySaved'))
      qc.invalidateQueries({ queryKey: ['loyalty-config'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const pts = parseInt(ptsPerThousand) || 1
  const val = parseInt(pointValue) || 100
  const min = parseInt(minRedeem) || 100

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            <span className="flex items-center gap-1.5">
              <Coins size={14} className="text-muted-foreground" />
              {t('loyaltyPointsPerAmount', { amount: formatCurrency(1000) })}
            </span>
          </label>
          <input
            type="number"
            min="1"
            max="100"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={ptsPerThousand}
            onChange={(e) => setPtsPerThousand(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('loyaltyEarnHint', { points: pts, amount: formatCurrency(1000) })}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            <span className="flex items-center gap-1.5">
              <ArrowRightLeft size={14} className="text-muted-foreground" />
              {t('loyaltyValueLabel')}
            </span>
          </label>
          <input
            type="number"
            min="1"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={pointValue}
            onChange={(e) => setPointValue(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('loyaltyValueHint', { amount: formatCurrency(val) })}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            <span className="flex items-center gap-1.5">
              <Gift size={14} className="text-muted-foreground" />
              {t('loyaltyMinRedeem')}
            </span>
          </label>
          <input
            type="number"
            min="1"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={minRedeem}
            onChange={(e) => setMinRedeem(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('loyaltyMinRedeemHint', { points: min })}
          </p>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-teal-50 rounded-xl p-4 space-y-2 text-sm">
        <p className="font-semibold text-teal-800">{t('loyaltySimulation')}</p>
        <p className="text-teal-700">
          {t('loyaltySimSpend', {
            amount: formatCurrency(50000),
            points: Math.floor(50 * pts),
          })}
        </p>
        <p className="text-teal-700">
          {t('loyaltySimRedeem', {
            points: min,
            amount: formatCurrency(min * val),
          })}
        </p>
      </div>

      <button
        onClick={() => saveMut.mutate()}
        disabled={saveMut.isPending}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-60"
      >
        {saveMut.isPending ? 'Menyimpan...' : t('financeSaveSettings')}
      </button>
    </div>
  )
}

export default function LoyaltySettingsPage() {
  const { data: config, isLoading } = useQuery({
    queryKey: ['loyalty-config'],
    queryFn: getLoyaltyConfig,
    select: (res) => res.data.data as LoyaltyConfig | undefined,
  })

  return (
    <>
      <Header title={t('navLoyaltySettings')} subtitle={t('loyaltyPageSubtitle')} />

      <div className="p-6 max-w-xl space-y-6">
        <div className="flex items-center gap-3 bg-card border border-border rounded-2xl px-5 py-4">
          <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
            <Gift size={18} className="text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{t('navLoyaltySettings')}</p>
            <p className="text-xs text-muted-foreground">{t('loyaltySectionDesc')}</p>
          </div>
          <div className="ml-auto">
            {config?.is_active
              ? <ToggleRight size={28} className="text-teal-500" />
              : <ToggleLeft size={28} className="text-muted-foreground" />}
          </div>
        </div>

        {!isLoading && !config && (
          <div className="bg-teal-50 border border-teal-100 rounded-2xl px-5 py-4">
            <p className="text-sm font-semibold text-teal-800">{t('loyaltyNeverConfigured')}</p>
            <p className="text-xs text-teal-600 mt-1">
              {t('loyaltyNotConfiguredBody')}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="bg-card rounded-2xl border border-border p-6 animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-muted rounded w-40" />
                <div className="h-9 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : (
          <LoyaltyForm key={config?.id ?? 'new'} initial={config} />
        )}
      </div>
    </>
  )
}
