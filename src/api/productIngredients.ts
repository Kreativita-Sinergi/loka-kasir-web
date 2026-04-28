import api from '@/lib/axios'
import type { ApiResponse, ProductBOM } from '@/types'

export interface IngredientItem {
  raw_material_id: string
  quantity: number
}

export const getProductBOM = (productId: string) =>
  api.get<ApiResponse<ProductBOM>>(`/product-bom/${productId}`)

export const syncProductBOM = (productId: string, ingredients: IngredientItem[]) =>
  api.put<ApiResponse<ProductBOM>>(`/product-bom/${productId}`, { ingredients })

export const clearProductBOM = (productId: string) =>
  api.delete<ApiResponse<null>>(`/product-bom/${productId}`)
