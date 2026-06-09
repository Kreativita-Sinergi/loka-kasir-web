import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, Outlet, OutletConfig } from '@/types'

export const getMyOutlets = () =>
  api.get<ApiResponse<Outlet[]>>('/outlet/mine')

export const createOutlet = (data: {
  business_id: string
  name: string
  address?: string | null
  phone?: string | null
  is_active: boolean
}) => api.post<ApiResponse<Outlet>>('/outlet', data)

export const updateOutlet = (id: string, data: {
  name: string
  address?: string | null
  phone?: string | null
  is_active: boolean
}) => api.put<ApiResponse<Outlet>>(`/outlet/${id}`, data)

export const deleteOutlet = (id: string) =>
  api.delete(`/outlet/${id}`)

export const getOutletsByBusiness = (businessId: string, params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<Outlet>>(`/outlet/business/${businessId}`, { params })

export const getOutletConfig = (outletId: string) =>
  api.get<ApiResponse<OutletConfig>>(`/outlet/${outletId}/config`)

export const upsertOutletConfig = (outletId: string, data: {
  outlet_id: string
  has_table: boolean
  has_kitchen: boolean
  auto_print: boolean
  require_pin_for_void?: boolean
  header_text?: string | null
  footer_text?: string | null
  note_text?: string | null
  show_logo?: boolean
  show_tax_percentage?: boolean
  paper_size?: string
  show_social_media?: boolean
  instagram_handle?: string | null
  queue_enabled?: boolean
  queue_prefix?: string | null
  queue_suffix?: string | null
  service_fee_enabled?: boolean
  service_fee_rate?: number
  service_fee_taxable?: boolean
  service_fee_order_types?: string
  rounding_enabled?: boolean
  rounding_denomination?: number
  allow_partial_payment?: boolean
  qris_enabled?: boolean
  qris_mode?: 'static' | 'dynamic'
  payment_link?: string | null
}) => api.put<ApiResponse<OutletConfig>>(`/outlet/${outletId}/config`, data)

export const updateOutletLogo = (outletId: string, base64Image: string) =>
  api.put<ApiResponse<OutletConfig>>(`/outlet/${outletId}/logo`, { image: base64Image })

export const removeOutletLogo = (outletId: string) =>
  api.delete<ApiResponse<OutletConfig>>(`/outlet/${outletId}/logo`)

export const updateOutletQris = (outletId: string, base64Image: string) =>
  api.put<ApiResponse<OutletConfig>>(`/outlet/${outletId}/qris`, { image: base64Image })

export const removeOutletQris = (outletId: string) =>
  api.delete<ApiResponse<OutletConfig>>(`/outlet/${outletId}/qris`)

// Mode dinamis: simpan kredensial Duitku milik merchant (api key disimpan terenkripsi).
export const setOutletDuitkuCreds = (outletId: string, data: { merchant_code: string; api_key: string }) =>
  api.put<ApiResponse<OutletConfig>>(`/outlet/${outletId}/qris-credentials`, data)

export const removeOutletDuitkuCreds = (outletId: string) =>
  api.delete<ApiResponse<OutletConfig>>(`/outlet/${outletId}/qris-credentials`)
