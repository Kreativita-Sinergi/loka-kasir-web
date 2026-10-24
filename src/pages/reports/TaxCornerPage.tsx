import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle, Copy, Gavel, Info, Landmark, ShieldCheck, Store, Timer } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import Badge, { type BadgeVariant } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Switch from '@/components/ui/Switch'
import { Button } from '@/components/ui/button'
import {
  getTaxYear,
  markTaxPaid,
  saveTaxProfile,
  type TaxMonth,
  type TaxMonthStatus,
  type TaxpayerType,
  type TaxYear,
} from '@/api/ownerInsights'
import { formatCurrency, formatDate } from '@/lib/utils'
import { t } from '@/lib/i18n'
import type { MessageKey } from '@/lib/messages'

const TYPE_TEXT: Record<TaxpayerType, [MessageKey, MessageKey]> = {
  op: ['tcxTypeOp', 'tcxTypeOpHint'],
  pt_perorangan: ['tcxTypePtPerorangan', 'tcxTypePtHint'],
  koperasi: ['tcxTypeKoperasi', 'tcxTypeKoperasiHint'],
  badan: ['tcxTypeBadan', 'tcxTypeBadanHint'],
}

function statusBadge(m: TaxMonth): [BadgeVariant, string] {
  const map: Record<TaxMonthStatus, [BadgeVariant, string]> = {
    future: ['gray', t('tcxStatusFuture')],
    running: ['blue', t('tcxStatusRunning')],
    none: ['green', t('tcxStatusNone')],
    due: ['yellow', t('tcxStatusDue', { date: formatDate(m.due_date) })],
    overdue: ['red', t('tcxStatusOverdue')],
    paid: ['green', t('tcxStatusPaid')],
  }
  return map[m.status]
}

const monthName = (year: number, month: number) =>
  new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

function ProfileModal({ data, onClose }: { data: TaxYear; onClose: () => void }) {
  const qc = useQueryClient()
  const p = data.profile
  const [type, setType] = useState<TaxpayerType>(p.taxpayer_type)
  const [npwp, setNpwp] = useState(p.npwp)
  const [registered, setRegistered] = useState(p.registered_year ? String(p.registered_year) : '')
  const [external, setExternal] = useState(data.external_omzet ? String(data.external_omzet) : '')
  const [reminder, setReminder] = useState(p.reminder_enabled)
  const save = useMutation({
    mutationFn: () => saveTaxProfile({
      taxpayer_type: type,
      npwp: npwp.trim(),
      registered_year: registered ? Number(registered) : null,
      external_omzet: { ...p.external_omzet, [String(data.year)]: Number(external.replace(/\D/g, '')) || 0 },
      reminder_enabled: reminder,
    }),
    onSuccess: () => {
      toast.success(t('tcxProfileSaved'))
      qc.invalidateQueries({ queryKey: ['tax-year'] })
      onClose()
    },
    onError: () => toast.error(t('cashDiscLoadFailed')),
  })
  const field = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground'
  return (
    <Modal open onClose={onClose} title={t('tcxProfileTitle')}>
      <div className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground">{t('tcxTypeLabel')}</span>
          <select value={type} onChange={(e) => setType(e.target.value as TaxpayerType)} className={field}>
            {(Object.keys(TYPE_TEXT) as TaxpayerType[]).map((k) => <option key={k} value={k}>{t(TYPE_TEXT[k][0])}</option>)}
          </select>
          <span className="text-xs text-muted-foreground">{t(TYPE_TEXT[type][1])}</span>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground">{t('tcxNpwpLabel')}</span>
          <input value={npwp} onChange={(e) => setNpwp(e.target.value)} className={field} />
        </label>
        {type === 'koperasi' && (
          <label className="block space-y-1">
            <span className="text-sm font-medium text-foreground">{t('tcxRegisteredLabel')}</span>
            <input inputMode="numeric" maxLength={4} value={registered} onChange={(e) => setRegistered(e.target.value.replace(/\D/g, ''))} className={field} />
          </label>
        )}
        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground">{t('tcxExternalLabel', { year: data.year })}</span>
          <input inputMode="numeric" value={external} onChange={(e) => setExternal(e.target.value)} className={field} />
          <span className="text-xs text-muted-foreground">{t('tcxExternalHelper')}</span>
        </label>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">{t('tcxReminderLabel')}</p>
            <p className="text-xs text-muted-foreground">{t('tcxReminderHint')}</p>
          </div>
          <Switch checked={reminder} onChange={setReminder} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t('actionCancel')}</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{t('actionSave')}</Button>
        </div>
      </div>
    </Modal>
  )
}

function PaymentModal({ data, month, onClose }: { data: TaxYear; month: TaxMonth; onClose: () => void }) {
  const qc = useQueryClient()
  const [ntpn, setNtpn] = useState(month.payment?.ntpn ?? '')
  const paid = month.status === 'paid'
  const submit = useMutation({
    mutationFn: (mark: boolean) => markTaxPaid(month.period, mark, ntpn.trim()),
    onSuccess: (_, mark) => {
      toast.success(mark ? t('tcxMarkedPaid') : t('tcxUnmarked'))
      qc.invalidateQueries({ queryKey: ['tax-year'] })
      onClose()
    },
    onError: () => toast.error(t('cashDiscLoadFailed')),
  })
  return (
    <Modal open onClose={onClose} title={t('tcxPayTitle', { period: monthName(data.year, month.month) })} size="sm">
      <div className="space-y-4">
        <div>
          <p className="text-2xl font-bold tabular-nums text-foreground">{formatCurrency(month.pph_due)}</p>
          <p className="text-xs text-muted-foreground">{t('tcxPayBasis', { amount: formatCurrency(month.taxable) })}</p>
          <p className="text-xs text-muted-foreground">{t('tcxPayDue', { date: formatDate(month.due_date) })}</p>
        </div>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground">{t('tcxNtpnLabel')}</span>
          <input value={ntpn} onChange={(e) => setNtpn(e.target.value.toUpperCase())} placeholder={t('tcxNtpnHint')}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground" />
        </label>
        <p className="text-xs text-muted-foreground">{t('tcxPayNote', { kap: data.kap, kjs: data.kjs })}</p>
        <div className="flex justify-end gap-2">
          {paid && <Button variant="outline" onClick={() => submit.mutate(false)} disabled={submit.isPending}>{t('tcxUnmark')}</Button>}
          <Button onClick={() => submit.mutate(true)} disabled={submit.isPending}>{paid ? t('actionSave') : t('tcxMarkPaid')}</Button>
        </div>
      </div>
    </Modal>
  )
}

function Warning({ code, data, onProfile }: { code: string; data: TaxYear; onProfile: () => void }) {
  const ceiling = formatCurrency(data.ceiling)
  const box = (tone: string, icon: React.ReactNode, body: React.ReactNode) => (
    <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${tone}`}>{icon}<div>{body}</div></div>
  )
  switch (code) {
    case 'profile_missing':
      return box('bg-warning-subtle text-warning', <AlertTriangle size={16} className="mt-0.5 shrink-0" />, (
        <button type="button" onClick={onProfile} className="text-left">
          <p className="font-semibold">{t('tcxWarnProfileTitle')}</p>
          <p>{t('tcxWarnProfileBody')}</p>
        </button>
      ))
    case 'near_ceiling': return box('bg-warning-subtle text-warning', <AlertTriangle size={16} className="mt-0.5 shrink-0" />, t('tcxWarnNearCeiling', { ceiling }))
    case 'over_ceiling': return box('bg-destructive-subtle text-destructive', <AlertTriangle size={16} className="mt-0.5 shrink-0" />, t('tcxWarnOverCeiling', { ceiling }))
    case 'koperasi_expired': return box('bg-destructive-subtle text-destructive', <AlertTriangle size={16} className="mt-0.5 shrink-0" />, t('tcxWarnKoperasi'))
    case 'badan_transition': return box('bg-warning-subtle text-warning', <Info size={16} className="mt-0.5 shrink-0" />, t('tcxWarnBadan'))
    case 'only_recorded_sale': return box('bg-muted text-muted-foreground', <Info size={16} className="mt-0.5 shrink-0" />, t('tcxWarnRecordedOnly'))
    default: return null
  }
}

export default function TaxCornerPage() {
  const now = new Date().getFullYear()
  const [year, setYear] = useState(now)
  const [profileOpen, setProfileOpen] = useState(false)
  const [payMonth, setPayMonth] = useState<TaxMonth | null>(null)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['tax-year', year],
    queryFn: () => getTaxYear(year),
    select: (r) => r.data.data,
  })

  const copy = async (v: string) => {
    await navigator.clipboard.writeText(v)
    toast.success(t('tcxCopied', { value: v }))
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header title={t('tcxTitle')} subtitle={t('tcxSubtitle')} />

      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground">
            <option value={now - 1}>{now - 1}</option>
            <option value={now}>{now}</option>
          </select>
          {data && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">
                {t(TYPE_TEXT[data.profile.taxpayer_type][0])}
                {data.profile.npwp ? ` · ${t('tcxNpwp', { npwp: data.profile.npwp })}` : ''}
                {' · '}{data.profile.reminder_enabled ? t('tcxReminderOn') : t('tcxReminderOff')}
              </span>
              <Button size="sm" variant="outline" onClick={() => setProfileOpen(true)}>
                {data.profile.is_set ? t('actionEdit') : t('tcxProfileSet')}
              </Button>
            </div>
          )}
        </div>

        {isError && <p className="text-sm text-destructive">{t('cashDiscLoadFailed')}</p>}

        {data?.warnings.map((w) => <Warning key={w} code={w} data={data} onProfile={() => setProfileOpen(true)} />)}

        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title={t('tcxStatOmzet')} value={formatCurrency((data?.total_omzet ?? 0) + (data?.external_omzet ?? 0))}
            subtitle={data?.external_omzet ? t('tcxStatOmzetExternal', { amount: formatCurrency(data.external_omzet) }) : undefined}
            icon={<Store size={18} />} color="blue" loading={isLoading} />
          {data?.profile.taxpayer_type === 'op' && (
            <StatCard title={t('tcxStatExemptLeft')} value={formatCurrency(data.exempt_remaining)} icon={<ShieldCheck size={18} />} color="green" />
          )}
          <StatCard title={t('tcxStatPph')} value={formatCurrency(data?.total_pph ?? 0)} icon={<Landmark size={18} />} color="purple" loading={isLoading} />
          <StatCard title={t('tcxStatUnpaid')} value={formatCurrency(data?.unpaid_pph ?? 0)} icon={<Timer size={18} />} color={data?.unpaid_pph ? 'red' : 'green'} loading={isLoading} />
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm font-semibold text-foreground">{t('tcxMonthsTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('tcxMonthsHint')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">{t('tcxColPeriod')}</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">{t('tcxColOmzet')}</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">{t('tcxColTaxable')}</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">{t('tcxColPph')}</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">{t('tcxColStatus')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...(data?.months ?? [])].reverse().map((m) => {
                  const [variant, label] = statusBadge(m)
                  const actionable = m.status === 'due' || m.status === 'overdue' || m.status === 'paid'
                  return (
                    <tr key={m.period} onClick={actionable ? () => setPayMonth(m) : undefined}
                      className={`transition-colors ${actionable ? 'cursor-pointer hover:bg-muted' : ''}`}>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {monthName(data!.year, m.month)}
                        {m.payment?.ntpn && <p className="text-xs text-muted-foreground">{t('tcxMonthNtpn', { ntpn: m.payment.ntpn })}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-muted-foreground">{formatCurrency(m.omzet)}</td>
                      <td className="px-4 py-3 text-sm text-right text-muted-foreground">{m.taxable > 0 ? formatCurrency(m.taxable) : '—'}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-foreground">{m.pph_due > 0 ? formatCurrency(m.pph_due) : '—'}</td>
                      <td className="px-4 py-3"><Badge variant={variant}>{label}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {!!data?.total_local_tax && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground">{t('tcxLocalTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('tcxLocalHint')}</p>
            <ul className="divide-y divide-border">
              {[...data.months].reverse().filter((m) => m.local_tax > 0).map((m) => (
                <li key={m.period} className="flex justify-between py-2 text-sm">
                  <span className="text-foreground">{monthName(data.year, m.month)}</span>
                  <span className="font-semibold tabular-nums text-foreground">{formatCurrency(m.local_tax)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground">{t('tcxHowTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('tcxHowBody')}</p>
            {([['tcxKap', data.kap], ['tcxKjs', data.kjs]] as const).map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t(label)}</span>
                <button type="button" onClick={() => copy(value)} className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary">
                  {value} <Copy size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          <Gavel size={16} className="mt-0.5 shrink-0" />
          <p>{t('tcxDisclaimer')}</p>
        </div>
      </div>

      {profileOpen && data && <ProfileModal data={data} onClose={() => setProfileOpen(false)} />}
      {payMonth && data && <PaymentModal data={data} month={payMonth} onClose={() => setPayMonth(null)} />}
    </div>
  )
}
