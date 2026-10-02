import { useQuery } from '@tanstack/react-query'
import { getMyOutlets, getOutletsByBusiness } from '@/api/outlets'
import { useAuthStore } from '@/store/authStore'
import { isEmployeeToken } from '@/lib/jwt'
import type { Outlet } from '@/types'

const EMPTY: Outlet[] = []

/**
 * Daftar outlet bisnis, berbagi cache dengan pemilih outlet di sidebar —
 * kunci query-nya sama, jadi halaman lain tidak menambah permintaan.
 *
 * Karyawan memakai `/outlet/mine`: server sudah menyaringnya ke outlet tempat
 * ia bertugas, jadi pemilih outlet tidak menawarkan outlet yang pasti ditolak.
 * Pemilik tetap memakai daftar seluruh outlet bisnis seperti sebelumnya.
 */
export function useBusinessOutlets() {
  const businessId = useAuthStore(s => s.user?.business?.id)
  const isEmployee = useAuthStore(s => isEmployeeToken(s.user?.token))
  const query = useQuery({
    queryKey: ['outlets-selector', businessId, isEmployee ? 'mine' : 'business'],
    queryFn: () => isEmployee
      ? getMyOutlets()
      : getOutletsByBusiness(businessId!, { limit: 50, page: 1 }),
    enabled: !!businessId,
    staleTime: 60_000,
  })
  return { ...query, isEmployee, outlets: query.data?.data?.data ?? EMPTY }
}
