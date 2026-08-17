import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { createCustomer, updateCustomer } from '@/api/customers'
import type { Customer } from '@/types'
import { getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'

type FormState = {
  name: string; phone: string; email: string; address: string; notes: string
}

const emptyForm: FormState = { name: '', phone: '', email: '', address: '', notes: '' }

interface Props {
  customer: Customer | null
  businessId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CustomerFormModal({ customer, businessId, open, onClose, onSuccess }: Props) {
  const qc = useQueryClient()
  const baseForm: FormState = customer
    ? { name: customer.name, phone: customer.phone ?? '', email: customer.email ?? '', address: customer.address ?? '', notes: customer.notes ?? '' }
    : emptyForm

  const [form, setForm] = useState<FormState>(baseForm)

  useEffect(() => {
    if (!open) return
    setForm(baseForm) // eslint-disable-line react-hooks/set-state-in-effect
  }, [open, customer]) // eslint-disable-line react-hooks/exhaustive-deps

  const createMut = useMutation({
    mutationFn: () => createCustomer({
      business_id: businessId,
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      notes: form.notes || null,
    }),
    onSuccess: () => { toast.success(t('customerAdded')); qc.invalidateQueries({ queryKey: ['customers', businessId] }); onSuccess() },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateCustomer(customer!.id, {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      notes: form.notes || null,
    }),
    onSuccess: () => { toast.success(t('customerUpdated')); qc.invalidateQueries({ queryKey: ['customers', businessId] }); onSuccess() },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const isPending = createMut.isPending || updateMut.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error(t('customerNameRequired')); return }
    if (customer) updateMut.mutate(); else createMut.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title={customer ? t('customerEdit') : t('customerAdd')} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">{t('labelName')} <span className="text-red-500 dark:text-red-400">*</span></label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('customerNamePlaceholder')}
            className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{t('labelPhone')}</label>
            <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t('phonePlaceholder')}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{t('labelEmail')}</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t('emailPlaceholder')}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">{t('labelAddress')}</label>
          <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} placeholder={t('addressPlaceholder')}
            className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">{t('labelNote')}</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder={t('customerNotePlaceholder')}
            className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted transition">{t('actionCancel')}</button>
          <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition">
            {isPending ? 'Menyimpan...' : customer ? t('actionSave') : t('actionAdd')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
