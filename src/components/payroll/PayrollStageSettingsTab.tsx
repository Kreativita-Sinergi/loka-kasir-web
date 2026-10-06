import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Minus, Plus } from 'lucide-react'
import NumericInput from '@/components/ui/NumericInput'
import QueryErrorState from '@/components/ui/QueryErrorState'
import { Button } from '@/components/ui/button'
import { getPayrollStageSettings, updatePayrollStageSettings, type PayrollStageSetting } from '@/api/payroll'
import { getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { isShareTotalValid, shareTotal, sharesForCount } from './payrollCalc'
import { formatShare } from './payrollText'
import { FieldLabel, HintBox, Toggle, inputClass } from './payrollUi'

/**
 * Tab Pengaturan: berapa kali gaji satu periode dibayar, bagian tiap tahap,
 * dan jarak harinya. Berlaku untuk SELURUH karyawan usaha ini; yang tetap
 * milik masing-masing karyawan adalah TANGGALNYA, dari tanggal masuk kerjanya.
 * Cermin `payroll_stage_settings_sheet.dart`.
 */
export default function PayrollStageSettingsTab() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['payroll-stage-settings'],
    queryFn: () => getPayrollStageSettings().then(r => r.data.data),
  })

  return (
    <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-5">
      <div className="bg-card rounded-2xl border border-border max-w-2xl">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">{t('payrollStageSettingTitle')}</p>
          <p className="text-xs text-muted-foreground">{t('payrollStageSettingSubtitle')}</p>
        </div>
        <div className="p-5">
          <QueryErrorState error={error} onRetry={refetch} />
          {isLoading && (
            <div className="space-y-3" aria-busy>
              {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-muted" />)}
            </div>
          )}
          {/* key dari data server: begitu setelan termuat ulang, form dibangun
              ulang dari nilai yang benar — tanpa menyalin state di effect. */}
          {data && <StageSettingsForm key={JSON.stringify(data)} initial={data} />}
        </div>
      </div>
    </div>
  )
}

function StageSettingsForm({ initial }: { initial: PayrollStageSetting }) {
  const qc = useQueryClient()
  const [count, setCount] = useState(initial.payroll_stage_count)
  const [gapDays, setGapDays] = useState(String(initial.payroll_stage_gap_days))
  const [equalSplit, setEqualSplit] = useState(initial.is_equal_split)
  const [shares, setShares] = useState<string[]>(() =>
    sharesForCount(initial.payroll_stage_count, initial.payroll_stage_shares, initial.is_equal_split).map(formatShareInput))

  const min = initial.min_stage_count || 1
  const max = initial.max_stage_count || 12
  const maxGap = initial.max_gap_days || 60
  const gap = parseInt(gapDays, 10)
  const numericShares = shares.map(s => parseFloat(s.replace(',', '.')) || 0)
  const gapValid = Number.isInteger(gap) && gap >= 1 && gap <= maxGap
  const sharesValid = count === 1 || equalSplit || isShareTotalValid(numericShares)
  const canSave = gapValid && sharesValid

  const changeCount = (next: number) => {
    const clamped = Math.min(max, Math.max(min, next))
    setCount(clamped)
    setShares(sharesForCount(clamped, numericShares, equalSplit).map(formatShareInput))
  }
  const changeEqualSplit = (next: boolean) => {
    setEqualSplit(next)
    setShares(sharesForCount(count, numericShares, next).map(formatShareInput))
  }

  const saveMut = useMutation({
    mutationFn: () => updatePayrollStageSettings({
      payroll_stage_count: count,
      payroll_stage_gap_days: gap,
      // Pembagian rata dikirim TANPA persen sama sekali: tiga tahap rata
      // bernilai 33,33 × 3 yang jumlahnya bukan 100, dan server menolak
      // setelan yang sebenarnya sah.
      ...(count > 1 && !equalSplit ? { payroll_stage_shares: numericShares } : {}),
    }),
    onSuccess: () => {
      toast.success(t('payrollStageSaved'))
      qc.invalidateQueries({ queryKey: ['payroll-stage-settings'] })
      qc.invalidateQueries({ queryKey: ['payroll-summary'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <form onSubmit={e => { e.preventDefault(); if (canSave) saveMut.mutate() }} className="space-y-5">
      <div>
        <FieldLabel hint={t('payrollStageCountHint')}>{t('payrollStageCountLabel')}</FieldLabel>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="icon" aria-label={t('payrollStageDecrease')} disabled={count <= min} onClick={() => changeCount(count - 1)}><Minus /></Button>
          <span className="w-8 text-center text-xl font-bold tabular-nums text-foreground" aria-live="polite">{count}</span>
          <Button type="button" variant="outline" size="icon" aria-label={t('payrollStageIncrease')} disabled={count >= max} onClick={() => changeCount(count + 1)}><Plus /></Button>
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="payroll-gap-days" hint={t('payrollStageGapHint')}>{t('payrollStageGapLabel')}</FieldLabel>
        <NumericInput id="payroll-gap-days" min="1" max={maxGap} step="1" required value={gapDays} onChange={e => setGapDays(e.target.value)} className={`${inputClass} max-w-xs`} />
      </div>

      {/* Satu tahap tidak punya apa pun untuk dibagi — pilihan pembagiannya
          hanya mengundang pemilik menyetel angka yang tidak berakibat apa-apa. */}
      {count > 1 && (
        <div className="space-y-3 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{t('payrollStageEqualSplit')}</p>
              <p className="text-xs text-muted-foreground">{t('payrollStageEqualSplitHint')}</p>
            </div>
            <Toggle checked={equalSplit} onChange={changeEqualSplit} label={t('payrollStageEqualSplit')} />
          </div>
          {!equalSplit && (
            <div className="space-y-2">
              {shares.map((share, i) => (
                <div key={`${count}-${i}`} className="flex items-center justify-between gap-3">
                  <FieldLabel htmlFor={`payroll-share-${i}`}>{t('payrollStageShareLabel', { n: i + 1 })}</FieldLabel>
                  <div className="relative w-32">
                    <NumericInput id={`payroll-share-${i}`} min="0" max="100" step="any" value={share}
                      onChange={e => setShares(prev => prev.map((s, j) => j === i ? e.target.value : s))}
                      className={`${inputClass} pr-7 text-right`} />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
              <p className={`text-xs font-semibold ${sharesValid ? 'text-muted-foreground' : 'text-destructive'}`}>
                {t('payrollStageShareTotal', { total: formatShare(shareTotal(numericShares)) })}
              </p>
            </div>
          )}
        </div>
      )}

      <HintBox>{t('payrollStageLastNote')}</HintBox>

      <div className="flex justify-end">
        <Button type="submit" disabled={!canSave || saveMut.isPending}>{saveMut.isPending ? t('saving') : t('actionSave')}</Button>
      </div>
    </form>
  )
}

/** Isian persen memakai titik sebagai desimal supaya diterima NumericInput. */
function formatShareInput(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0$/, '')
}
