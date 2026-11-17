import api from '@/lib/axios'
import type { ApiResponse } from '@/types'

export interface OnboardingProgress {
  product_ready: boolean
  first_sale: boolean
  practice_completed: boolean
}

export const getOnboardingProgress = () =>
  api.get<ApiResponse<OnboardingProgress>>('/onboarding/progress').then((response) => response.data.data)

export const recordPractice = () => api.post('/onboarding/events', { kind: 'practice_completed' })
