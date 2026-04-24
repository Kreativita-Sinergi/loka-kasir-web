import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { createShiftSchedule, updateShiftSchedule } from '@/api/shifts'
import type { ShiftSchedule } from '@/types'
import { getErrorMessage } from '@/lib/utils'

interface FormState {
  name: string
  start_hour: string; start_minute: string
  end_hour: string; end_minute: string
  is_next_day: boolean; is_active: boolean
}

const EMPTY: FormState = {
  name: '', start_hour: '8', start_minute: '0',
  end_hour: '17', end_minute: '0',
  is_next_day: false, is_active: true,
}

interface Props {
  schedule: ShiftSchedule | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function ShiftScheduleFormModal({ schedule, open, onClose, onSuccess }: Props) {
  const qc = useQueryClient()
  const baseForm: FormState = schedule
    ? {
        name: schedule.name,
        start_hour: String(schedule.start_hour), start_minute: String(schedule.start_minute),
        end_hour: String(schedule.end_hour), end_minute: String(schedule.end_minute),
        is_next_day: schedule.is_next_day, is_active: schedule.is_active,
      }
    : EMPTY

  const [form, setForm] = useState<FormState>(baseForm)
  const set = (field: keyof FormState, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  useEffect(() => {
    if (!open) return
    setForm(baseForm) // eslint-disable-line react-hooks/set-state-in-effect
  }, [open, schedule]) // eslint-disable-line react-hooks/exhaustive-deps

  const createMut = useMutation({
    mutationFn: () => createShiftSchedule({
      name: form.name,
      start_hour: Number(form.start_hour), start_minute: Number(form.start_minute),
      end_hour: Number(form.end_hour), end_minute: Number(form.end_minute),
      is_next_day: form.is_next_day,
    }),
    onSuccess: () => { toast.success('Jadwal Shift Berhasil Dibuat'); qc.invalidateQueries({ queryKey: ['shift-schedules'] }); onSuccess() },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateShiftSchedule(schedule!.id, {
      name: form.name,
      start_hour: Number(form.start_hour), start_minute: Number(form.start_minute),
      end_hour: Number(form.end_hour), end_minute: Number(form.end_minute),
      is_next_day: form.is_next_day, is_active: form.is_active,
    }),
    onSuccess: () => { toast.success('Jadwal Shift Diperbarui'); qc.invalidateQueries({ queryKey: ['shift-schedules'] }); onSuccess() },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const isPending = createMut.isPending || updateMut.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Nama Jadwal Harus Diisi'); return }
    schedule ? updateMut.mutate() : createMut.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title={schedule ? 'Edit Jadwal Shift' : 'Tambah Jadwal Shift'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Nama Jadwal <span className="text-red-500">*</span></label>
          <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Contoh: Shift Pagi, Shift Malam"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Jam Mulai</label>
            <div className="flex gap-1.5 items-center">
              <input type="number" min={0} max={23} value={form.start_hour} onChange={(e) => set('start_hour', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono" placeholder="HH" />
              <span className="text-gray-400 font-bold">:</span>
              <input type="number" min={0} max={59} value={form.start_minute} onChange={(e) => set('start_minute', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono" placeholder="MM" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Jam Selesai</label>
            <div className="flex gap-1.5 items-center">
              <input type="number" min={0} max={23} value={form.end_hour} onChange={(e) => set('end_hour', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono" placeholder="HH" />
              <span className="text-gray-400 font-bold">:</span>
              <input type="number" min={0} max={59} value={form.end_minute} onChange={(e) => set('end_minute', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono" placeholder="MM" />
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={form.is_next_day} onChange={(e) => set('is_next_day', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <div>
            <span className="text-sm text-gray-700">Melewati Tengah Malam</span>
            <p className="text-xs text-gray-400">Centang untuk shift yang selesainya hari berikutnya (misal: 22:00 → 06:00)</p>
          </div>
        </label>

        {schedule && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-sm text-gray-700">Jadwal Aktif</span>
          </label>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">Batal</button>
          <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition">
            {isPending ? 'Menyimpan...' : schedule ? 'Simpan' : 'Buat Jadwal'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
