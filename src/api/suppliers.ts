import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, Supplier } from '@/types'

export interface SupplierPayload {
  name: string
  code?: string | null
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  is_consignor?: boolean
}

export interface ConsignmentReturnPayload {
  outlet_id: string
  consignor_id: string
  notes?: string | null
  items: Array<{ product_id: string; variant_id?: string | null; quantity: number; notes?: string | null }>
}

export const getSuppliers = (params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<Supplier>>('/supplier', { params })

export const createSupplier = (data: SupplierPayload) =>
  api.post<ApiResponse<Supplier>>('/supplier', data)

export const updateSupplier = (id: string, data: SupplierPayload) =>
  api.put<ApiResponse<Supplier>>(`/supplier/${id}`, data)

export const deleteSupplier = (id: string) =>
  api.delete<ApiResponse<null>>(`/supplier/${id}`)

export const createConsignmentReturn = (data: ConsignmentReturnPayload) =>
  api.post<ApiResponse<{ id: string; return_number: string }>>('/consignment-return', data)

export interface ConsignmentSalesRow {
  quantity: number
  /** Omzet toko dari barang itu (harga jual). */
  revenue: number
  /** Hak penitip = jumlah × harga setor. */
  owed: number
  /** Laba toko = omzet − hak penitip. */
  profit: number
  /** Hak penitip yang belum masuk settlement mana pun. */
  unsettled: number
}

export interface ConsignmentSales {
  start_date: string
  end_date: string
  suppliers: (ConsignmentSalesRow & { supplier_id: string; supplier_name: string; product_count: number })[]
  total: ConsignmentSalesRow
  /** Hanya bila supplier_id diisi. */
  products?: (ConsignmentSalesRow & { product_id: string; product_name: string })[]
}

/** Barang titipan yang terjual per penitip; isi supplier_id untuk rincian per produk. */
export const getConsignmentSales = (params: { start_date: string; end_date: string; supplier_id?: string; outlet_id?: string }) =>
  api.get<ApiResponse<ConsignmentSales>>('/consignment/sales', { params })
