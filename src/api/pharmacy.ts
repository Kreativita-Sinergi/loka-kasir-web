import api from '@/lib/axios'
import type { ApiResponse } from '@/types'

/** Satu penerimaan barang dengan tanggal kedaluwarsanya sendiri.
 *
 *  Satu obat hampir selalu punya beberapa batch sekaligus: kiriman bulan lalu
 *  yang tinggal sedikit, dan kiriman minggu ini yang masih penuh. Keduanya obat
 *  yang sama dengan harga yang sama, tetapi hanya satu yang boleh dijual lebih
 *  dulu — yang paling cepat kedaluwarsa. */
export interface ProductBatch {
  id: string
  product_id: string
  batch_code: string
  expiry_date: string
  quantity: number
  initial_quantity: number
  received_at?: string
  note?: string | null
}

/** Satu baris papan pantau kedaluwarsa: batch beserta nama produknya. */
export interface ExpiringBatch {
  id: string
  product_id: string
  product_name: string
  batch_code: string
  expiry_date: string
  quantity: number
  drug_class?: string | null
  outlet_name?: string
  sell_price?: number
}

/** Papan pantau kedaluwarsa, memisahkan yang SUDAH lewat dari yang menyusul.
 *
 *  Dipisah karena tindakannya berbeda dan mendesaknya berbeda: yang sudah lewat
 *  harus ditarik dari rak hari ini juga, yang mendekat masih bisa didiskon atau
 *  diretur ke distributor. */
export interface ExpiryBoard {
  warning_days: number
  expired: ExpiringBatch[]
  soon: ExpiringBatch[]
  expired_value: number
  soon_value: number
}

export interface PharmacySettings {
  pharmacist_name: string
  pharmacist_license: string
  expiry_warning_days: number
  block_expired_sale: boolean
}

export interface DrugClassSalesRow {
  drug_class: string
  item_count: number
  quantity_sold: number
  revenue: number
}

export interface ControlledLedgerRow {
  date: string
  bill_number: string
  product_name: string
  drug_class: string
  batch_code: string
  expiry_date: string
  quantity: number
  patient_name: string
  doctor_name: string
  prescription_number: string
}

export const getBatches = (productId: string, outletId: string, includeEmpty = false) =>
  api.get<ApiResponse<ProductBatch[]>>('/pharmacy/batch', {
    params: { product_id: productId, outlet_id: outletId, include_empty: includeEmpty || undefined },
  })

export const receiveBatch = (
  outletId: string,
  data: {
    product_id: string
    batch_code: string
    expiry_date: string
    quantity: number
    note?: string
  },
) => api.post<ApiResponse<ProductBatch>>('/pharmacy/batch', data, { params: { outlet_id: outletId } })

export const updateBatch = (
  id: string,
  data: { batch_code: string; expiry_date: string; note?: string },
) => api.put<ApiResponse<ProductBatch>>(`/pharmacy/batch/${id}`, data)

export const adjustBatch = (id: string, quantity: number, note?: string) =>
  api.put<ApiResponse<ProductBatch>>(`/pharmacy/batch/${id}/quantity`, { quantity, note })

export const deleteBatch = (id: string) =>
  api.delete<ApiResponse<null>>(`/pharmacy/batch/${id}`)

export const getExpiring = (outletId?: string, withinDays?: number) =>
  api.get<ApiResponse<ExpiryBoard>>('/pharmacy/expiring', {
    params: { outlet_id: outletId || undefined, within_days: withinDays || undefined },
  })

export const getPharmacySettings = () =>
  api.get<ApiResponse<PharmacySettings>>('/pharmacy/settings')

export const savePharmacySettings = (data: Partial<PharmacySettings>) =>
  api.put<ApiResponse<PharmacySettings>>('/pharmacy/settings', data)

export const getDrugClassReport = (params: {
  outlet_id?: string
  start_date?: string
  end_date?: string
}) => api.get<ApiResponse<DrugClassSalesRow[]>>('/pharmacy/report/drug-class', { params })

export const getControlledLedger = (params: {
  outlet_id?: string
  start_date?: string
  end_date?: string
}) => api.get<ApiResponse<ControlledLedgerRow[]>>('/pharmacy/report/controlled', { params })

/** Sisa hari sampai kedaluwarsa; negatif berarti sudah lewat.
 *
 *  Dihitung per HARI, bukan per jam: sebuah batch tidak boleh berubah status di
 *  tengah jam kerja hanya karena jam dinding lewat tengah hari. */
export function daysUntilExpiry(expiryDate: string, asOf = new Date()) {
  const expiry = new Date(expiryDate)
  const a = Date.UTC(expiry.getFullYear(), expiry.getMonth(), expiry.getDate())
  const b = Date.UTC(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
  return Math.round((a - b) / 86_400_000)
}
