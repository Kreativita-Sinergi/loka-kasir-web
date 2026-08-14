import api, { publicApi } from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, BusinessType, PaymentMethod, Role, OrderType } from '@/types'

// ─── Location (public — digunakan saat registrasi) ──────────────────────────
export interface Province { id: number; name: string; code: string }
export interface City { id: number; province_id: number; type: string; name: string; code: string }
export interface District { id: number; city_id: number; name: string; code: string }
export interface Village { id: number; district_id: number; name: string; code: string }

export const getProvinces = () =>
  publicApi.get<ApiResponse<Province[]>>('/location/provinces')

export const getCitiesByProvince = (provinceId: number) =>
  publicApi.get<ApiResponse<City[]>>(`/location/cities?province_id=${provinceId}`)

export const getDistrictsByCity = (cityId: number) =>
  publicApi.get<ApiResponse<District[]>>(`/location/districts?city_id=${cityId}`)

export const getVillagesByDistrict = (districtId: number) =>
  publicApi.get<ApiResponse<Village[]>>(`/location/villages?district_id=${districtId}`)

// Business Types
export const getBusinessTypes = () =>
  publicApi.get<ApiResponse<BusinessType[]>>('/business-type')

// Business Verticals (sub-jenis usaha) — publik karena dibutuhkan di layar
// pendaftaran, sebelum token apa pun ada. Daftarnya bergantung pada pilar yang
// dipilih, jadi selalu dikirim dengan business_type_id.
export interface BusinessVertical {
  id: number
  code: string
  name: string
  description: string
  business_type_id: number
}

export const getBusinessVerticals = (businessTypeId: number) =>
  publicApi.get<ApiResponse<BusinessVertical[]>>(
    `/business-vertical?business_type_id=${businessTypeId}`,
  )

// Payment Methods
export const getPaymentMethods = (params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<PaymentMethod>>('/payment-method', { params })

// Roles
export const getRoles = () =>
  api.get<ApiResponse<Role[]>>('/role')

export const createRole = (data: { name: string }) =>
  api.post<ApiResponse<Role>>('/role', data)

export const updateRole = (id: number, data: { name: string }) =>
  api.patch<ApiResponse<Role>>(`/role/${id}`, data)

export const deleteRole = (id: number) =>
  api.delete(`/role/${id}`)

// Permissions
export interface Permission {
  id: number
  code: string
  name: string
  description: string
  module: string
}

export const getAllPermissions = () =>
  api.get<ApiResponse<Permission[]>>('/role/permissions/all')

export const getRolePermissions = (roleId: number) =>
  api.get<ApiResponse<number[]>>(`/role/${roleId}/permissions`)

export const updateRolePermissions = (roleId: number, permissionIds: number[]) =>
  api.put(`/role/${roleId}/permissions`, { permission_ids: permissionIds })

// Order Types
export const getOrderTypes = (params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<OrderType>>('/order-type', { params })

