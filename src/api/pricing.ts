import api from '@/lib/axios'
import type { ApiResponse, PricingSuggestion } from '@/types'

export const getPricingSuggestion = (productId: string, margin?: number) =>
  api.get<ApiResponse<PricingSuggestion>>(`/pricing/product/${productId}`, {
    params: margin !== undefined ? { margin } : undefined,
  })

export const getAllPricingSuggestions = () =>
  api.get<ApiResponse<PricingSuggestion[]>>('/pricing/suggestions')

export const applyPricingSuggestion = (productId: string, newPrice: number) =>
  api.post<ApiResponse<{ product_id: string; new_sell_price: number; message: string }>>(
    `/pricing/product/${productId}/apply`,
    { new_price: newPrice }
  )
