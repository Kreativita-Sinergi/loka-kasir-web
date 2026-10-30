import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Form from '@/components/ui/Form'
import SearchableSelect from '@/components/ui/SearchableSelect'
import Switch from '@/components/ui/Switch'
import { ACCOUNT_TYPES, createAccAccount, updateAccAccount } from '@/api/accounting'
import type { AccAccount, AccAccountPayload, AccountType, NormalBalance } from '@/api/accounting'
import { accountOptionLabel, defaultNormalBalance, descendantIds, typeLabel } from '@/lib/accounting'
import { getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { ACCOUNTING_QUERY_KEY, inputClass } from './accountingUi'

const CODE_PATTERN = /^[0-9A-Za-z.-]{1,20}$/

/**
 * Tambah/ubah perkiraan. Perkiraan bawaan (`is_system`) hanya boleh diubah
 * kode, nama, induk, dan keterangannya — jenis, saldo normal, dan status
 * induknya dikunci di sini juga supaya pengguna tidak mengisi kolom yang
 * diam-diam diabaikan server. Kembaran akun kas: namanya ikut Kas & Rekening.
 */
export default function AccountFormModal({ account, accounts, onClose }: {
  account: AccAccount | null
  /** Seluruh perkiraan (termasuk nonaktif) untuk memilih induk. */
  accounts: AccAccount[]
  onClose: () => void
}) {
  const qc = useQueryClient()
  const system = !!account?.is_system
  const cashTwin = !!account?.cash_account_id
  const [code, setCode] = useState(account?.code ?? '')
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'expense')
  const [parentId, setParentId] = useState(account?.parent_id ?? '')
  const [isGroup, setIsGroup] = useState(account?.is_group ?? false)
  const [normal, setNormal] = useState<NormalBalance>(account?.normal_balance ?? defaultNormalBalance(account?.type ?? 'expense'))
  const [description, setDescription] = useState(account?.description ?? '')
  const [submitted, setSubmitted] = useState(false)

  const codeValid = CODE_PATTERN.test(code.trim())
  const nameValid = cashTwin || (name.trim().length >= 1 && name.trim().length <= 80)
  const excluded = account ? descendantIds(accounts, account.id) : new Set<string>()
  const parentOptions = accounts
    .filter(item => item.is_group && item.type === type && !excluded.has(item.id))
    .map(item => ({ value: item.id, label: accountOptionLabel(item) }))

  const mutation = useMutation({
    mutationFn: () => {
      const payload: AccAccountPayload = {
        code: code.trim(),
        name: name.trim(),
        type,
        parent_id: parentId || null,
        is_group: isGroup,
        normal_balance: normal,
        description: description.trim() || null,
      }
      return account ? updateAccAccount(account.id, payload) : createAccAccount(payload)
    },
    onSuccess: () => {
      toast.success(account ? t('accAccountUpdated') : t('accAccountCreated'))
      qc.invalidateQueries({ queryKey: [ACCOUNTING_QUERY_KEY] })
      onClose()
    },
    // Penolakan server (kode dipakai, induk beda jenis, dipakai di pemetaan)
    // sudah berupa kalimat siap tampil.
    onError: err => toast.error(getErrorMessage(err)),
  })

  const changeType = (next: string) => {
    if (!next) return
    const nextType = next as AccountType
    setType(nextType)
    setNormal(defaultNormalBalance(nextType))
    // Induk wajib berjenis sama — induk lama tidak lagi sah.
    if (parentId && accounts.find(item => item.id === parentId)?.type !== nextType) setParentId('')
  }

  return (
    <Modal open onClose={() => { if (!mutation.isPending) onClose() }} title={account ? t('accAccountEdit') : t('accAccountAdd')} size="md">
      <Form noValidate onSubmit={event => {
        event.preventDefault()
        setSubmitted(true)
        if (codeValid && nameValid && !mutation.isPending) mutation.mutate()
      }} className="space-y-4">
        {system && <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">{cashTwin ? t('accAccountCashTwinNote') : t('accAccountSystemNote')}</p>}
        <div className="grid grid-cols-1 min-[400px]:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-3">
          <div>
            <label htmlFor="acc-code" className="block text-sm font-medium text-foreground mb-1">{t('accColCode')}</label>
            <input id="acc-code" value={code} onChange={event => setCode(event.target.value)} maxLength={20} autoFocus
              placeholder="6-1100" aria-invalid={submitted && !codeValid} className={`${inputClass} font-mono`} />
            {submitted && !codeValid && <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{t('accCodeInvalid')}</p>}
          </div>
          <div>
            <label htmlFor="acc-name" className="block text-sm font-medium text-foreground mb-1">{t('accColAccount')}</label>
            <input id="acc-name" value={name} onChange={event => setName(event.target.value)} maxLength={80} disabled={cashTwin}
              aria-invalid={submitted && !nameValid} className={inputClass} />
            {submitted && !nameValid && <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{t('accNameRequired')}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('accColType')}</label>
            <SearchableSelect value={type} onChange={changeType} clearable={false} disabled={system} label={t('accColType')}
              options={ACCOUNT_TYPES.map(value => ({ value, label: typeLabel(value) }))} className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('accNormalBalance')}</label>
            <SearchableSelect value={normal} onChange={value => value && setNormal(value as NormalBalance)} clearable={false} disabled={system}
              label={t('accNormalBalance')} options={[{ value: 'debit', label: t('accDebit') }, { value: 'credit', label: t('accCredit') }]} className="w-full" />
          </div>
        </div>
        {normal !== defaultNormalBalance(type) && <p className="text-xs text-muted-foreground">{t('accNormalContraHint')}</p>}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t('accParent')} <span className="text-muted-foreground font-normal">({t('labelOptional')})</span></label>
          <SearchableSelect value={parentId} onChange={setParentId} options={parentOptions} placeholder={t('accParentNone')} label={t('accParent')} className="w-full" />
        </div>
        <div className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{t('accIsGroup')}</p>
            <p className="text-xs text-muted-foreground">{t('accIsGroupHint')}</p>
          </div>
          <Switch checked={isGroup} onChange={setIsGroup} disabled={system} label={t('accIsGroup')} />
        </div>
        <div>
          <label htmlFor="acc-desc" className="block text-sm font-medium text-foreground mb-1">{t('accDescription')} <span className="text-muted-foreground font-normal">({t('labelOptional')})</span></label>
          <textarea id="acc-desc" value={description} onChange={event => setDescription(event.target.value)} maxLength={200} rows={2} className={inputClass} />
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
