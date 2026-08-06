import api from '@/lib/axios'
import type {
  ApiResponse,
  BankInquiry,
  BankOption,
  BalanceEntry,
  MerchantBalance,
  MerchantBankAccount,
  Payout,
} from '@/types'

/** Saldo QRIS: dana pembayaran yang masih ditampung Loka Kasir. */
export const getMerchantBalance = () =>
  api.get<ApiResponse<MerchantBalance>>('/merchant/balance')

export const getBalanceEntries = (limit = 50, offset = 0) =>
  api.get<ApiResponse<BalanceEntry[]>>('/merchant/balance/entries', {
    params: { limit, offset },
  })

export const getPayouts = (limit = 20) =>
  api.get<ApiResponse<Payout[]>>('/merchant/payout', { params: { limit } })

export const getPayoutBanks = () =>
  api.get<ApiResponse<BankOption[]>>('/merchant/payout/banks')

/**
 * Memeriksa rekening ke bank sebelum disimpan. Nama pemilik yang dikembalikan
 * adalah satu-satunya nama yang boleh dipercaya — bukan ketikan pengguna.
 */
export const inquiryBankAccount = (payload: {
  bank_code: string
  account_number: string
}) =>
  api.post<ApiResponse<BankInquiry>>(
    '/merchant/payout/bank-account/inquiry',
    payload,
  )

export const setBankAccount = (payload: {
  bank_code: string
  bank_name: string
  account_number: string
}) =>
  api.put<ApiResponse<MerchantBankAccount>>(
    '/merchant/payout/bank-account',
    payload,
  )

export const requestPayout = (amount: number) =>
  api.post<ApiResponse<Payout>>('/merchant/payout', { amount })
