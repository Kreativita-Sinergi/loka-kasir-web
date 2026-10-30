import type { CashAccount, CashAccountKind, LedgerCategory, LedgerEntry } from '@/api/cashAccounts'
import type { MessageKey } from '@/lib/messages'
import { t } from '@/lib/i18n'

const CATEGORY_KEYS: Record<LedgerCategory, MessageKey> = {
  income: 'cashAccCatIncome',
  expense: 'cashAccCatExpense',
  capital: 'cashAccCatCapital',
  withdrawal: 'cashAccCatWithdrawal',
  other: 'cashAccCatOther',
  transfer: 'cashAccCatTransfer',
  shift_deposit: 'cashAccCatShiftDeposit',
  sale: 'cashAccCatSale',
  supplier_payment: 'cashAccCatSupplierPayment',
}

export function categoryLabel(category: LedgerCategory): string {
  const key = CATEGORY_KEYS[category]
  return key ? t(key) : category
}

export function kindLabel(kind: CashAccountKind): string {
  return t(kind === 'bank' ? 'cashAccKindBank' : 'cashAccKindCash')
}

/** Label pilihan akun: "BCA · 1234567890" untuk rekening, nama saja untuk kas. */
export function accountOptionLabel(account: CashAccount): string {
  return account.kind === 'bank' && account.account_number ? `${account.name} · ${account.account_number}` : account.name
}

/** Rujukan baris mutasi dalam bahasa pengguna: akun lawan, nota, atau shift. */
export function entryReference(entry: LedgerEntry): string | null {
  if (!entry.reference) return null
  if (entry.source === 'transfer') return t(entry.type === 'OUT' ? 'cashAccRefTo' : 'cashAccRefFrom', { name: entry.reference })
  if (entry.source === 'sale') return t('cashAccRefSale', { ref: entry.reference })
  return entry.reference
}
