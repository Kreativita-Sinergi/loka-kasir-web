import api from '@/lib/axios'
import type { ApiResponse } from '@/types'

/** Kuota member gym usaha ini — lihat `GET /gym/member-quota` di service. */
export interface MemberQuota {
  active_members: number
  /** 0 = tanpa batas (tingkat Tanpa Batas atau masa trial). */
  limit: number
  tier: string | null
  tier_active_until: string | null
  trial: boolean
  over_limit: boolean
  grace_until: string | null
  block_new_members: boolean
}

export interface MemberQuotaOffer {
  plan: string
  yearly_plan: string
  limit: number
  monthly_price: number | null
  yearly_price: number | null
}

export interface MemberQuotaPage {
  quota: MemberQuota
  base_limit: number
  grace_days: number
  offers: MemberQuotaOffer[]
}

export const getMemberQuota = () => api.get<ApiResponse<MemberQuotaPage>>('/gym/member-quota')
