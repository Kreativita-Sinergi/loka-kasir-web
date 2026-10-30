import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Form from '@/components/ui/Form'
import NumericInput from '@/components/ui/NumericInput'
import SearchableSelect from '@/components/ui/SearchableSelect'
import Switch from '@/components/ui/Switch'
import { createCashAccount, updateCashAccount } from '@/api/cashAccounts'
import type { CashAccount, CashAccountKind, CashAccountPayload } from '@/api/cashAccounts'
import { getErrorMessage } from '@/lib/utils'
import { parseNumericInput } from '@/lib/materialUnits'
import { activeMoney } from '@/lib/money'
import { t } from '@/lib/i18n'

const inputClass = 'w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

/** Tambah/ubah satu akun kas atau rekening bank. Dipasang hanya saat dibuka. */
export default function CashAccountFormModal({ account, onClose, onSaved }: {
  account?: CashAccount | null
  onClose: () => void
  onSaved?: (account: CashAccount) => void
}) {
  const qc = useQueryClient()
  const [kind, setKind] = useState<CashAccountKind>(account?.kind ?? 'cash')
  const [name, setName] = useState(account?.name ?? '')
  const [bankName, setBankName] = useState(account?.bank_name ?? '')
  const [accountNumber, setAccountNumber] = useState(account?.account_number ?? '')
  const [holder, setHolder] = useState(account?.account_holder ?? '')
  const [opening, setOpening] = useState(String(account?.opening_balance ?? 0))
  const [active, setActive] = useState(account?.is_active ?? true)

  const payload = (): CashAccountPayload => {
    const bank = kind === 'bank'
    return {
      kind,
      name: name.trim(),
      bank_name: bank ? bankName.trim() || null : null,
      account_number: bank ? accountNumber.trim() || null : null,
      account_holder: bank ? holder.trim() || null : null,
      opening_balance: parseNumericInput(opening) || 0,
      is_active: active,
    }
  }

  const mutation = useMutation({
    mutationFn: () => account ? updateCashAccount(account.id, payload()) : createCashAccount(payload()),
    onSuccess: response => {
      toast.success(account ? t('cashAccUpdated') : t('cashAccAdded'))
      qc.invalidateQueries({ queryKey: ['cash-accounts'] })
      qc.invalidateQueries({ queryKey: ['cash-ledger'] })
      onSaved?.(response.data.data)
      onClose()
    },
    onError: err => toast.error(getErrorMessage(err)),
  })

  return (
    <Modal open onClose={() => { if (!mutation.isPending) onClose() }} title={account ? t('cashAccEdit') : t('cashAccAdd')} size="sm">
      <Form onSubmit={event => { event.preventDefault(); if (!mutation.isPending) mutation.mutate() }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t('cashAccKind')}</label>
          <SearchableSelect value={kind} onChange={value => setKind(value as CashAccountKind)} clearable={false} label={t('cashAccKind')} className="w-full"
            options={[{ value: 'cash', label: t('cashAccKindCash') }, { value: 'bank', label: t('cashAccKindBank') }]} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {t('cashAccName')} <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input value={name} onChange={event => setName(event.target.value)} maxLength={60} required placeholder={t('cashAccNameExample')} className={inputClass} />
        </div>
        {kind === 'bank' && (
          <>
            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('cashAccBankName')}</label>
                <input value={bankName} onChange={event => setBankName(event.target.value)} maxLength={60} placeholder={t('cashAccBankNameExample')} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('cashAccNumber')}</label>
                <input value={accountNumber} onChange={event => setAccountNumber(event.target.value)} maxLength={40} inputMode="numeric" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('cashAccHolder')}</label>
              <input value={holder} onChange={event => setHolder(event.target.value)} maxLength={100} className={inputClass} />
            </div>
          </>
        )}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t('cashAccOpeningBalance')} ({activeMoney().currency})</label>
          <NumericInput min={0} step="any" value={opening} onChange={event => setOpening(event.target.value)} className={inputClass} />
          <p className="mt-1 text-xs text-muted-foreground">{t('cashAccOpeningBalanceHint')}</p>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">{t('statusActive')}</p>
            <p className="text-xs text-muted-foreground">{t('cashAccActiveHint')}</p>
          </div>
          <Switch checked={active} onChange={setActive} label={t('statusActive')} />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} disabled={mutation.isPending} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted">{t('actionCancel')}</button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
            {mutation.isPending ? t('saving') : t('actionSave')}
          </button>
        </div>
      </Form>
    </Modal>
  )
}
