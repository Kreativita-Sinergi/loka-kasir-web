import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Form from '@/components/ui/Form'
import NumericInput from '@/components/ui/NumericInput'
import { Button } from '@/components/ui/button'
import {
  createPayrollComponent, updatePayrollComponent, PAYROLL_COMPONENT_BASES,
  type LateForfeitRule, type PayrollComponent, type PayrollComponentBasis, type PayrollComponentEmployee,
  type PayrollComponentKind, type PayrollComponentPayload,
} from '@/api/payroll'
import { getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { parseMoneyInput } from './payrollCalc'
import { basisLabel, isPercentBasis } from './payrollText'
import { Chips, FieldLabel, Toggle, inputClass } from './payrollUi'

/** Karyawan aktif yang punya dasar gaji — hanya mereka yang ikut penggajian. */
export interface SalariedEmployee { id: string; name: string }

interface Props {
  component: PayrollComponent | null
  employees: SalariedEmployee[]
  onClose: () => void
  onSaved: () => void
}

interface EmployeeDraft { enabled: boolean; amount: string }

const EMPTY: PayrollComponent = {
  id: '', name: '', kind: 'EARNING', basis: 'PER_PRESENT_DAY', amount: 0,
  late_rule: 'NONE', late_threshold: 1, absent_threshold: 0, min_present_days: 0, max_amount: 0,
  applies_to_all: true, sort_order: 0, is_active: true, employees: [],
}

const clampInt = (text: string, min: number, max: number) => {
  const n = parseInt(text.trim(), 10)
  if (Number.isNaN(n)) return min
  return Math.min(max, Math.max(min, n))
}

/**
 * Membuat (`component` null) atau mengubah satu komponen gaji. Cermin
 * `payroll_component_form_sheet.dart`: pilihannya daftar baku yang diberi
 * angka — bukan rumus bebas — supaya tiap baris bisa dijelaskan di slip.
 *
 * Dipasang hanya saat terbuka, sehingga state-nya selalu mulai dari komponen
 * yang diberikan.
 */
export default function PayrollComponentFormModal({ component, employees, onClose, onSaved }: Props) {
  const qc = useQueryClient()
  const original = component ?? EMPTY
  const isNew = !original.id

  const [name, setName] = useState(original.name)
  const [kind, setKind] = useState<PayrollComponentKind>(original.kind)
  const [basis, setBasis] = useState<PayrollComponentBasis>(original.basis)
  const [amount, setAmount] = useState(original.amount > 0 ? String(original.amount) : '')
  const [lateRule, setLateRule] = useState<LateForfeitRule>(original.late_rule)
  const [lateThreshold, setLateThreshold] = useState(String(Math.max(1, original.late_threshold)))
  const [absentThreshold, setAbsentThreshold] = useState(original.absent_threshold > 0 ? String(original.absent_threshold) : '')
  const [minPresent, setMinPresent] = useState(original.min_present_days > 0 ? String(original.min_present_days) : '')
  const [maxAmount, setMaxAmount] = useState(original.max_amount > 0 ? String(original.max_amount) : '')
  const [appliesToAll, setAppliesToAll] = useState(original.applies_to_all)
  const [isActive, setIsActive] = useState(original.is_active)
  // Tanpa baris: ikut komponen untuk semua, tidak ikut bila terpilih saja.
  const [drafts, setDrafts] = useState<Record<string, EmployeeDraft>>(() =>
    Object.fromEntries(employees.map(e => {
      const row = original.employees.find(r => r.employee_id === e.id)
      return [e.id, {
        enabled: row?.enabled ?? original.applies_to_all,
        amount: row?.amount == null ? '' : String(row.amount),
      }]
    })))

  const earning = kind === 'EARNING'
  const percent = isPercentBasis(basis)
  const parseAmount = (text: string) => percent ? (parseFloat(text.replace(',', '.')) || 0) : parseMoneyInput(text)

  const changeBasis = (next: PayrollComponentBasis) => {
    // Persen dan rupiah tidak bisa saling dibaca: isian lama dikosongkan supaya
    // "15000" tidak menjadi 15000 persen.
    if (isPercentBasis(next) !== percent) setAmount('')
    if (lateRule === 'DAY' && next !== 'PER_PRESENT_DAY') setLateRule('PERIOD')
    setBasis(next)
  }

  const changeAppliesToAll = (all: boolean) => {
    setAppliesToAll(all)
    // Berpindah mode: setiap karyawan kembali ke bawaan mode barunya, nominal
    // khususnya tetap.
    setDrafts(prev => Object.fromEntries(Object.entries(prev).map(([id, d]) => [id, { ...d, enabled: all }])))
  }

  const setDraft = (id: string, patch: Partial<EmployeeDraft>) =>
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  /**
   * Baris per karyawan yang dikirim: yang menyimpang dari bawaan saja untuk
   * komponen "semua karyawan", dan yang dipilih untuk "karyawan tertentu".
   * Baris milik karyawan yang tidak tampil dibawa apa adanya supaya tidak
   * hilang diam-diam.
   */
  const employeeRows = (): PayrollComponentEmployee[] => {
    const shown = new Set(employees.map(e => e.id))
    const rows = original.employees.filter(r => !shown.has(r.employee_id))
    for (const [id, d] of Object.entries(drafts)) {
      const text = d.amount.trim()
      const customAmount = text ? parseAmount(text) : null
      const keep = appliesToAll ? (!d.enabled || customAmount !== null) : d.enabled
      if (keep) rows.push({ employee_id: id, amount: customAmount, enabled: d.enabled })
    }
    return rows
  }

  const saveMut = useMutation({
    mutationFn: (payload: PayrollComponentPayload) =>
      isNew ? createPayrollComponent(payload) : updatePayrollComponent(original.id, payload),
    onSuccess: () => {
      toast.success(t('payCompSaved'))
      qc.invalidateQueries({ queryKey: ['payroll-components'] })
      qc.invalidateQueries({ queryKey: ['payroll-summary'] })
      onSaved()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const submit = () => {
    if (!name.trim()) { toast.error(t('payCompNameRequired')); return }
    const rows = employeeRows()
    if (!appliesToAll && !rows.some(r => r.enabled)) { toast.error(t('payCompSelectEmployeeRequired')); return }
    let rule: LateForfeitRule = earning ? lateRule : 'NONE'
    if (rule === 'DAY' && basis !== 'PER_PRESENT_DAY') rule = 'PERIOD'
    // Syarat hangus tidak dikirim untuk potongan — server menolaknya, dan layar
    // memang tidak menawarkannya.
    saveMut.mutate({
      name: name.trim(),
      kind,
      basis,
      amount: parseAmount(amount),
      late_rule: rule,
      late_threshold: clampInt(lateThreshold, 1, 31),
      absent_threshold: earning ? clampInt(absentThreshold, 0, 31) : 0,
      min_present_days: earning ? clampInt(minPresent, 0, 31) : 0,
      max_amount: parseMoneyInput(maxAmount),
      applies_to_all: appliesToAll,
      is_active: isActive,
      employees: rows,
    })
  }

  const lateRuleOptions = [
    { value: 'NONE' as LateForfeitRule, label: t('payCompLateRuleNone') },
    ...(basis === 'PER_PRESENT_DAY' ? [{ value: 'DAY' as LateForfeitRule, label: t('payCompLateRuleDay') }] : []),
    { value: 'PERIOD' as LateForfeitRule, label: t('payCompLateRulePeriod') },
  ]

  return (
    <Modal open onClose={onClose} title={isNew ? t('payCompFormNew') : t('payCompFormEdit')} size="md">
      <Form onSubmit={e => { e.preventDefault(); submit() }} className="space-y-4">
        <div>
          <FieldLabel required>{t('payCompName')}</FieldLabel>
          <input type="text" required maxLength={60} value={name} onChange={e => setName(e.target.value)}
            placeholder={t('payCompNameHint')} className={inputClass} />
        </div>

        <div>
          <FieldLabel>{t('payCompKind')}</FieldLabel>
          <Chips<PayrollComponentKind>
            ariaLabel={t('payCompKind')}
            value={kind}
            onChange={setKind}
            options={[
              { value: 'EARNING', label: t('payCompKindEarning') },
              { value: 'DEDUCTION', label: t('payCompKindDeduction') },
            ]}
          />
        </div>

        <div>
          <FieldLabel>{t('payCompBasis')}</FieldLabel>
          <Chips<PayrollComponentBasis>
            ariaLabel={t('payCompBasis')}
            value={basis}
            onChange={changeBasis}
            options={PAYROLL_COMPONENT_BASES.map(b => ({ value: b, label: basisLabel(b) }))}
          />
        </div>

        <div>
          <FieldLabel required>{percent ? t('payCompPercent') : t('payCompAmount')}</FieldLabel>
          <div className="relative">
            <NumericInput required min="0" step={percent ? 'any' : '1'} value={amount}
              onChange={e => setAmount(e.target.value)} className={inputClass} />
            {percent && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">%</span>}
          </div>
        </div>

        {earning && (
          <div className="space-y-3 rounded-xl border border-border p-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{t('payCompRulesSection')}</p>
              <p className="text-xs text-muted-foreground">{t('payCompRulesHint')}</p>
            </div>
            <div>
              <FieldLabel>{t('payCompLateRuleLabel')}</FieldLabel>
              <Chips<LateForfeitRule> ariaLabel={t('payCompLateRuleLabel')} value={lateRule} onChange={setLateRule} options={lateRuleOptions} />
            </div>
            {lateRule === 'PERIOD' && (
              <div>
                <FieldLabel hint={t('payCompLateThresholdHint')}>{t('payCompLateThreshold')}</FieldLabel>
                <NumericInput min="1" max="31" step="1" value={lateThreshold} onChange={e => setLateThreshold(e.target.value)} className={inputClass} />
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel>{t('payCompAbsentThreshold')}</FieldLabel>
                <NumericInput min="0" max="31" step="1" value={absentThreshold} onChange={e => setAbsentThreshold(e.target.value)} className={inputClass} />
              </div>
              <div>
                <FieldLabel>{t('payCompMinPresent')}</FieldLabel>
                <NumericInput min="0" max="31" step="1" value={minPresent} onChange={e => setMinPresent(e.target.value)} className={inputClass} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t('payCompOptionalHint')}</p>
          </div>
        )}

        <div>
          <FieldLabel hint={t('payCompMaxAmountHint')}>{t('payCompMaxAmount')}</FieldLabel>
          <NumericInput min="0" step="1" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} className={inputClass} />
        </div>

        <div>
          <FieldLabel hint={appliesToAll ? t('payCompAppliesAllHint') : undefined}>{t('payCompAppliesTo')}</FieldLabel>
          <Chips<boolean>
            ariaLabel={t('payCompAppliesTo')}
            value={appliesToAll}
            onChange={changeAppliesToAll}
            options={[
              { value: true, label: t('payCompAppliesAll') },
              { value: false, label: t('payCompAppliesSelected') },
            ]}
          />
        </div>

        <div className="rounded-xl border border-border">
          <p className="border-b border-border px-3 py-2 text-xs font-semibold text-muted-foreground">{t('payCompEmployeeSettings')}</p>
          {employees.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">{t('payCompEmployeesEmpty')}</p>
          ) : (
            <ul className="max-h-60 divide-y divide-border overflow-y-auto">
              {employees.map(e => {
                const d = drafts[e.id] ?? { enabled: appliesToAll, amount: '' }
                return (
                  <li key={e.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{e.name}</span>
                    {d.enabled && (
                      <div className="relative w-32">
                        <NumericInput min="0" step={percent ? 'any' : '1'} value={d.amount}
                          onChange={ev => setDraft(e.id, { amount: ev.target.value })}
                          placeholder={t('payCompCustomAmount')} aria-label={`${t('payCompCustomAmount')} — ${e.name}`}
                          className="w-full min-h-9 rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        {percent && <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">%</span>}
                      </div>
                    )}
                    <Toggle checked={d.enabled} onChange={v => setDraft(e.id, { enabled: v })} label={`${e.name}`} />
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{t('payCompActive')}</p>
            <p className="text-xs text-muted-foreground">{t('payCompActiveHint')}</p>
          </div>
          <Toggle checked={isActive} onChange={setIsActive} label={t('payCompActive')} />
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>{t('actionCancel')}</Button>
          <Button type="submit" disabled={saveMut.isPending}>{saveMut.isPending ? t('saving') : t('actionSave')}</Button>
        </div>
      </Form>
    </Modal>
  )
}
