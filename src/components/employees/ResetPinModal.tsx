import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { updateEmployee } from '@/api/employees'
import type { Employee } from '@/types'
import { getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface Props {
  employee: Employee
  onClose: () => void
}

export default function ResetPinModal({ employee, onClose }: Props) {
  const qc = useQueryClient()
  const [pin, setPin] = useState('')

  const mut = useMutation({
    mutationFn: () => updateEmployee(employee.id, { pin }),
    onSuccess: () => {
      toast.success(t('pinResetSaved', { name: employee.name }))
      qc.invalidateQueries({ queryKey: ['employees'] })
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length !== 4) { toast.error(t('pinFourDigits')); return }
    mut.mutate()
  }

  return (
    <Modal open onClose={onClose} title={t('pinResetTitle')} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 rounded-xl">
          <KeyRound size={16} className="text-amber-500 dark:text-amber-400 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {t('pinResetWarning', { name: employee.name })}
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            {t('pinNew')} <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder={t('pinPlaceholder')}
            autoFocus
            className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted transition"
          >
            {t('actionCancel')}
          </button>
          <button
            type="submit"
            disabled={mut.isPending}
            className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {mut.isPending ? 'Menyimpan...' : t('pinSave')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
