import Form from '@/components/ui/Form'
import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { createEmployee, updateEmployee } from '@/api/employees'
import type { CreateEmployeePayload, UpdateEmployeePayload } from '@/api/employees'
import type { Employee, Role, ShiftSchedule } from '@/types'
import { getErrorMessage, toTitleCase } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { roleLabel } from '@/lib/roles'
import { useBusinessOutlets } from '@/hooks/useBusinessOutlets'
import {
  assignmentFromIds, isAssignmentEmpty, outletIdsForCreate, outletIdsForUpdate,
  roleAlwaysAllOutlets, type OutletAssignment,
} from '@/lib/employeeOutlets'

interface FormState {
  name: string; identifier: string; phone_number: string
  pin: string; password: string; role_id: string
  shift_schedule_id: string; is_active: boolean
}

const EMPTY_FORM: FormState = {
  name: '', identifier: '', phone_number: '', pin: '', password: '',
  role_id: '', shift_schedule_id: '', is_active: true,
}

// STOCK_IN wajib ada di sini. Perannya bekerja HANYA di dasbor web, dan
// dasbor web dimasuki dengan kata sandi — tanpa baris ini formulirnya tidak
// pernah menawarkan kolom sandi, dan karyawan yang baru dibuat tidak punya
// satu pun cara masuk ke tempat kerjanya.
const PASSWORD_ROLES = new Set([
  'OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'STOCK_IN', 'KASIR', 'WAITERS',
])

const getRoleCode = (roleId: string, roles: Role[]) =>
  roles.find(r => String(r.id) === roleId)?.code?.toUpperCase() ?? ''

const needsPIN = (roleId: string) => roleId !== ''
const needsPassword = (roleId: string, roles: Role[]) => PASSWORD_ROLES.has(getRoleCode(roleId, roles))
const isEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)

/** Nama kolom yang ditolak server (`error.field`), mis. `outlet_ids`. */
const errorFieldOf = (err: unknown): string | undefined =>
  (err as { response?: { data?: { error?: { field?: string } } } })?.response?.data?.error?.field

/**
 * Satu kolom "Email / No. HP" menjadi dua kolom berbeda di server.
 *
 * Nama pengguna TIDAK ikut di sini dan tidak pernah dikirim klien: server yang
 * membuatnya dari nama karyawan (`riki@warungloka`). Email dan nomor telepon
 * tinggal menjadi data kontak — keduanya tetap bisa dipakai masuk kalau diisi,
 * tapi tidak ada lagi alasan mewajibkannya.
 */
const applyIdentifier = (
  payload: CreateEmployeePayload | UpdateEmployeePayload,
  form: FormState,
) => {
  const identifier = form.identifier.trim()
  if (isEmail(identifier)) {
    payload.email = identifier
    payload.phone_number = form.phone_number.trim() || null
  } else {
    payload.email = null
    payload.phone_number = identifier || form.phone_number.trim() || null
  }
}

interface Props {
  employee: Employee | null
  roles: Role[]
  schedules: ShiftSchedule[]
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function EmployeeFormModal({ employee, roles, schedules, open, onClose, onSuccess }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const set = (field: keyof FormState, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  // Penugasan outlet disimpan terpisah dari FormState: bentuknya bukan teks,
  // dan nilai awalnya perlu diingat untuk tahu apakah bagian ini diubah.
  const { outlets } = useBusinessOutlets()
  const showOutletPicker = outlets.length > 1
  const initialAssignment = assignmentFromIds(employee?.outlet_ids)
  const [assignment, setAssignment] = useState<OutletAssignment>(initialAssignment)
  const [outletError, setOutletError] = useState('')
  const roleCode = getRoleCode(form.role_id, roles)
  const roleAllOutlets = roleAlwaysAllOutlets(roleCode)

  const toggleOutlet = (id: string, checked: boolean) => {
    setOutletError('')
    setAssignment(prev => ({
      ...prev,
      ids: checked ? [...prev.ids.filter(x => x !== id), id] : prev.ids.filter(x => x !== id),
    }))
  }

  const handleMutationError = (err: unknown) => {
    // Galat penugasan ditampilkan di bawah daftar outlet juga, bukan hanya di
    // toast yang cepat hilang, supaya jelas bagian mana yang perlu dibetulkan.
    if (errorFieldOf(err) === 'outlet_ids') setOutletError(getErrorMessage(err))
    toast.error(getErrorMessage(err))
  }

  const baseForm: FormState = employee
    ? {
        name: employee.name,
        identifier: employee.email || (employee.username ?? '').split('@')[0] || '',
        phone_number: employee.phone_number ?? '',
        pin: '', password: '',
        role_id: String(employee.role?.id ?? ''),
        shift_schedule_id: employee.shift_schedule?.id ?? '',
        is_active: employee.is_active,
      }
    : EMPTY_FORM

  useEffect(() => {
    if (!open) return
    setForm(baseForm) // eslint-disable-line react-hooks/set-state-in-effect
    setAssignment(initialAssignment)
    setOutletError('')
  }, [open, employee]) // eslint-disable-line react-hooks/exhaustive-deps

  const createMut = useMutation({
    mutationFn: () => {
      const payload: CreateEmployeePayload = {
        name: form.name.trim(),
        role_id: Number(form.role_id),
        shift_schedule_id: form.shift_schedule_id || null,
      }
      applyIdentifier(payload, form)
      if (needsPIN(form.role_id)) payload.pin = form.pin
      if (needsPassword(form.role_id, roles)) payload.password = form.password
      payload.outlet_ids = outletIdsForCreate(assignment, roleCode, showOutletPicker)
      return createEmployee(payload)
    },
    onSuccess: () => { toast.success(t('employeeAdded')); qc.invalidateQueries({ queryKey: ['employees'] }); onSuccess() },
    onError: handleMutationError,
  })

  const updateMut = useMutation({
    mutationFn: () => {
      const payload: UpdateEmployeePayload = {
        name: form.name.trim(),
        role_id: Number(form.role_id),
        shift_schedule_id: form.shift_schedule_id || null,
        is_active: form.is_active,
      }
      applyIdentifier(payload, form)
      if (needsPIN(form.role_id) && form.pin) payload.pin = form.pin
      if (needsPassword(form.role_id, roles) && form.password) payload.password = form.password
      // Hanya dikirim bila bagian outlet diubah — field yang tidak ada dibaca
      // server sebagai "tidak berubah", jadi ubah nama saja tidak menyentuh penugasan.
      const outletIds = outletIdsForUpdate(initialAssignment, assignment, roleCode, showOutletPicker)
      if (outletIds !== undefined) payload.outlet_ids = outletIds
      return updateEmployee(employee!.id, payload)
    },
    onSuccess: () => { toast.success(t('employeeUpdated')); qc.invalidateQueries({ queryKey: ['employees'] }); onSuccess() },
    onError: handleMutationError,
  })

  const isPending = createMut.isPending || updateMut.isPending

  // Nama masuk kasir dibuat server dari nama karyawan; di sini ia hanya
  // DITAMPILKAN. Pemilik tetap harus bisa melihatnya, karena dialah yang
  // menyebutkannya ke kasirnya.
  const loginName = employee?.username ?? ''

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error(t('employeeNameRequired')); return }
    if (!form.role_id) { toast.error(t('employeeRoleRequired')); return }
    if (needsPIN(form.role_id) && !employee && form.pin.length !== 4) { toast.error(t('employeePinRequired')); return }
    if (needsPassword(form.role_id, roles) && !employee && !form.password) { toast.error(t('employeePasswordRequired')); return }
    // Labelnya sudah berbintang sejak dulu, tapi tidak ada yang memeriksanya:
    // karyawan tersimpan dengan kata sandi dan tanpa identitas untuk
    // memasukkannya — layar masuk meminta identifier + kata sandi.

    // Backend menolak kata sandi di bawah 6 karakter lewat binding, dan galat
    // binding sampai ke sini sebagai "Input tidak valid" tanpa menyebut
    // kolomnya. Dicegat di sini supaya pesannya menyebut yang sebenarnya salah.
    if (needsPassword(form.role_id, roles) && form.password && form.password.length < 6) { toast.error(t('employeePasswordMin6')); return }
    // Tanpa centang sama sekali server akan menyimpan [] = SEMUA outlet —
    // kebalikan dari maksud pemilik yang sedang membatasi.
    if (showOutletPicker && !roleAllOutlets && isAssignmentEmpty(assignment)) {
      setOutletError(t('employeeOutletsRequired'))
      toast.error(t('employeeOutletsRequired'))
      return
    }
    if (employee) updateMut.mutate(); else createMut.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title={employee ? t('employeeEdit') : t('employeeAdd')} size="sm">
      <Form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">{t('labelName')} <span className="text-red-500 dark:text-red-400">*</span></label>
          <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={t('employeeNamePlaceholder')}
            className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            {t('employeeIdentifier')}
          </label>
          <input type="text" value={form.identifier} onChange={(e) => set('identifier', e.target.value)} placeholder={t('employeeIdentifierPlaceholder')}
            className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">{t('employeeAltContact')}</label>
          <input type="tel" value={form.phone_number} onChange={(e) => set('phone_number', e.target.value)} placeholder={t('employeeAltContactPlaceholder')}
            className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">{t('employeeRole')} <span className="text-red-500 dark:text-red-400">*</span></label>
          <select value={form.role_id} onChange={(e) => set('role_id', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-muted-foreground">
            <option value="">{t('employeePickRole')}</option>
            {roles.map(r => <option key={r.id} value={String(r.id)}>{roleLabel(r)}</option>)}
          </select>
        </div>
        {needsPassword(form.role_id, roles) && (
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Password {!employee && <span className="text-red-500 dark:text-red-400">*</span>}
            </label>
            <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)}
              placeholder={employee ? t('employeeKeepBlank') : t('employeeWebPassword')}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}
        {needsPassword(form.role_id, roles) && (
          <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">{t('employeeLoginName')}</p>
            <p className="text-sm font-semibold text-foreground">
              {loginName || t('employeeLoginNameNew')}
            </p>
          </div>
        )}
        {needsPIN(form.role_id) && (
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              PIN (4 digit) {!employee && <span className="text-red-500 dark:text-red-400">*</span>}
            </label>
            <input type="password" inputMode="numeric" value={form.pin}
              onChange={(e) => set('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder={employee ? t('employeeKeepBlank') : t('employeePinDigits')}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest" />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">{t('employeeShiftSchedule')} <span className="text-muted-foreground font-normal">({t('labelOptional')})</span></label>
          <select value={form.shift_schedule_id} onChange={(e) => set('shift_schedule_id', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-muted-foreground">
            <option value="">{t('employeeNoSchedule')}</option>
            {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {showOutletPicker && form.role_id && (
          <div>
            <p className="block text-xs font-medium text-foreground mb-1">{t('employeeOutlets')}</p>
            {roleAllOutlets ? (
              <p className="text-xs text-muted-foreground rounded-xl border border-border bg-muted/40 px-3 py-2">{t('employeeOutletsRoleAll')}</p>
            ) : (
              <div className={`rounded-xl border ${outletError ? 'border-red-400 dark:border-red-500' : 'border-border'} px-3 py-2 space-y-2`}>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={assignment.all}
                    onChange={(e) => { setOutletError(''); setAssignment(prev => ({ ...prev, all: e.target.checked })) }}
                    className="w-4 h-4 rounded border-border text-blue-600 dark:text-blue-400 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-foreground">{t('employeeOutletsAll')}</span>
                </label>
                {!assignment.all && (
                  <div className="pl-6 space-y-1.5 max-h-40 overflow-y-auto">
                    {outlets.map(o => (
                      <label key={o.id} className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={assignment.ids.includes(o.id)}
                          onChange={(e) => toggleOutlet(o.id, e.target.checked)}
                          className="w-4 h-4 rounded border-border text-blue-600 dark:text-blue-400 focus:ring-blue-500" />
                        <span className="text-sm text-foreground truncate">{toTitleCase(o.name)}</span>
                      </label>
                    ))}
                    <p className="text-xs text-muted-foreground pt-1">{t('employeeOutletsHint')}</p>
                  </div>
                )}
              </div>
            )}
            {outletError && !roleAllOutlets && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">{outletError}</p>
            )}
          </div>
        )}
        {employee && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)}
              className="w-4 h-4 rounded border-border text-blue-600 dark:text-blue-400 focus:ring-blue-500" />
            <span className="text-sm text-foreground">{t('employeeActive')}</span>
          </label>
        )}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted transition">{t('actionCancel')}</button>
          <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition">
            {isPending ? 'Menyimpan...' : employee ? t('actionSave') : t('employeeAdd')}
          </button>
        </div>
      </Form>
    </Modal>
  )
}
