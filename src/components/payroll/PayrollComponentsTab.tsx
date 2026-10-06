import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlarmClockOff, Plus, Wallet } from 'lucide-react'
import { DataTable } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { EditButton, DeleteButton } from '@/components/ui/RowActions'
import {
  convertLegacyPayrollComponents, createPayrollComponent, deletePayrollComponent, getPayrollComponents,
  type PayrollComponent, type PayrollComponentPayload,
} from '@/api/payroll'
import { getEmployees } from '@/api/employees'
import type { Employee } from '@/types'
import { getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'
import PayrollComponentFormModal, { type SalariedEmployee } from './PayrollComponentFormModal'
import { componentRateText, componentRuleTexts } from './payrollText'
import { HintBox } from './payrollUi'

/** Respons /employee membawa `salary_type`, meski tipe bersama belum mencatatnya. */
type EmployeeWithSalary = Employee & { salary_type?: string }

/** Contoh siap pakai. Nominalnya titik awal, bukan anjuran. */
function presetStandard(): PayrollComponentPayload[] {
  const base = { late_rule: 'NONE' as const, late_threshold: 1, absent_threshold: 0, min_present_days: 0, max_amount: 0, applies_to_all: true, is_active: true, employees: [] }
  return [
    { ...base, name: t('payCompPresetMeal'), kind: 'EARNING', basis: 'PER_PRESENT_DAY', amount: 15000 },
    { ...base, name: t('payCompPresetTransport'), kind: 'EARNING', basis: 'PER_PRESENT_DAY', amount: 10000 },
    { ...base, name: t('payCompPresetLatePenalty'), kind: 'DEDUCTION', basis: 'PER_LATE', amount: 10000, max_amount: 50000 },
    { ...base, name: t('payCompPresetBpjs'), kind: 'DEDUCTION', basis: 'PERCENT_OF_BASE', amount: 1 },
  ]
}

/** Uang hadir yang hangus SEBULAN PENUH begitu karyawannya terlambat sekali. */
function presetAttendance(): PayrollComponentPayload[] {
  return [{
    name: t('payCompPresetAttendance'), kind: 'EARNING', basis: 'PER_PRESENT_DAY', amount: 15000,
    late_rule: 'PERIOD', late_threshold: 1, absent_threshold: 0, min_present_days: 0, max_amount: 0,
    applies_to_all: true, is_active: true, employees: [],
  }]
}

/**
 * Tab Komponen Gaji: tunjangan, uang hadir, denda, dan potongan yang disusun
 * pemilik. Cermin `payroll_components_sheet.dart`.
 */
export default function PayrollComponentsTab() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PayrollComponent | null>(null)
  const [deleting, setDeleting] = useState<PayrollComponent | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['payroll-components'],
    queryFn: () => getPayrollComponents().then(r => r.data.data),
  })
  const { data: employeesRes } = useQuery({
    queryKey: ['employees-picker'],
    queryFn: () => getEmployees({ limit: 200 }).then(r => r.data),
  })
  // Hanya karyawan aktif yang punya dasar gaji yang ikut penggajian.
  const salaried: SalariedEmployee[] = ((employeesRes?.data ?? []) as EmployeeWithSalary[])
    .filter(e => e.is_active && e.salary_type && e.salary_type !== 'NONE')
    .map(e => ({ id: e.id, name: e.name }))

  const components = data?.components ?? []
  const max = data?.max_components ?? 40
  const legacy = data?.legacy
  const legacyCount = Math.max(legacy?.attendance_allowance_employees ?? 0, legacy?.late_per_occurrence_employees ?? 0, legacy?.late_per_minute_employees ?? 0)

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['payroll-components'] })
    qc.invalidateQueries({ queryKey: ['payroll-summary'] })
  }

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePayrollComponent(id),
    onSuccess: () => { toast.success(t('payCompDeleted')); setDeleting(null); invalidate() },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
  const convertMut = useMutation({
    mutationFn: () => convertLegacyPayrollComponents(),
    onSuccess: () => { toast.success(t('payCompLegacyConverted')); invalidate() },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
  // Berurutan, bukan serentak: server menghitung batas komponen per permintaan,
  // dan empat permintaan sekaligus bisa lolos semua lalu melewati batasnya.
  const presetMut = useMutation({
    mutationFn: async (items: PayrollComponentPayload[]) => { for (const item of items) await createPayrollComponent(item) },
    onSuccess: () => { toast.success(t('payCompPresetApplied')); invalidate() },
    onError: (err) => { toast.error(getErrorMessage(err)); invalidate() },
  })

  const busy = deleteMut.isPending || convertMut.isPending || presetMut.isPending

  const openForm = (component: PayrollComponent | null) => {
    if (!component && components.length >= max) { toast.error(t('payCompLimitReached', { count: max })); return }
    setEditing(component)
    setFormOpen(true)
  }
  const applyPreset = (items: PayrollComponentPayload[]) => {
    if (components.length + items.length > max) { toast.error(t('payCompLimitReached', { count: max })); return }
    presetMut.mutate(items)
  }

  const columns = [
    {
      key: 'name', label: t('payCompName'),
      render: (row: PayrollComponent) => (
        <div className={row.is_active ? '' : 'opacity-60'}>
          <p className="font-medium text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">{componentRateText(row.basis, row.amount)}</p>
        </div>
      ),
    },
    {
      key: 'kind', label: t('payCompKind'),
      render: (row: PayrollComponent) => (
        <Badge variant={row.kind === 'EARNING' ? 'green' : 'red'}>{row.kind === 'EARNING' ? t('payCompKindEarning') : t('payCompKindDeduction')}</Badge>
      ),
    },
    {
      key: 'applies', label: t('payCompAppliesTo'),
      render: (row: PayrollComponent) => (
        <Badge variant="gray">
          {row.applies_to_all ? t('payCompAppliesAllBadge') : t('payCompAppliesSelectedBadge', { count: row.employees.filter(e => e.enabled).length })}
        </Badge>
      ),
    },
    {
      key: 'rules', label: t('payCompRules'),
      render: (row: PayrollComponent) => {
        const rules = componentRuleTexts(row)
        return rules.length ? (
          <div className="flex flex-wrap gap-1">{rules.map(r => <Badge key={r} variant="yellow">{r}</Badge>)}</div>
        ) : <span className="text-muted-foreground">—</span>
      },
    },
    {
      key: 'status', label: t('labelStatus'),
      render: (row: PayrollComponent) => (
        <Badge variant={row.is_active ? 'green' : 'gray'}>{row.is_active ? t('payCompActive') : t('payCompInactiveBadge')}</Badge>
      ),
    },
    {
      key: 'actions', label: '',
      render: (row: PayrollComponent) => (
        <div className="flex items-center gap-1">
          <EditButton onClick={() => openForm(row)} disabled={busy} />
          <DeleteButton onClick={() => setDeleting(row)} disabled={busy} />
        </div>
      ),
    },
  ]

  return (
    <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-5">
      {legacy && legacyCount > 0 && (
        <div className="rounded-2xl border border-warning/20 bg-warning-subtle p-4">
          <p className="text-sm font-semibold text-foreground">{t('payCompLegacyTitle')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('payCompLegacyBody', { count: legacyCount })}</p>
          <Button type="button" size="sm" variant="outline" className="mt-3" disabled={busy} onClick={() => convertMut.mutate()}>
            {t('payCompLegacyConvert')}
          </Button>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border">
        <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{t('payCompTitle')} <span className="ml-1 text-xs font-normal text-muted-foreground">{components.length}/{max}</span></p>
            <p className="text-xs text-muted-foreground">{t('payCompSubtitle')}</p>
          </div>
          <Button type="button" onClick={() => openForm(null)} disabled={busy || isLoading}>
            <Plus /> {t('payCompAdd')}
          </Button>
        </div>
        <DataTable<PayrollComponent>
          columns={columns}
          data={components}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          emptyMessage={t('payCompEmpty')}
        />
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t('payCompPresetsTitle')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <PresetCard icon={<Wallet size={18} />} title={t('payCompPresetStandardTitle')} description={t('payCompPresetStandardDesc')}
            disabled={busy || isLoading} onClick={() => applyPreset(presetStandard())} />
          <PresetCard icon={<AlarmClockOff size={18} />} title={t('payCompPresetAttendanceTitle')} description={t('payCompPresetAttendanceDesc')}
            disabled={busy || isLoading} onClick={() => applyPreset(presetAttendance())} />
        </div>
      </div>

      {formOpen && (
        <PayrollComponentFormModal
          component={editing}
          employees={salaried}
          onClose={() => setFormOpen(false)}
          onSaved={() => setFormOpen(false)}
        />
      )}

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title={t('payCompDelete')} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('payCompDeleteConfirm', { name: deleting?.name ?? '' })}</p>
          <HintBox>{t('payCompDeleteNote')}</HintBox>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>{t('actionCancel')}</Button>
            <Button type="button" variant="destructive" disabled={deleteMut.isPending} onClick={() => deleting && deleteMut.mutate(deleting.id)}>
              {deleteMut.isPending ? t('actionDeleting') : t('actionDelete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function PresetCard({ icon, title, description, onClick, disabled }: {
  icon: React.ReactNode; title: string; description: string; onClick: () => void; disabled?: boolean
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="flex items-start gap-3 rounded-2xl bg-primary/6 p-4 text-left transition hover:bg-primary/10 disabled:opacity-50 dark:bg-primary/12">
      <span className="mt-0.5 shrink-0 text-primary">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <Plus size={18} className="shrink-0 text-primary" aria-hidden="true" />
    </button>
  )
}
