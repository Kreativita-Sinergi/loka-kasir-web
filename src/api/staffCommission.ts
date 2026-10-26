import api from '@/lib/axios'
import type { ApiResponse } from '@/types'

// Komisi penjual per produk. Tarifnya dibekukan saat transaksi terjadi, jadi
// mengubah komisi produk tidak mengubah angka laporan yang sudah lewat.
// Tanggal YYYY-MM-DD dalam jam toko, kedua ujung ikut dihitung.

type Range = { start_date: string; end_date: string; outlet_id?: string }

export interface StaffCommissionRow {
  /** null = dijual pemilik / bukan karyawan; employee_name kosong. */
  employee_id: string | null
  employee_name: string
  lines: number
  quantity: number
  sales: number
  commission: number
}

export interface StaffCommissionReport {
  rows: StaffCommissionRow[]
  total_sales: number
  total_commission: number
}

export interface StaffCommissionLine {
  transaction_id: string
  bill_number: string
  sold_at: string
  product_name: string
  quantity: number
  unit: string
  sales: number
  commission_type: 'FIXED' | 'PERCENT'
  commission_value: number
  commission: number
}

/** Rekap komisi per karyawan, urut komisi terbesar. */
export const getStaffCommissionReport = (params: Range) =>
  api.get<ApiResponse<StaffCommissionReport>>('/staff-commission/report', { params })

/**
 * Rincian baris penjualan satu karyawan (maks. 500, terbaru dulu).
 * `employee_id` "none" = baris tanpa karyawan.
 */
export const getStaffCommissionLines = (params: Range & { employee_id: string }) =>
  api.get<ApiResponse<StaffCommissionLine[]>>('/staff-commission/lines', { params })
