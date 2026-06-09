import api from '@/lib/axios'
import type { ApiResponse, PricingSuggestion } from '@/types'

export const getAllPricingSuggestions = () =>
  api.get<ApiResponse<PricingSuggestion[]>>('/pricing/suggestions')

export const applyPricingSuggestion = (productId: string, newPrice: number) =>
  api.post<ApiResponse<{ product_id: string; new_sell_price: number; message: string }>>(
    `/pricing/product/${productId}/apply`,
    { new_price: newPrice }
  )
