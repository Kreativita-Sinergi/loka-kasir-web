import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { createEmployee, updateEmployee } from '@/api/employees'
import type { CreateEmployeePayload, UpdateEmployeePayload } from '@/api/employees'
import type { Employee, Role, ShiftSchedule } from '@/types'
import { getErrorMessage } from '@/lib/utils'

interface FormState {
  name: string; identifier: string; phone_number: string
  pin: string; password: string; role_id: string
  shift_schedule_id: string; is_active: boolean
}

const EMPTY_FORM: FormState = {
  name: '', identifier: '', phone_number: '', pin: '', password: '',
  role_id: '', shift_schedule_id: '', is_active: true,
}

const PASSWORD_ROLES = new Set(['OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'KASIR', 'WAITERS'])

const getRoleCode = (roleId: string, roles: Role[]) =>
  roles.find(r => String(r.id) === roleId)?.code?.toUpperCase() ?? ''

const needsPIN = (roleId: string) => roleId !== ''
const needsPassword = (roleId: string, roles: Role[]) => PASSWORD_ROLES.has(getRoleCode(roleId, roles))
const isEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)

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

  const baseForm: FormState = employee
    ? {
        name: employee.name,
        identifier: employee.email || employee.phone_number || '',
        phone_number: '', pin: '', password: '',
        role_id: String(employee.role?.id ?? ''),
        shift_schedule_id: employee.shift_schedule?.id ?? '',
        is_active: employee.is_active,
      }
    : EMPTY_FORM

  useEffect(() => {
    if (!open) return
    setForm(baseForm) // eslint-disable-line react-hooks/set-state-in-effect
  }, [open, employee]) // eslint-disable-line react-hooks/exhaustive-deps

  const createMut = useMutation({
    mutationFn: () => {
      const payload: CreateEmployeePayload = {
        name: form.name,
        role_id: Number(form.role_id),
        shift_schedule_id: form.shift_schedule_id || null,
      }
      if (isEmail(form.identifier)) { payload.email = form.identifier; payload.phone_number = form.phone_number || null }
      else { payload.email = null; payload.phone_number = form.identifier || form.phone_number || null }
      if (needsPIN(form.role_id)) payload.pin = form.pin
      if (needsPassword(form.role_id, roles)) payload.password = form.password
      return createEmployee(payload)
    },
    onSuccess: () => { toast.success('Karyawan Berhasil Ditambahkan'); qc.invalidateQueries({ queryKey: ['employees'] }); onSuccess() },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => {
      const payload: UpdateEmployeePayload = {
        name: form.name,
        role_id: Number(form.role_id),
        shift_schedule_id: form.shift_schedule_id || null,
        is_active: form.is_active,
      }
      if (isEmail(form.identifier)) { payload.email = form.identifier; payload.phone_number = form.phone_number || null }
      else { payload.email = null; payload.phone_number = form.identifier || form.phone_number || null }
      if (needsPIN(form.role_id) && form.pin) payload.pin = form.pin
      if (needsPassword(form.role_id, roles) && form.password) payload.password = form.password
      return updateEmployee(employee!.id, payload)
    },
    onSuccess: () => { toast.success('Karyawan Berhasil Diperbarui'); qc.invalidateQueries({ queryKey: ['employees'] }); onSuccess() },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const isPending = createMut.isPending || updateMut.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Nama Harus Diisi'); return }
    if (!form.role_id) { toast.error('Role Harus Dipilih'); return }
    if (needsPIN(form.role_id) && !employee && form.pin.length !== 4) { toast.error('PIN Harus 4 Digit'); return }
    if (needsPassword(form.role_id, roles) && !employee && !form.password) { toast.error('Password Harus Diisi'); return }
    if (employee) updateMut.mutate(); else createMut.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title={employee ? 'Edit Karyawan' : 'Tambah Karyawan'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Nama <span className="text-red-500">*</span></label>
          <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Nama Lengkap Karyawan"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Email / No. HP {needsPassword(form.role_id, roles) && <span className="text-red-500">*</span>}
          </label>
          <input type="text" value={form.identifier} onChange={(e) => set('identifier', e.target.value)} placeholder="email@bisnis.com atau 08xxxxxxxxxx"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Kontak Alternatif (Opsional)</label>
          <input type="tel" value={form.phone_number} onChange={(e) => set('phone_number', e.target.value)} placeholder="Misal: Nomor HP lain"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Role <span className="text-red-500">*</span></label>
          <select value={form.role_id} onChange={(e) => set('role_id', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600">
            <option value="">— Pilih Role —</option>
            {roles.map(r => <option key={r.id} value={String(r.id)}>{r.name}</option>)}
          </select>
        </div>
        {needsPassword(form.role_id, roles) && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Password {!employee && <span className="text-red-500">*</span>}
            </label>
            <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)}
              placeholder={employee ? 'Kosongkan jika tidak ganti' : 'Password login Web'}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}
        {needsPIN(form.role_id) && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              PIN (4 digit) {!employee && <span className="text-red-500">*</span>}
            </label>
            <input type="password" inputMode="numeric" value={form.pin}
              onChange={(e) => set('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder={employee ? 'Kosongkan jika tidak ganti' : '4 digit angka'}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest" />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Jadwal Shift <span className="text-gray-400 font-normal">(Opsional)</span></label>
          <select value={form.shift_schedule_id} onChange={(e) => set('shift_schedule_id', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600">
            <option value="">— Tidak Ada Jadwal —</option>
            {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {employee && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-sm text-gray-700">Karyawan Aktif</span>
          </label>
        )}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">Batal</button>
          <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition">
            {isPending ? 'Menyimpan...' : employee ? 'Simpan' : 'Tambah Karyawan'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
